type LogLevel = "info" | "warn" | "error";

function write(level: LogLevel, scope: string, message: string, meta?: unknown) {
  const timestamp = new Date().toISOString();
  const line = `${timestamp} [${scope}] ${message}`;

  if (meta === undefined) {
    console[level](line);
    return;
  }

  console[level](line, meta);
}

/**
 * Minimal scoped logger. Keeps every line ISO-timestamped and prefixed with a
 * component name so log aggregators can filter without extra parsing.
 */
export const logger = {
  info: (scope: string, message: string, meta?: unknown) => write("info", scope, message, meta),
  warn: (scope: string, message: string, meta?: unknown) => write("warn", scope, message, meta),
  error: (scope: string, message: string, meta?: unknown) => write("error", scope, message, meta),
};
