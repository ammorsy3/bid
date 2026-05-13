# Clerk Social Auth — What Works & What to Avoid

This file documents every bug we hit integrating Clerk social sign-in (Google /
LinkedIn / Slack) into the Bid app, and the exact code patterns that fixed them.
Read this before touching anything in `ClerkSocialButtons.tsx`, `ClerkCallback.tsx`,
or the logout flow.

---

## Architecture Overview

Social sign-in uses Clerk for the OAuth round-trip only. Clerk does NOT own our
user database or session JWT. After OAuth completes, we exchange the Clerk token
for our own JWT via `POST /api/auth/clerk-exchange`.

Key files:
- `client/src/components/ClerkSocialButtons.tsx` — social buttons on login/signup
- `client/src/pages/ClerkCallback.tsx` — OAuth landing page at `/auth/clerk-callback`
- `client/src/hooks/use-logout.ts` — shared logout hook (app + Clerk)
- `server/routes.ts` — `/api/auth/clerk-exchange` endpoint
- `client/src/lib/auth.ts` — `loginWithClerk()` action on the auth store

---

## Environment Variables

| Variable | Dev (Replit preview) | Production (bidapp.sa) |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` |
| `CLERK_SECRET_KEY` | `sk_test_...` | `sk_live_...` |

**Rules:**
- `pk_live_` keys only work on `bidapp.sa`. They throw an error on Replit preview
  URLs. Always use `pk_test_` for dev.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` does nothing here — that's a Next.js
  convention. Only `VITE_CLERK_PUBLISHABLE_KEY` is read by Vite.
- Dev secrets and deployment secrets are separate panels in Replit. Set both
  independently.
- After changing any env var, restart the workflow. Vite bakes them in at startup;
  a hot reload alone won't pick them up.

---

## Clerk Dashboard Settings

In Clerk dashboard → your dev instance → **Paths**:

- **Fallback development host**: your Replit preview URL
- **`<SignIn />` component path**: leave on Account Portal (default)
- **`<SignUp />` component path**: leave on Account Portal (default)
- **Home URL / Unauthorized sign-in URL**: leave blank

The Component paths only matter if you render Clerk's prebuilt `<SignIn />` /
`<SignUp />` React components. This app does NOT use them — it has its own custom
forms. Do not change these settings; changing them to "development host" causes
`handleRedirectCallback` to redirect to Account Portal unexpectedly.

---

## How the OAuth Flow Works (current working state)

```
User clicks "Continue with Google"
    │
    ├─ If Clerk already has a session (isSignedIn=true):
    │   └─ signOut() → wait 500ms → authenticateWithRedirect()
    │       (ensures a fresh OAuth so user can pick a different account)
    │
    └─ If no Clerk session:
        └─ authenticateWithRedirect({ strategy, redirectUrl: absolute callback URL })
            │
            Google / LinkedIn / Slack OAuth
            │
            /auth/clerk-callback?__clerk_status=...
            │
            Clerk SDK auto-processes OAuth params → isSignedIn becomes true
            │
            POST /api/auth/clerk-exchange → our JWT + user + company
            │
            localStorage.setItem("token", ...) + localStorage.setItem("auth-storage", ...)
            │
            window.location.assign("/dashboard" or "/onboarding")
```

---

## Bug Log — Every Issue We Hit and How We Fixed It

### Bug 1: Button does nothing (pk_live_ on wrong domain)

**Symptom:** Clicking "Continue with Google" does nothing. No spinner, no redirect.

**Cause:** `VITE_CLERK_PUBLISHABLE_KEY` was set to `pk_live_...` but the app was
running on a Replit preview URL, not `bidapp.sa`. Console error:
> "Production Keys are only allowed for domain bidapp.sa"

**Fix:** Use `pk_test_...` / `sk_test_...` for dev. Use `pk_live_...` / `sk_live_...`
only in the deployed production environment on `bidapp.sa`.

---

### Bug 2: OAuth redirects to `hopeful-cougar-19.accounts.dev/sign-in`

**Symptom:** Clicking Google opens OAuth, completes, but then lands on Clerk's
hosted Account Portal instead of your app.

**Cause A:** `redirectUrl` in `authenticateWithRedirect` was a relative path.
Clerk didn't know which domain to return to, so it fell back to Account Portal.

**Fix A:** Always use an absolute URL:
```ts
// WRONG
signIn.authenticateWithRedirect({ redirectUrl: "/auth/clerk-callback" })

// CORRECT
const callbackUrl = window.location.origin + "/auth/clerk-callback";
signIn.authenticateWithRedirect({ redirectUrl: callbackUrl, redirectUrlComplete: callbackUrl })
```

**Cause B:** `handleRedirectCallback` was called in `ClerkCallback.tsx` with
`afterSignInUrl` / `afterSignUpUrl` options. Even with those set to our callback
path, Clerk overrode them using the dashboard's `<SignIn />` Component path
(Account Portal). Relative paths in those options were silently ignored.

