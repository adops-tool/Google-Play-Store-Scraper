import { z } from "zod";

export const scrapeRequestSchema = z.object({
  url: z.string().url(),
});

export type ScrapeRequest = z.infer<typeof scrapeRequestSchema>;

export const scrapedAppSchema = z.object({
  originalUrl: z.string(),
  studioName: z.string().nullable(),
  gameTitle: z.string().nullable(),
  supportEmail: z.string().nullable(),
  developerEmail: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  downloadCount: z.string().nullable(),
});

export type ScrapedApp = z.infer<typeof scrapedAppSchema>;
