// Decides what an authentication middleware answers when something throws.
//
// Only a token that fails verification (bad signature, expired, malformed) is
// the caller's fault: that is a 403 "Invalid token", and the browser rightly
// signs the user out. Anything else thrown while checking the token — most
// often the database being briefly unreachable when the user row is loaded —
// is the server's fault and must be a 5xx, otherwise a short outage is read by
// the client as "your session is invalid" and logs everyone out.

import type { Response } from "express";
import jwt from "jsonwebtoken";

export function isTokenVerificationError(error: unknown): boolean {
  return (
    error instanceof jwt.JsonWebTokenError || // also the base of TokenExpiredError / NotBeforeError
    error instanceof jwt.TokenExpiredError ||
    error instanceof jwt.NotBeforeError
  );
}

export function respondToAuthError(res: Response, error: unknown): Response {
  if (isTokenVerificationError(error)) {
    return res.status(403).json({ message: "Invalid token" });
  }
  console.error("[Auth] Could not verify the session (server-side failure):", error);
  return res
    .status(503)
    .json({ message: "Service temporarily unavailable. Please try again." });
}
