import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import {
  securityHeaders,
  sanitizeRequestBody,
  validateEnvironment,
} from "./security";

// Validate required environment variables at startup
validateEnvironment();

const app = express();

// Apply security headers first (OWASP recommendation)
// Helmet adds various HTTP headers for security
app.use(securityHeaders);

// Trust proxy for accurate IP detection behind reverse proxies
app.set("trust proxy", 1);

// Parse JSON with size limit (1MB max) to prevent DoS
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// Sanitize all incoming request bodies to prevent injection attacks
app.use(sanitizeRequestBody);

// Note: Rate limiting is applied in routes.ts AFTER session/passport middleware
// so that user-based rate limiting can properly identify authenticated users

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const { startSyncScheduler } = await import("./netsuite/index");
  startSyncScheduler();

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: process.env.HOST || "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
})();