**Fix B:** Do NOT call `handleRedirectCallback` at all. Clerk v5 auto-processes
the OAuth redirect params when the SDK loads on the callback URL. Just wait for
`isSignedIn` to become `true`.

```ts
// WRONG — causes redirect to Account Portal
handleRedirectCallback({
  afterSignInUrl: "/auth/clerk-callback",
  afterSignUpUrl: "/auth/clerk-callback",
});

// CORRECT — don't call it at all; Clerk handles it automatically
```

---

### Bug 3: First click fails, second click works

**Symptom:** First click on Google shows a brief spinner, then returns to login.
Second click works fine.

**Cause:** A stale Clerk session existed from a previous sign-in. The button was
calling `signOut()` then immediately doing OAuth. During the OAuth, Clerk entered
a "transfer" state (old session cleared, new OAuth pending). Without
`handleRedirectCallback`, Clerk redirected to Account Portal to resolve the
transfer. With `handleRedirectCallback`, it also bounced to Account Portal.

The second click worked because Clerk already had a valid session from the first
OAuth (which completed on Clerk's side even though our callback failed).

**Fix:** When `isSignedIn` is true (stale session), call `signOut()`, wait 500ms,
then do OAuth. The 500ms pause gives Clerk time to fully clear the session cookie
before the new OAuth flow starts. Without the pause, Clerk may silently reuse the
old account.

```ts
if (isSignedIn) {
  await signOut();
  await new Promise((r) => setTimeout(r, 500));
}
const callbackUrl = window.location.origin + redirectPath;
await signIn.authenticateWithRedirect({ strategy, redirectUrl: callbackUrl, redirectUrlComplete: callbackUrl });
```

---

### Bug 4: After sign-out, Google button re-logs in with the same account

**Symptom:** Sign out of the app → click "Continue with Google" → automatically
signs back in as the same Google account without showing the picker.

**Cause:** The app's `logout()` function only cleared the app's JWT and Zustand
state. It did NOT sign out of Clerk. So Clerk still had an active session for the
previous Google account. On the next click, `isSignedIn` was true, the button
skipped OAuth and went straight to the callback, reusing the same account.

**Fix:** Always sign out of Clerk when signing out of the app. Use the shared
`useLogout` hook everywhere — never call `logout()` from `useAuthStore` directly
in components.

```ts
// client/src/hooks/use-logout.ts
export function useLogout() {
  const { logout } = useAuthStore();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();

  return async (redirectTo = "/login") => {
    logout();                          // clears app JWT + Zustand
    if (HAS_CLERK) await signOut();    // clears Clerk session
    setLocation(redirectTo);
  };
}
```

Use it like this in every component:
```ts
const doLogout = useLogout();
const handleLogout = () => doLogout("/login");
```

Components that call logout: `navbar.tsx`, `Dashboard.tsx`, `AdminLayout.tsx`.
Do not add `logout` from `useAuthStore` directly to component destructuring.

---

## What NOT to Do — Summary

| Don't | Do instead |
|---|---|
| Use `pk_live_` in dev/Replit preview | Use `pk_test_` for dev, `pk_live_` only in deployment |
| Use `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Use `VITE_CLERK_PUBLISHABLE_KEY` |
| Relative `redirectUrl` in `authenticateWithRedirect` | `window.location.origin + "/auth/clerk-callback"` |
| Call `handleRedirectCallback` | Don't — Clerk auto-processes in v5 |
| Call `signOut()` without a wait before OAuth | `await signOut(); await sleep(500);` |
| Call `logout()` from `useAuthStore` in components | Use `useLogout()` hook instead |
| Change Clerk dashboard Component paths from Account Portal | Leave them at defaults |
| Mix `pk_test_` with `sk_live_` or vice versa | Always use matching key pairs |

---

## Production Deployment Checklist

1. Set `VITE_CLERK_PUBLISHABLE_KEY=pk_live_...` in **Deployment** secrets (not dev secrets)
2. Set `CLERK_SECRET_KEY=sk_live_...` in **Deployment** secrets
3. In Clerk dashboard → **Production instance** → configure Google / LinkedIn / Slack
   OAuth with your own credentials (Client ID + Secret from each provider)
4. In Clerk Production dashboard → Allowed redirect URLs: add `https://bidapp.sa/*`
5. In Google Cloud Console → OAuth consent screen:
   - Authorized domain: `bidapp.sa`
   - Authorized JavaScript origin: `https://clerk.bidapp.sa`
   - Authorized redirect URI: `https://clerk.bidapp.sa/v1/oauth_callback`
6. App logo for Google consent screen: use `attached_assets/exports/bid-logo-square.png`
   (1200×1200 PNG, transparent background — Google requires square, under 1 MB)
7. ToS URL for Google consent screen: `https://bidapp.sa/terms`
8. Privacy Policy URL for Google consent screen: `https://bidapp.sa/privacy`
