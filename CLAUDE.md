# Bid App — Claude Instructions

## Git workflow

**After every commit, immediately run `git push origin <current-branch>` without waiting to be asked.**

This applies after:
- A single task is completed and committed
- A batch of related changes is committed
- Any `git commit` command is run

Never leave commits unpushed at the end of a task. Push right after committing, every time.

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
