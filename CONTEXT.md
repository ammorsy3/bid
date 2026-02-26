# Published RFP Page — Context

## File
`client/src/pages/TenderInviteLink.tsx`

Route: `/invite/:id` — publicly accessible, no login required to view.

---

## What This Page Does
This is the page vendors land on when they receive an RFP link. It shows the full tender document published by a requester company and lets vendors submit a proposal via a modal.

---

## Current Layout (post-redesign v2)

### Top Nav
- Bid logo (links to home)
- Login / Sign Up buttons if logged out, Dashboard button if logged in

### Header (white, sticky border-bottom)
- Company logo + name + "Requesting Organization" label
- Open / Closes Today / Closed badge (computed from deadline vs now, using local calendar dates)
- "PROJECT TITLE" label + tender title (large)
- Published date + RFP reference number (e.g. `RFP-2DFA7977`)
- **Key Metrics Strip**: Deadline (color-coded), Budget, Duration (only when set), Pricing Model (only when set)
  - Duration card only shows if `tender.duration` OR calculated from start/end dates
  - Date range sub-line only shows when NO `tender.duration` string is set (bug fix)
  - Deadline "Closes today" bug fixed via local calendar date comparison

### Document Body (two-column: wide doc + narrow sidebar)

**Left column — continuous document:**
1. **Table of Contents bar** — inline, section numbers + names, smooth-scrolls on click, **active section highlighted** via IntersectionObserver
2. **Single white document container** — all sections rendered at once, separated by `SectionDivider` components

**Section structure:**
| # | Section ID | Label | Shown when |
|---|-----------|-------|-----------|
| 1 | `scope` | Project Scope | always |
| 2 | `timeline` | Milestones & Payments | `hasMilestones` |
| 3 | `evaluation` | Evaluation Criteria | `hasEvalCriteria` only (no longer includes submissionType) |
| 4 | `submission` | Submission Requirements | `submissionType` OR `vendorRequirements` OR external contact |
| 5 | `context` | Additional Context | voice note or video URL |
| 6 | `qa` | Vendor Q&A | `inquiryType === 'inside_bid'` |

**Evaluation section (§3):**
- If weighted criteria: shows visual stacked bar chart showing score distribution (%, colored per category), then expandable accordion per category
- If simple array criteria: 2-col grid of star cards

**Submission Requirements section (§4) — was "Vendor Requirements":**
- "What to Submit" block: submission format card + video required notice + deadline reminder
- "Eligibility Requirements": mandatory (red) + preferred (amber) requirement rows
- "Questions & Contact" block: email/WhatsApp for non-platform inquiry types
- Contact info moved here from evaluation section

**Right column — sticky sidebar:**
- **Submit Proposal CTA** — adapts text/state for open/closes-today/closed
- **"Prepare Your Submission" checklist** — dynamically generated from:
  - `submissionType` → document/video items
  - `evaluationCriteria.requirements` → document checklist items
  - `mandatoryRequirements` (up to 3 shown, "+N more →" link to section)
- **Category tag** — only if `tender.category` is set
- Sticks at `top-20`

### Mobile
- Fixed bottom bar with Submit Proposal button

### Sub-components (defined at bottom of file)
- `SectionDivider` — thin `<hr>` with horizontal margin
- `SectionHeader` — monospace number badge + bold title
- `SectionObserver` — wraps section in IntersectionObserver, fires `onVisible` callback

---

## Proposal Submission Modal (`client/src/components/submit-offer-modal.tsx`)

Opened when the vendor clicks Submit Proposal.

### Submission Types (from `tender.submissionType`)
- `quote_only` — number input for SAR price
- `video_only` — URL input for video link
- `tech_fin_proposal` — file uploads: separate (technical PDF + financial PDF) OR combined (one file). Vendor chooses upload mode.
- `tech_fin_with_video` — same as above + video URL (optional or required based on `tender.videoRequired`)

### Form Validation
- Uses Zod schemas per submission type, stored in a `useRef` so the resolver always reads the current schema even as `uploadMode` changes
- Progress bar calculated directly from field values (not from stale Zod error state)
- Submit button disabled until progress === 100%

### File Uploads
- Files go to Replit Object Storage via `/api/objects/upload` → presigned PUT URL
- After upload, metadata saved via `/api/objects/metadata` which returns the internal `objectPath`
- `objectPath` is stored in `technicalFileUrl`, `financialFileUrl`, or `combinedFileUrl` on the offer record

---

## Backend Endpoints Used by This Page

| Endpoint | Purpose |
|---|---|
| `GET /api/tenders/:id/invite` | Fetch tender data (public) |
| `GET /api/companies/:id/profile` | Fetch requester company profile + logo |
| `GET /api/tenders/:id/questions` | Fetch Q&A list |
| `POST /api/tenders/:id/questions` | Submit a vendor question (auth required) |
| `POST /api/tenders/:id/offers` | Submit a proposal (auth required) |
| `POST /api/objects/upload` | Get presigned upload URL |
| `PUT /api/objects/metadata` | Convert upload URL to internal objectPath |
| `GET /objects/:path` | Serve uploaded files (auth + ACL checked) |

---

## Key Data Shape (`TenderInvite` interface)

```ts
{
  id, title, description, deadline, status,
  budget?, budgetMin?, budgetMax?, showPriceToVendors?,
  projectSize?, duration?, startDate?, endDate?,
  pricingModel?,           // 'fixed' | 'milestone'
  submissionType?,         // 'quote_only' | 'video_only' | 'tech_fin_proposal' | 'tech_fin_with_video'
  videoRequired?,
  inquiryType?,            // 'inside_bid' | 'email_whatsapp'
  whatsappContact?, emailContact?,
  skills?,
  scope?,
  objective?,
  deliverables?,           // string[] or structured objects with name/description/quantity/unit
  milestones?,             // { name, description, amount, dueDate }[]
  evaluationCriteria?,     // array or { weights, requirements, customCriteria }
  voiceNoteUrl?,           // served via authenticated /objects/ route
  videoUrl?,
  company: { id, name },
  profile?: { displayName, logoUrl },
  category?,
  createdAt,
}
```

---

## Things to Know

- The page is light/white only — no dark sections
- Budget display logic: if `showPriceToVendors === false`, show project size range instead of actual numbers
- Evaluation criteria can be either a simple array of strings or a structured object with weighted categories and per-category requirements (expandable accordion)
- Voice notes require auth to play (fetched with Bearer token, converted to blob URL)
- Vendors need a verified or under_review company to submit — the modal shows a "Verification Required" warning otherwise
- The page uses `wouter` for routing, `@tanstack/react-query` for data fetching, `shadcn/ui` + Tailwind for styling
