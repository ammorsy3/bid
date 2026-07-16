import { createServer } from "http";
import { createApp } from "./app";
import { setupVite, serveStatic, log } from "./vite";

process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

/**
 * Long-running entry point: local development and any host that runs a real
 * process. On Vercel the app is served by api/index.ts instead, which never
 * calls listen.
 */
(async () => {
  const app = await createApp();
  const server = createServer(app);

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const basePort = parseInt(process.env.PORT || "5000", 10);

  // Try the preferred port first; if it's taken, roll forward to the next one.
  // A fixed PORT env var pins the port (only that one is attempted).
  const portPinned = Boolean(process.env.PORT);

  const startListen = (port: number, attemptsLeft: number): Promise<void> =>
    new Promise((resolve, reject) => {
      const onError = (err: any) => {
        server.removeListener("listening", onListening);
        if (err.code === "EADDRINUSE" && !portPinned && attemptsLeft > 0) {
          log(`port ${port} in use, trying ${port + 1}...`);
          resolve(startListen(port + 1, attemptsLeft - 1));
        } else {
          if (err.code === "EADDRINUSE") {
            log(
              `port ${port} is in use — find and kill the holder with: lsof -i :${port}  or  fuser -k ${port}/tcp`,
            );
          }
          reject(err);
        }
      };
      const onListening = () => {
        server.removeListener("error", onError);
        log(`serving on port ${port}`);
        resolve();
      };
      server.once("error", onError);
      server.once("listening", onListening);
      server.listen({ port, host: "0.0.0.0" });
    });

  await startListen(basePort, 40);
})();
