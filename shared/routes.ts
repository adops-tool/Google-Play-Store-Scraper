import { z } from "zod";
import { scrapedAppSchema, scrapeRequestSchema } from "./schema";

export const api = {
  scrape: {
    method: "POST" as const,
    path: "/api/scrape",
    input: scrapeRequestSchema,
    responses: {
      200: scrapedAppSchema,
      400: z.object({ message: z.string() }),
      500: z.object({ message: z.string() }),
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
