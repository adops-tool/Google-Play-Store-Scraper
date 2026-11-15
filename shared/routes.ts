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
      429: z.object({ message: z.string() }),
      502: z.object({ message: z.string() }),
    },
  },
} as const;
