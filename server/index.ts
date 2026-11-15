import express, { type Request, type Response, type NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { logger } from "./lib/logger";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const app = express();
const httpServer = createServer(app);

app.disable("x-powered-by");
// Trust the first proxy hop so req.ip and secure cookies behave behind
// a TLS-terminating load balancer (Render, Replit, nginx, ...).
app.set("trust proxy", 1);

app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: false, limit: "32kb" }));

// Baseline security headers for every response. The CSP is only enforced in
// production — the Vite dev server needs inline scripts and an HMR websocket.
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (IS_PRODUCTION) {
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
      ].join("; "),
    );
  }
  next();
});

const MAX_LOGGED_BODY_CHARS = 200;

// Access log for API traffic. Response bodies are truncated so a large scrape
// payload cannot flood the logs.
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  let capturedJsonResponse: Record<string, unknown> | undefined;
  const originalResJson = res.json.bind(res);
  res.json = ((bodyJson: unknown) => {
    capturedJsonResponse = bodyJson as Record<string, unknown>;
    return originalResJson(bodyJson);
  }) as typeof res.json;

  res.on("finish", () => {
    if (!path.startsWith("/api")) return;

    const duration = Date.now() - start;
    let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
    if (capturedJsonResponse) {
      const serialized = JSON.stringify(capturedJsonResponse);
      const truncated =
        serialized.length > MAX_LOGGED_BODY_CHARS
          ? `${serialized.slice(0, MAX_LOGGED_BODY_CHARS)}…`
          : serialized;
      logLine += ` :: ${truncated}`;
    }

    logger.info("http", logLine);
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  // Unknown API paths must not fall through to the SPA shell.
  app.use("/api", (_req: Request, res: Response) => {
    res.status(404).json({ message: "Not found" });
  });

  app.use((err: Error & { status?: number; statusCode?: number; type?: string }, _req: Request, res: Response, _next: NextFunction) => {
    const isBodyParseError = err.type === "entity.parse.failed" || err.type === "entity.too.large";
    const status = isBodyParseError ? (err.status ?? 400) : err.status ?? err.statusCode ?? 500;

    if (status >= 500) {
      logger.error("http", err.message, err);
    }

    res.status(status).json({
      message: status >= 500 ? "Internal Server Error" : err.message,
    });
    // NOTE: intentionally not rethrown — the response is already sent and
    // crashing the worker helps nobody.
  });

  // Vite is only attached in development, after the API routes and the error
  // handler so it cannot swallow them.
  if (IS_PRODUCTION) {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const parsedPort = Number(process.env.PORT ?? 5000);
  const port = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535 ? parsedPort : 5000;

  httpServer.listen(port, "0.0.0.0", () => {
    logger.info("express", `serving on port ${port}`);
  });

  const shutdown = (signal: string) => {
    logger.info("express", `${signal} received, shutting down`);
    httpServer.close(() => process.exit(0));
    // Force-exit if connections do not drain in time.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})().catch((error) => {
  logger.error("express", "fatal error during startup", error);
  process.exit(1);
});
