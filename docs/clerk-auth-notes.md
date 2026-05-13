# Clerk Social Auth — What Works & What to Avoid

## Architecture

Social sign-in (Google, LinkedIn, Slack) is handled by Clerk for the OAuth
flow only. Clerk does NOT own our user database or JWT. After OAuth completes,
we exchange the Clerk session token for our own JWT via `POST /api/auth/clerk-exchange`.

Files involved:
- `client/src/components/ClerkSocialButtons.tsx` — the social buttons on login/signup
- `client/src/pages/ClerkCallback.tsx` — the OAuth landing page at `/auth/clerk-callback`
- `server/routes.ts` — the `/api/auth/clerk-exchange` endpoint
- `client/src/lib/auth.ts` — `loginWithClerk()` action on the auth store

## Environment Variables

| Variable | Dev (Replit preview) | Production (bidapp.sa) |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` |
| `CLERK_SECRET_KEY` | `sk_test_...` | `sk_live_...` |

**Critical rules:**
- `pk_live_` keys are locked to `bidapp.sa`. They will throw an error on any
  other domain (including Replit preview URLs). Always use `pk_test_` for dev.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` does nothing in this app (that's a
  Next.js convention). Only `VITE_CLERK_PUBLISHABLE_KEY` is read.
- Dev and deployment secrets are separate in Replit. Set both independently.
- After changing any env var, restart the workflow — Vite bakes them in at startup.

## Clerk Dashboard Settings (dev instance)

In Clerk dashboard → your dev app → **Paths**:

| Setting | Value |
|---|---|
| Fallback development host | your Replit preview URL |
| `<SignIn />` component path | Account Portal (default is fine — we don't use this component) |
| `<SignUp />` component path | Account Portal (default is fine) |
| After sign-out URL | leave default |

The "Component paths" (`<SignIn />`, `<SignUp />`) only matter if you render
Clerk's prebuilt `<SignIn />` / `<SignUp />` components. This app does NOT use
them — it has its own custom forms. Leave those settings at Account Portal defaults.

**Do not add custom Application Paths** (Home URL, Unauthorized sign in URL) —
our custom callback handles all navigation.

## How the OAuth Flow Works

```
User clicks "Continue with Google"
    │
    ├─ If Clerk already has a session (isSignedIn=true):
    │   └─ Navigate directly to /auth/clerk-callback
    │       (existing session gets exchanged, no round-trip needed)
    │
    └─ If no Clerk session:
        └─ authenticateWithRedirect({ strategy, redirectUrl: absolute callback URL })
            │
            Google OAuth
            │
            /auth/clerk-callback?__clerk_status=...
            │
            Clerk SDK auto-processes params → isSignedIn becomes true
            │
            POST /api/auth/clerk-exchange → our JWT
            │
            window.location.assign("/dashboard" or "/onboarding")
```

## What NOT to Do

### 1. Don't call `signOut()` before `authenticateWithRedirect`
Calling `signOut()` then immediately starting OAuth puts Clerk in a "transfer"
state. Without `handleRedirectCallback`, this causes Clerk to redirect to its
Account Portal (`hopeful-cougar-19.accounts.dev/sign-in`) instead of your app.

### 2. Don't use relative paths in `authenticateWithRedirect`
```js
// WRONG — Clerk doesn't know which domain to redirect back to
signIn.authenticateWithRedirect({ redirectUrl: "/auth/clerk-callback" })

// CORRECT — use absolute URL
signIn.authenticateWithRedirect({ redirectUrl: window.location.origin + "/auth/clerk-callback" })
```

### 3. Don't call `handleRedirectCallback` with external after-URLs
`handleRedirectCallback` with `afterSignInUrl` pointing anywhere other than the
current page can trigger a redirect to Clerk's Account Portal if the dashboard's
`<SignIn />` path is still set to Account Portal. It's safer to omit
`handleRedirectCallback` entirely — Clerk v5 auto-processes OAuth params on load.

### 4. Don't mix test and live keys
`pk_test_` + `sk_live_` or `pk_live_` + `sk_test_` will cause cryptographic
verification failures. Always use matching pairs.

### 5. Don't use `pk_live_` on non-production domains
Live keys reject requests from any domain other than `bidapp.sa`. The error in
the browser console will be:
> "Production Keys are only allowed for domain bidapp.sa"

## Production Deployment Checklist

1. Set `VITE_CLERK_PUBLISHABLE_KEY=pk_live_...` in Deployment secrets
2. Set `CLERK_SECRET_KEY=sk_live_...` in Deployment secrets
3. In Clerk dashboard → **Production instance** → configure Google/LinkedIn/Slack
   OAuth with your own credentials (Client ID + Secret from each provider)
4. In Clerk dashboard → Production instance → Allowed redirect URLs: add
   `https://bidapp.sa/*`
5. In Google Cloud Console → OAuth consent screen: add
   `https://bidapp.sa` as an authorized domain and
   `https://clerk.bidapp.sa` as an authorized JavaScript origin
