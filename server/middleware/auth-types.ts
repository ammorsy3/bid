// Shared auth types so both the JWT middleware (in routes.ts) and the new
// API-key middleware can attach the same shape to req.auth. Adding the
// api-key-specific fields as optional keeps every existing JWT handler working
// unchanged.

import type { Request } from "express";

export interface JWTPayload {
  userId: string;
  activeCompanyId: string | null;
  roleInCompany: string | null;
  isAdmin: boolean;
}

export interface AuthContext {
  userId: string;
  activeCompanyId: string | null;
  roleInCompany: string | null;
  isAdmin: boolean;
  /** How this request was authenticated. Defaults to 'jwt' when omitted. */
  authMethod?: "jwt" | "api_key";
  /** Present for api-key requests — the id of the calling key. */
  apiKeyId?: string;
  /** Present for api-key requests — the scopes granted to the calling key. */
  scopes?: string[];
}

export interface AuthRequest extends Request {
  auth?: AuthContext;
}
