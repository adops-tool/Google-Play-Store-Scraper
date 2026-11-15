import type { Express, Request, Response } from "express";
import type { Server } from "http";
import rateLimit from "express-rate-limit";
import { api } from "@shared/routes";
import { scrapedAppSchema } from "@shared/schema";
import { scrapePlayStore, ScrapeError } from "./lib/scraper";
import { retryWithBackoff } from "./lib/retry";
import { logger } from "./lib/logger";

const SCOPE = "scrape";

/**
 * Scraping spawns an outbound request per call, so the endpoint is capped to
 * keep the server (and the Play Store) from being hammered through batch jobs.
 */
const scrapeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many requests, please slow down and try again later" },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.post(api.scrape.path, scrapeLimiter, async (req: Request, res: Response) => {
    const parsed = api.scrape.input.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request";
      return res.status(400).json({ message });
    }

    const { url } = parsed.data;
    const startedAt = Date.now();
    logger.info(SCOPE, `scrape started: ${url}`);

    try {
      const scraped = await retryWithBackoff(() => scrapePlayStore(url), {
        retries: 2,
        baseDelayMs: 1_000,
        shouldRetry: (error) => error instanceof ScrapeError && error.retryable,
        scope: SCOPE,
      });

      const payload = scrapedAppSchema.parse(scraped);

      logger.info(SCOPE, `scrape completed in ${Date.now() - startedAt}ms: ${url}`);
      return res.status(200).json(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to scrape data";
      logger.error(SCOPE, `scrape failed in ${Date.now() - startedAt}ms for ${url}: ${message}`);

      // Upstream/fetch problems are reported as 502; anything else is a bug.
      const status = error instanceof ScrapeError ? 502 : 500;
      return res.status(status).json({ message: "Failed to scrape data" });
    }
  });

  return httpServer;
}
