import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);

  // Exit immediately on SIGTERM/SIGINT so the port is released before
  // Replit starts the next server instance.
  process.on("SIGTERM", () => process.exit(0));
  process.on("SIGINT", () => process.exit(0));

  // Retry rapidly (100 ms gaps) to catch the brief window when pid2
  // releases port 5000 during process handoff. Fall back to 1-second
  // retries if the fast window is missed.
  const startListen = (retriesLeft: number, delay = 100): Promise<void> =>
    new Promise((resolve, reject) => {
      const onError = async (err: any) => {
        server.removeAllListeners("error");
        if (err.code === "EADDRINUSE" && retriesLeft > 0) {
          await new Promise((r) => setTimeout(r, delay));
          const nextDelay = retriesLeft > 200 ? 100 : 1000;
          resolve(startListen(retriesLeft - 1, nextDelay));
        } else {
          reject(err);
        }
      };
      server.once("error", onError);
      server.listen({ port, host: "0.0.0.0" }, () => {
        server.removeListener("error", onError);
        log(`serving on port ${port}`);
        resolve();
      });
    });

  // 300 fast retries (100ms each = 30s) then fail
  await startListen(300);
})();
