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

  const port = parseInt(process.env.PORT || "5000", 10);

  const startListen = (retriesLeft: number, delay = 250): Promise<void> =>
    new Promise((resolve, reject) => {
      const onError = (err: any) => {
        server.removeListener("listening", onListening);
        if (err.code === "EADDRINUSE" && retriesLeft > 0) {
          setTimeout(() => resolve(startListen(retriesLeft - 1, delay)), delay);
        } else {
          if (err.code === "EADDRINUSE") {
            log(
              `port ${port} is still in use after retries — find and kill the holder with: lsof -i :${port}  or  fuser -k ${port}/tcp`,
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

  await startListen(40);
})();
