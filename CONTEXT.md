# Current Working Context

## What This Project Is
A B2B procurement/tendering platform for the Saudi market called **Bid**. Companies publish RFPs (tenders) and vendor companies submit proposals. Built with React + TypeScript frontend, Express.js backend, PostgreSQL via Drizzle ORM, and Replit Object Storage for file uploads.

## Recent Session Work (Feb 2026)

### 1. RFP Page Redesign (`client/src/pages/TenderInviteLink.tsx`)
Completely removed the tab-based interface and replaced it with a single scrolling document layout:
- **Table of Contents** at the top of the document body (inline, clickable, smooth-scrolls to sections)
- **All sections visible at once** in one continuous white container with horizontal dividers between them
- Section numbers (1.0, 2.0, etc.) shown as monospace labels next to each section header
- **Q&A panel separated** from the document — placed below with its own "Vendor Inquiries" header and distinct slate background. Not numbered, not in TOC.
- **Sidebar** is now minimal — just a sticky Submit Proposal CTA card

### 2. Proposal Submission Form Fix (`client/src/components/submit-offer-modal.tsx`)
The form was broken for all submission types — couldn't submit even with fields filled. Root causes fixed:
- **Dynamic schema resolver**: Used `useRef` (not a plain object) to hold the Zod schema so the form resolver always uses the correct schema for the current submission type (`quote_only`, `video_only`, `tech_fin_proposal`, `tech_fin_with_video`) and upload mode (`combined` vs `separate`)
- **Price input parsing**: Changed from `parseInt()` to `Number()` with proper empty/NaN handling
- **Progress calculation**: Replaced stale-error-based calculation with direct value checks — progress bar and submit button now respond immediately when fields are filled

### 3. File Access Fix (`server/routes.ts`, `server/storage.ts`)
403 errors when viewing uploaded proposal files:
- `getOfferByFileUrl()` now checks `combinedFileUrl` in addition to `technicalFileUrl` and `financialFileUrl`
- Access granted to both the **tender owner** (requester) AND the **submitting vendor company** for their own files

### 4. Onboarding Task Counter Fix (`server/storage.ts`)
Dashboard showed "5 of 5 completed" when only 4 visible tasks were done. `hasVisitedSettings` was being counted in `completedCount` but it's not displayed as a visible task — removed it from the count.

## Key Files
- `client/src/pages/TenderInviteLink.tsx` — Public RFP invite page (redesigned)
- `client/src/components/submit-offer-modal.tsx` — Proposal submission modal
- `client/src/pages/Dashboard.tsx` — Main dashboard (Overview, Tenders, Proposals, Vendors tabs)
- `server/routes.ts` — All API routes
- `server/storage.ts` — Database access layer (Drizzle ORM)
- `shared/schema.ts` — Shared DB schema and Zod types

## Submission Types
- `quote_only` — vendor enters a price number
- `video_only` — vendor pastes a video URL
- `tech_fin_proposal` — vendor uploads technical + financial files (or one combined file)
- `tech_fin_with_video` — files + optional/required video URL

## Auth Model
JWT tokens carry `{ userId, activeCompanyId, roleInCompany, isAdmin }`. Users can belong to multiple companies. Active company context set per-session.
