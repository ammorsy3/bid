// The caller's IP. On Vercel every request arrives through the platform proxy,
// so the socket address is the proxy's, not the visitor's — x-forwarded-for is
// the only honest source. The left-most entry is the original client.
export function clientIp(req: any): string | undefined {
  const fwd = req.headers?.["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || undefined;
}
