// The Clerk publishable key comes from the environment, not from the build mode.
//
// It used to be chosen by `import.meta.env.PROD`, so any production build took
// the pk_live key. But a Clerk production instance is locked to the domain it was
// issued for (clerk.bidapp.sa), so a production build served from anywhere else —
// a Vercel preview URL, a staging host — loads a key Clerk refuses for that
// origin, and sign-in fails with nothing obviously wrong in the app.
//
// Which Clerk instance to talk to is a property of *where the app is deployed*,
// not of how it was compiled. So the deployment supplies it:
//
//   local .env         VITE_CLERK_PUBLISHABLE_KEY=pk_test_…   (dev, any origin)
//   Vercel preview     VITE_CLERK_PUBLISHABLE_KEY=pk_test_…   (dev, any origin)
//   Vercel production  VITE_CLERK_PUBLISHABLE_KEY=pk_live_…   (bidapp.sa only)
//
// VITE_CLERK_PUBLISHABLE_KEY_PROD is still honoured as a fallback so an existing
// deployment that only sets that one keeps working.
export const CLERK_KEY: string | undefined =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY_PROD;

export const HAS_CLERK = !!CLERK_KEY;
