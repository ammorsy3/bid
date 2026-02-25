# Published RFP Page — Context

## File
`client/src/pages/TenderInviteLink.tsx`

Route: `/invite/:id` — publicly accessible, no login required to view.

---

## What This Page Does
This is the page vendors land on when they receive an RFP link. It shows the full tender document published by a requester company and lets vendors submit a proposal via a modal.

---

## Current Layout (post-redesign)

### Top Nav
- Bid logo (links to home)
- Login / Sign Up buttons if logged out, Dashboard button if logged in

### Header (white, sticky border-bottom)
- Company logo + name + "Requesting Organization" label
- Open/Closed badge
- "PROJECT TITLE" label + tender title (large)
- Published date + RFP reference number (e.g. `RFP-2DFA7977`)
- **Key Metrics Strip**: 2–4 cards for Deadline, Budget, Duration, Pricing Model (only shown if data exists, never shows "Not specified")

### Document Body (two-column: wide doc + narrow sidebar)

**Left column — continuous document:**
1. **Table of Contents bar** — inline, shows all section numbers + names, smooth-scrolls on click
2. **Single white document container** — all sections rendered at once, separated by horizontal dividers (no separate cards)
   - Each section has a monospace number label (1.0, 2.0, etc.) + bold heading
   - Sections: Project Description, Scope of Work & Deliverables, Milestones & Payment Schedule, Evaluation Criteria, Submission Requirements, Additional Context
   - Sections only render if they have content (conditional)
3. **Vendor Inquiries panel** — below the document, visually distinct (slate background), only shown when `inquiryType === 'inside_bid'`. Anonymous Q&A, not numbered, not in TOC.

**Right column — sticky sidebar:**
- Submit Proposal button (big, coral/red `#E25E45`)
- Compact Quick Info card (submission format, pricing model, category)
- Sticks at `top-20` to clear the nav bar

### Mobile
- Fixed bottom bar with Submit Proposal button

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
