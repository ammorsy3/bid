// Automatically picks the right Clerk publishable key:
// - In dev (Vite dev server): uses VITE_CLERK_PUBLISHABLE_KEY (pk_test_...)
// - In production build:      uses VITE_CLERK_PUBLISHABLE_KEY_PROD (pk_live_...)
//
// Store both in Replit Secrets and never touch them again.
export const CLERK_KEY = import.meta.env.PROD
  ? import.meta.env.VITE_CLERK_PUBLISHABLE_KEY_PROD
  : import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export const HAS_CLERK = !!CLERK_KEY;
