import type { Express } from "express";
import type { Server } from "http";
import { api } from "@shared/routes";
import * as cheerio from "cheerio";

// Retry helper with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  initialDelayMs: number = 500,
  taskName: string = "Task"
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        const delayMs = initialDelayMs * Math.pow(2, attempt);
        console.log(`[RETRY] ${taskName} attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error(`${taskName} failed after ${maxRetries + 1} attempts`);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post(api.scrape.path, async (req, res) => {
    try {
      const { url } = api.scrape.input.parse(req.body);
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] Starting scrape for: ${url}`);

      // Retry scraping with exponential backoff for reliability with large batches
      const result = await retryWithBackoff(
        async () => {
          // 60 second timeout for Google Play Store page (can be slow)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000);

          try {
            const response = await fetch(url, {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
              },
              signal: controller.signal,
            });

            if (!response.ok) {
              throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
            }

            const html = await response.text();
            const $ = cheerio.load(html);

            // Game Title
            const gameTitle = $("h1 span").text() || "Unknown";

            // Studio Name
            let studioName = $(".Vbfug.auoIOc").text() || "Unknown";
            if (studioName === "Unknown") {
              studioName = $("div.Vbfug a span").first().text() || "Unknown";
            }

            // Support email and website
            let supportEmail = "";
            let developerEmail = "";
            let websiteUrl = "";
            const potentialWebsites: string[] = [];

            // Extract developer email specifically from the class HhKIQc as requested
            const contactSection = $(".HhKIQc");
            if (contactSection.length > 0) {
              const info = contactSection.text().trim();
              const emailMatch = info.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
              if (emailMatch) {
                developerEmail = emailMatch[0];
              }
            }

            // No fallbacks - if not found in HhKIQc, it remains empty (Not found)

            $("a").each((_, el) => {
              const href = $(el).attr("href");
              if (!href) return;

              if (href.startsWith("mailto:")) {
                const email = href.replace("mailto:", "");
                if (!supportEmail) {
                  supportEmail = email;
                }
              }

              if (
                (href.startsWith("http://") || href.startsWith("https://")) &&
                !href.includes("play.google.com") &&
                !href.includes("accounts.google.com") &&
                !href.includes("policies.google.com")
              ) {
                const text = $(el).text().trim().toLowerCase();
                if (
                  (text === "website" ||
                    text === "visit website" ||
                    text.includes("website")) &&
                  !websiteUrl
                ) {
                  websiteUrl = href;
                } else if (!websiteUrl) {
                  potentialWebsites.push(href);
                }
              }
            });

            if (!websiteUrl && potentialWebsites.length > 0) {
              websiteUrl = potentialWebsites[0];
            }

            if (!supportEmail) {
              const mailMatch = html.match(
                /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/
              );
              if (mailMatch) {
                supportEmail = mailMatch[0];
              }
            }

            // Extract download count from Play Store (format: 1M+, 10K+, 500M+, etc.)
            let downloadCount = "Unknown";

            const jsonDataMatch = html.match(/"downloadCount":"([^"]+)"/);
            if (jsonDataMatch) {
              downloadCount = jsonDataMatch[1];
            } else {
              const patterns = [
                /(\d{1,3}[.,]?\d*[KMBT]\+)/,
                />([\d.,]+[KMB]\+)</,
                /[\s>](1\d*[KMBT]\+)/,
                /([\d.,]+[KMB])\+/,
              ];

              for (const pattern of patterns) {
                const match = html.match(pattern);
                if (match && match[1] && match[1] !== "0K+") {
                  downloadCount = match[1];
                  break;
                }
              }
            }

            return {
              originalUrl: url,
              studioName: studioName,
              gameTitle: gameTitle,
              supportEmail: supportEmail || null,
              developerEmail: developerEmail || null,
              websiteUrl: websiteUrl || null,
              downloadCount: downloadCount,
            };
          } finally {
            clearTimeout(timeoutId);
          }
        },
        2,
        1000,
        `Scrape ${url}`
      );

      console.log(`[${timestamp}] Completed scrape for: ${url}`);
      res.json(result);
    } catch (err) {
      console.error(`[ERROR] Scraping failed:`, err);
      res.status(500).json({ message: "Failed to scrape data" });
    }
  });

  return httpServer;
}
