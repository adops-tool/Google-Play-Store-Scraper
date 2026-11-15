import { z } from "zod";

const PLAY_STORE_HOSTNAMES = new Set(["play.google.com"]);

function isPlayStoreHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    PLAY_STORE_HOSTNAMES.has(normalized) ||
    normalized.endsWith(".play.google.com")
  );
}

export const scrapeRequestSchema = z.object({
  url: z
    .string({ required_error: "A url value is required" })
    .trim()
    .max(2048, "URL is too long")
    .url("A valid URL is required")
    .refine(
      (value) => {
        try {
          const parsed = new URL(value);
          return (
            (parsed.protocol === "https:" || parsed.protocol === "http:") &&
            isPlayStoreHostname(parsed.hostname)
          );
        } catch {
          return false;
        }
      },
      { message: "Only Google Play Store URLs (play.google.com) are supported" },
    ),
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
