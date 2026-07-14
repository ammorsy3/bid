import "dotenv/config";
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { registerRoutes } from "./routes";
// Must NOT come from ./vite: that module imports the `vite` package and
// vite.config at load time, neither of which exists in a serverless runtime.
import { log } from "./log";

/**
 * Builds the Express app with routes and middleware, but does not listen.
 *
 * Kept separate from index.ts so the same app can be served two ways: as a
 * long-running process locally (index.ts calls listen), and as a serverless
 * function on Vercel (api/index.ts wraps it as a handler). A serverless runtime
 * never calls listen — it hands each request straight to the app.
 */
export async function createApp(): Promise<Express> {
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

  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    // Serverless: throwing here would take down the whole function instance for
    // subsequent requests, so the error is logged rather than rethrown.
    console.error(err);
  });

  return app;
}
