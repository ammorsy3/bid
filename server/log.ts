/**
 * Request logging, deliberately free of any Vite import.
 *
 * This used to live in server/vite.ts, which imports the `vite` package and
 * vite.config at module load. Vite is a devDependency and is not installed in a
 * serverless runtime, so anything importing it — even just for this one
 * function — crashes the function on boot, before it can serve a request. The
 * whole API returned FUNCTION_INVOCATION_FAILED because of this single import.
 */
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}
