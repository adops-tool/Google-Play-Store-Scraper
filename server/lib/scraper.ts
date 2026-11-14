import * as cheerio from "cheerio";
import type { ScrapedApp } from "@shared/schema";

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_HTML_BYTES = 8 * 1024 * 1024;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * Hosts that belong to Google itself and therefore never qualify as the
 * developer's external website. Matched on hostname, never on raw substring,
 * so `play.google.com.evil.example` does not slip through nor get swallowed.
 */
const BLOCKED_OUTBOUND_HOSTS = [
  "play.google.com",
  "accounts.google.com",
  "policies.google.com",
  "support.google.com",
  "developers.google.com",
];

const EMAIL_PATTERN = /[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+/;

export class ScrapeError extends Error {
  /**
   * Retryable errors are transient (network resets, timeouts, 429 and 5xx
   * responses). Everything else is a permanent failure that retrying will not fix.
   */
  constructor(
    message: string,
    readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "ScrapeError";
  }
}

function isBlockedOutboundHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return BLOCKED_OUTBOUND_HOSTS.some(
    (blocked) => normalized === blocked || normalized.endsWith(`.${blocked}`),
  );
}

function parseHttpUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * Fetches a Play Store page, enforcing a hard timeout and an upper bound on
 * the body size so a hostile or broken upstream cannot exhaust memory.
 *
 * The final (post-redirect) host is validated as well: without this check an
 * open redirect on the allowed origin could be used to pull arbitrary internal
 * URLs through the scraper.
 */
export async function fetchPlayStorePage(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: controller.signal,
        redirect: "follow",
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new ScrapeError("Play Store request timed out", true);
      }
      const reason = error instanceof Error ? error.message : String(error);
      throw new ScrapeError(`Failed to fetch URL: ${reason}`, true);
    }

    const finalHost = (() => {
      try {
        return new URL(response.url || url).hostname.toLowerCase();
      } catch {
        return "";
      }
    })();

    if (
      finalHost !== "play.google.com" &&
      !finalHost.endsWith(".play.google.com")
    ) {
      throw new ScrapeError("Refusing to follow redirect away from play.google.com");
    }

    if (!response.ok) {
      const retryable =
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500;
      throw new ScrapeError(
        `Failed to fetch URL: ${response.status} ${response.statusText}`,
        retryable,
      );
    }

    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_HTML_BYTES) {
      throw new ScrapeError("Play Store page exceeded the maximum allowed size");
    }

    const html = await response.text();
    if (html.length > MAX_HTML_BYTES) {
      throw new ScrapeError("Play Store page exceeded the maximum allowed size");
    }

    return html;
  } finally {
    clearTimeout(timeout);
  }
}

function extractDeveloperEmail($: cheerio.CheerioAPI): string | null {
  const contactSection = $(".HhKIQc");
  if (contactSection.length === 0) {
    return null;
  }

  const match = contactSection.text().match(EMAIL_PATTERN);
  return match ? match[0] : null;
}

function extractLinks($: cheerio.CheerioAPI) {
  let supportEmail = "";
  let websiteUrl = "";
  const potentialWebsites: string[] = [];

  $("a").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;

    if (href.startsWith("mailto:")) {
      const email = href.slice("mailto:".length).split("?")[0].trim();
      if (!supportEmail && EMAIL_PATTERN.test(email)) {
        supportEmail = email;
      }
      return;
    }

    const parsed = parseHttpUrl(href);
    if (!parsed || isBlockedOutboundHost(parsed.hostname)) return;

    const destination = parsed.toString();
    const text = $(element).text().trim().toLowerCase();

    if (text.includes("website") && !websiteUrl) {
      websiteUrl = destination;
      return;
    }

    if (!potentialWebsites.includes(destination)) {
      potentialWebsites.push(destination);
    }
  });

  if (!websiteUrl && potentialWebsites.length > 0) {
    websiteUrl = potentialWebsites[0];
  }

  return { supportEmail, websiteUrl };
}

function extractSupportEmailFallback(html: string, current: string): string {
  if (current) return current;

  const match = html.match(EMAIL_PATTERN);
  return match ? match[0] : "";
}

/**
 * Google embeds the exact download figure in an inline AF_initDataCallback
 * payload (e.g. `"downloadCount":"1,000,000,000+"`). The visible markup only
 * carries the abbreviated "1B+"-style badge, so the embedded value is the
 * most reliable source; the regex sweep is a fallback for page-layout drift.
 */
function extractDownloadCount(html: string): string {
  const embedded = html.match(/"downloadCount":"([^"]+)"/);
  if (embedded) {
    return embedded[1];
  }

  const patterns = [
    /(\d{1,3}[.,]?\d*[KMBT]\+)/,
    />([\d.,]+[KMB]\+)</,
    /[\s>](1\d*[KMBT]\+)/,
    /([\d.,]+[KMB])\+/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1] && match[1] !== "0K+") {
      return match[1];
    }
  }

  return "Unknown";
}

/** Parses a Play Store listing page into the shared ScrapedApp contract. */
export function parsePlayStorePage(html: string, originalUrl: string): ScrapedApp {
  const $ = cheerio.load(html);

  const gameTitle = $("h1").first().text().trim() || "Unknown";

  let studioName = $(".Vbfug.auoIOc").first().text().trim();
  if (!studioName) {
    studioName = $("div.Vbfug a span").first().text().trim();
  }
  if (!studioName) {
    studioName = "Unknown";
  }

  const developerEmail = extractDeveloperEmail($);
  const { supportEmail: rawSupportEmail, websiteUrl } = extractLinks($);
  const supportEmail = extractSupportEmailFallback(html, rawSupportEmail);

  return {
    originalUrl,
    studioName,
    gameTitle,
    supportEmail: supportEmail || null,
    developerEmail,
    websiteUrl: websiteUrl || null,
    downloadCount: extractDownloadCount(html),
  };
}

/** Fetches and parses a Play Store listing. Throws ScrapeError on failure. */
export async function scrapePlayStore(url: string): Promise<ScrapedApp> {
  const html = await fetchPlayStorePage(url);
  return parsePlayStorePage(html, url);
}
