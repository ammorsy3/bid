# Bid App — Claude Instructions

## Git workflow

At the start of every session, set the GitHub remote URL using the token from `.env`:
```
GITHUB_TOKEN=$(grep GITHUB_TOKEN .env | cut -d= -f2)
git remote set-url origin https://${GITHUB_TOKEN}@github.com/ammorsy3/bid.git
```

Pushing to GitHub is low priority — only push when explicitly asked. The dev server hot-reloads on every file save, so the user sees changes instantly in the browser without any push needed.

## Stack

- Frontend: React + TypeScript + Vite, Tailwind, shadcn/ui, TanStack Query v5, Wouter
- Backend: Express + TypeScript, Drizzle ORM, PostgreSQL
- i18n: custom `useI18n()` hook in `client/src/lib/i18n.tsx` — all user-facing strings go through `t()`
- Auth: JWT stored in localStorage, `useAuthStore` (Zustand), `authenticateToken` middleware on protected routes

## Conventions

- All user-facing strings must use `t()` — no hardcoded English or Arabic
- Zod schemas that need translated error messages must be factory functions: `const makeSchema = (t) => z.object({...})`
- Skeleton loaders (not spinners) for page-level loading states — primitives in `client/src/components/skeletons/`
- No comments unless the WHY is non-obvious
- No new TypeScript errors — run `npx tsc --noEmit` before finishing
