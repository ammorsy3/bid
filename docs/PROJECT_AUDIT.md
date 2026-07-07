# Bid Platform — Full Project Audit Report

**Date**: March 4, 2026  
**Codebase Size**: ~25,000 lines across 100+ source files  
**Total Pages**: 46 files (26 routed, 20 orphaned/legacy)  
**Total API Endpoints**: 55+ (all functional)  
**Database Tables**: 16 (all migrated)

---

## 1. App Overview

### Core Purpose
**Bid** is a B2B procurement/tendering platform designed specifically for the Saudi Arabian market. It enables companies to:
- Publish professional RFPs (Requests for Proposal) with structured requirements
- Build and manage private vendor networks ("Vendors Base")
- Receive, review, and award proposals from qualified vendors
- Manage the full tender lifecycle: draft → publish → collect proposals → award

The platform follows a **company-centric architecture** where companies are the primary entities. Users can belong to multiple companies with different roles (Owner, Admin, Member, Viewer), and the active company context is embedded in JWT tokens for every API call.

### Target Users
- **Requester companies**: Create tenders, manage vendor bases, evaluate proposals, award contracts
- **Vendor companies**: Discover RFPs via invitation links, submit proposals, track status, join vendor networks
- **Platform admins**: Verify company registrations, manage blocked awards, promote users, audit system activity

### Tech Stack (Detailed)

| Layer | Technology | Details |
|-------|-----------|---------|
| **Frontend Framework** | React 18.3 + TypeScript 5.6 | JSX auto-transform via Vite, strict mode |
| **Routing** | Wouter 3.3 | Lightweight router, company-aware route guards |
| **State: Auth** | Zustand 5.0 + `persist` middleware | `client/src/lib/auth.ts` — stores user, token, activeCompany, companies in localStorage |
| **State: Server** | TanStack Query v5 | Default fetcher with JWT header injection in `client/src/lib/queryClient.ts`, staleTime=Infinity, retry=false |
| **Forms** | React Hook Form 7.55 + Zod 3.25 | `@hookform/resolvers/zod` for schema validation |
| **UI Components** | shadcn/ui (50+ components) | Built on Radix UI primitives, customized with Tailwind |
| **Styling** | Tailwind CSS 3.4 + tailwindcss-animate | Custom design tokens, `dark:` variant classes present |
| **Icons** | Lucide React 0.453 | Primary icon library throughout all pages |
| **Animations** | Framer Motion 11.13 | Page transitions, card animations, modals |
| **Drag & Drop** | @dnd-kit/core 6.3 + @dnd-kit/sortable 10.0 | Form builder card reordering |
| **File Upload** | Uppy 5.0 (@uppy/core, @uppy/dashboard, @uppy/react, @uppy/aws-s3) | Proposal file uploads with progress tracking |
| **Charts** | Recharts 2.15 | Admin dashboard metrics visualization |
| **Date Handling** | date-fns 3.6 + @internationalized/date 3.10 | Date formatting, aria calendar components |
| **Backend** | Express.js 4.21 + TypeScript | RESTful API with company-scoped middleware |
| **Authentication** | JWT (jsonwebtoken 9.0) + bcrypt 6.0 | 7-day token expiry, company context in payload `{userId, activeCompanyId, roleInCompany, isAdmin}` |
| **File Upload (server)** | multer 2.0 (memory storage) | 5MB limit for images, 10MB for documents |
| **Database** | PostgreSQL via Neon Serverless (@neondatabase/serverless 0.10) | Cloud-hosted serverless PostgreSQL |
| **ORM** | Drizzle ORM 0.39 + drizzle-zod 0.7 | Type-safe queries, insert schemas, relation definitions |
| **File Storage** | Replit Object Storage (Google Cloud Storage backend) | Public/private directories, ACL policies per file |
| **AI: Budget** | OpenAI GPT-4o | Budget estimation with SAR-denominated market rates |
| **AI: Category** | OpenAI GPT-4o | Auto-categorize tenders from 15 predefined categories |
| **AI: Copilot** | OpenAI GPT-4.1 (via Replit AI integration) | Conversational tender creation with SSE streaming |
| **Email** | SendGrid (@sendgrid/mail 8.1) | **Installed but NOT used** — zero email-sending code |
| **WebSocket** | ws 8.18 | **Installed but NOT used** — no real-time handlers |
| **i18n** | Custom React Context in `client/src/lib/i18n.tsx` (2,022 lines) | EN/AR translations, RTL auto-layout, `useI18n()` hook |
| **Build** | Vite 5.4 + esbuild | Dev server with HMR, production bundling |

### Project Structure (Detailed)
```
├── client/src/
│   ├── App.tsx                        # Router — 26 routes, wrapped in I18nProvider + QueryClientProvider
│   ├── main.tsx                       # Entry point, mounts App + setupGlobalErrorHandlers()
│   ├── index.css                      # Tailwind imports + custom CSS variables + dark mode tokens
│   ├── pages/                         # 46 page files total
│   │   ├── Landing.tsx (37 lines)         # Composes 12 landing section components
│   │   ├── login.tsx (137 lines)          # Email/password login form
│   │   ├── register.tsx (166 lines)       # Registration with name/email/password
│   │   ├── CompanyOnboarding.tsx (268)    # 3-step: legal info → profile → submit for verification
│   │   ├── Dashboard.tsx (2,802 lines)    # Mega-component: sidebar + 4 tabs (Overview, Tenders, Proposals, Vendors)
│   │   ├── Settings.tsx (798 lines)       # User profile + language + company profile editing
│   │   ├── TenderCreateChoice.tsx         # Entry: "AI Copilot" vs "Create Myself"
│   │   ├── TenderAICopilot.tsx (1,168)    # Conversational AI tender builder with SSE streaming
│   │   ├── TenderStartMethodStep.tsx (818)# Template selection or start from scratch
│   │   ├── TenderTitleStep.tsx            # Step 1: Project title with character counter
│   │   ├── TenderProjectScopeStep.tsx (905)# Step 2: Deliverables, timeline, milestones, voice note
│   │   ├── TenderAIBudgetStep.tsx (524)   # Step 3: AI estimate or manual budget entry
│   │   ├── TenderSubmissionProcessStep.tsx (552)# Step 4: Deadline, submission type, Q&A method
│   │   ├── TenderEvaluationCriteriaStep.tsx (637)# Step 5: Weights, requirements, preset criteria
│   │   ├── TenderVendorRequirementsStep.tsx (314)# Vendor qualification checklist
│   │   ├── TenderBriefStep.tsx (885)      # Summary review before form builder
│   │   ├── TenderFormBuilder.tsx (341)    # Drag-and-drop custom form fields
│   │   ├── TenderFormFill.tsx (344)       # Vendor-side form preview/fill
│   │   ├── TenderReview.tsx (747)         # Final review + publish action
│   │   ├── TenderInviteLink.tsx (1,693)   # Public published RFP view + proposal submission
│   │   ├── TenderEditPage.tsx (1,276)     # Edit published/draft tenders inline
│   │   ├── tender-details.tsx (1,545)     # Internal tender detail view (requester)
│   │   ├── TractionLink.tsx (276)         # Public vendor application page
│   │   ├── AdminDashboard.tsx (166)       # Admin metrics overview
│   │   ├── AdminVendors.tsx (317)         # Company verification admin panel
│   │   ├── AdminJoinRequests.tsx (245)    # Join request management
│   │   └── [20 orphan/legacy files]       # Not routed — see Section 3
│   ├── components/
│   │   ├── ui/                            # ~50 shadcn/ui components (button, card, dialog, tabs, etc.)
│   │   ├── landing/                       # 12 landing page sections
│   │   │   ├── Header.tsx (101)           # Navigation header with auth buttons
│   │   │   ├── Hero.tsx (59)              # Main hero section
│   │   │   ├── Features.tsx (57)          # Feature grid
│   │   │   ├── HowItWorks.tsx (54)        # Step-by-step process
│   │   │   ├── Problem.tsx (55)           # Problem statement
│   │   │   ├── Results.tsx (54)           # Results/metrics
│   │   │   ├── Testimonials.tsx (52)      # Customer testimonials
│   │   │   ├── UseCases.tsx (49)          # Use case examples
│   │   │   ├── UniqueSellingPoint.tsx      # USP section
│   │   │   ├── SocialProof.tsx (33)       # Trust badges
│   │   │   ├── CTA.tsx (33)              # Call-to-action
│   │   │   ├── Footer.tsx (45)           # Footer with links
│   │   │   └── BackToTop.tsx (44)        # Scroll-to-top button
│   │   ├── form-builder/                  # Drag-and-drop form builder system
│   │   │   ├── CardInputRenderer.tsx (1,341)# Renders each card type (text, textarea, select, date, budget, etc.)
│   │   │   ├── CardLibrarySidebar.tsx (322)# Sidebar with draggable card types
│   │   │   ├── FormBuilderCanvas.tsx (266)# Drop zone canvas
│   │   │   ├── DraggableCard.tsx (252)    # Individual draggable card wrapper
│   │   │   ├── FieldInsightPanel.tsx (168)# AI field insights panel
│   │   │   ├── StepIndicator.tsx (65)     # Step progress indicator
│   │   │   └── index.ts                   # Barrel export
│   │   ├── submit-offer-modal.tsx (817)   # Proposal submission form with file uploads
│   │   ├── create-tender-modal.tsx (637)  # Legacy tender creation modal (still imported somewhere)
│   │   ├── voice-recorder.tsx (363)       # Audio recording component
│   │   ├── VendorProfileView.tsx (242)    # Vendor company profile display
│   │   ├── VendorProfileDrawer.tsx (242)  # Vendor profile in a drawer
│   │   ├── RequesterProfileView.tsx (226) # Requester company profile display
│   │   ├── ObjectUploader.tsx (87)        # Generic file upload component
│   │   ├── vendor-invitation-card.tsx (126)# Invitation card UI
│   │   ├── AdminLayout.tsx (115)          # Admin page layout wrapper
│   │   ├── tender-card.tsx (108)          # Tender card in listings
│   │   └── navbar.tsx (95)               # Navigation bar
│   └── lib/
│       ├── i18n.tsx (2,022 lines)         # EN/AR translations — sections: settings, dashboard, auth, onboarding, nav, common, tenderFlow
│       ├── auth.ts (180 lines)            # Zustand auth store with persist middleware
│       ├── queryClient.ts (90 lines)      # TanStack Query config + apiRequest helper + error reporting
│       ├── errorLogger.ts (55 lines)      # reportError() + setupGlobalErrorHandlers()
│       ├── downloadFile.ts                # viewAuthenticatedFile() for ACL-protected downloads
│       ├── autosave.ts                    # Autosave hook for tender creation
│       ├── form-builder-types.ts          # TypeScript types for form builder cards
│       ├── form-validation.ts             # Form validation utilities
│       ├── format-currency.ts             # SAR currency formatting
│       ├── capitalize-helpers.ts          # String capitalization utilities
│       ├── evaluation-criteria-data.ts    # Preset evaluation criteria data
│       ├── smart-suggestions.ts           # AI-powered field suggestions
│       ├── tender-suggestions.ts          # Tender field suggestions
│       └── utils.ts                       # cn() classname merge utility
├── server/
│   ├── index.ts                           # Express app setup + Vite middleware + server start
│   ├── routes.ts (2,512 lines)            # All 55+ API endpoints
│   ├── storage.ts (1,325 lines)           # IStorage interface + DatabaseStorage implementation
│   ├── db.ts                              # Neon PostgreSQL connection via Drizzle
│   ├── objectStorage.ts                   # ObjectStorageService class (GCS via Replit sidecar)
│   ├── objectAcl.ts                       # ACL policy management (owner, visibility, permissions)
│   ├── vite.ts                            # Vite dev server integration (DO NOT MODIFY)
│   └── replit_integrations/
│       ├── copilot/index.ts               # AI copilot chat endpoint (SSE streaming, GPT-4.1)
│       ├── chat/                          # Chat integration (Replit AI)
│       ├── audio/                         # Audio integration (voice recording)
│       ├── image/                         # Image generation integration
│       └── batch/                         # Batch processing utilities
├── shared/
│   └── schema.ts (796 lines)             # 16 Drizzle tables + relations + Zod validation schemas
├── drizzle.config.ts                      # Drizzle Kit config (DO NOT MODIFY)
├── vite.config.ts                         # Vite config (DO NOT MODIFY)
├── tailwind.config.ts                     # Tailwind + typography plugin
└── package.json                           # Dependencies + scripts
```

---

## 2. Features Inventory

### FULLY Implemented & Working

#### Authentication & User Management
| # | Feature | Key Files | How It Works |
|---|---------|-----------|-------------|
| 1 | **User Registration** | `register.tsx`, `POST /api/auth/register` | Email + password + name. Password hashed with bcrypt (10 rounds). Returns JWT with no activeCompanyId (user must create/join a company). |
| 2 | **User Login** | `login.tsx`, `POST /api/auth/login` | Email/password auth. Returns JWT with first company as activeCompanyId (sorted by role: owner > admin > member > viewer). Token expires in 7 days. |
| 3 | **Session Persistence** | `client/src/lib/auth.ts` | Zustand store with `persist` middleware saves `{token, user, activeCompany, companies}` to localStorage under key `auth-storage`. Token also stored separately under `token` key. |
| 4 | **Auth Check (`/api/auth/me`)** | `GET /api/auth/me` | Validates JWT, returns user profile + all companies with roles + profiles. Called on app load to verify session. |
| 5 | **Auto-redirect on 401/403** | `client/src/lib/queryClient.ts` | `throwIfResNotOk()` detects expired tokens, clears localStorage, redirects to `/login`. Also reports API errors to `/api/errors`. |
| 6 | **User Profile Editing** | `Settings.tsx`, `PATCH /api/user/profile` | Edit name, job title, timezone, LinkedIn URL, phone number. |
| 7 | **Profile Picture Upload** | `Settings.tsx`, `POST /api/user/profile-picture` | Upload to Object Storage (public folder `profile-pictures/`), stored as `profilePictureUrl` on user record. 5MB max, image types only. |
| 8 | **Tender Inquiry Email** | `Settings.tsx`, `PATCH /api/user/tender-inquiry-email` | Save a separate email for tender inquiry notifications (different from account email). |

#### Company Management
| # | Feature | Key Files | How It Works |
|---|---------|-----------|-------------|
| 9 | **Company Creation** | `CompanyOnboarding.tsx`, `POST /api/companies` | 3-step wizard: legal info (name, CR number, VAT, city, category) → profile (display name, bio) → submit for verification. Auto-generates unique slug from company name. Creator is added as `owner` role. Company profile record auto-created. |
| 10 | **Company Verification** | `AdminVendors.tsx`, `POST /api/admin/companies/:id/verify|reject` | Platform admins review pending companies. Approval changes `verificationStatus` from `under_review` to `verified`. Rejection requires a reason. Both actions create audit log entries with full before/after state snapshots. |
| 11 | **Company Profile Editing** | `Settings.tsx`, `PATCH /api/company/profile` | Edit display name, bio. Requires `owner` or `admin` role in company. |
| 12 | **Company Logo Upload** | `Settings.tsx`, `POST /api/company/logo` | Upload to Object Storage (public folder `company-logos/`). Stored as `logoUrl` on company_profiles. |
| 13 | **Company Switching** | Auth store, `POST /api/companies/switch/:companyId` | Regenerates JWT with new `activeCompanyId` and `roleInCompany`. Security-first: new token required for each company context switch. |
| 14 | **Multi-Company Support** | `user_companies` table, Dashboard sidebar | Users can belong to multiple companies. Company selector in dashboard sidebar. Each company has independent tenders, offers, and vendor base. |

#### Tender Creation Flow (5-Step Wizard)
| # | Feature | Key Files | How It Works |
|---|---------|-----------|-------------|
| 15 | **Entry Point** | `TenderCreateChoice.tsx` | Two paths: "Create with AI Copilot" (→ `/tenders/new/ai`) or "Create Myself" (→ `/tenders/new/manual`). Full i18n EN/AR. |
| 16 | **Template Selection** | `TenderStartMethodStep.tsx` | Choose "Start from template" (loads saved templates from `/api/templates`) or "Start from scratch". Default "Bid Recommended" template available. Full i18n EN/AR. |
| 17 | **Step 1: Title** | `TenderTitleStep.tsx` | Project title input with 100-char limit, word count display, contextual tips ("Keep it clear & specific"). Full i18n EN/AR. |
| 18 | **Step 2: Project Scope** | `TenderProjectScopeStep.tsx` (905 lines) | Most complex step. Includes: key deliverables (name, description, unit, quantity — validated), project timeline (start/end dates), milestones (name, date), project description (text or voice note via `voice-recorder.tsx`). Validation requires ≥1 deliverable and ≥20 words in description. Full i18n EN/AR. |
| 19 | **Step 3: Budget** | `TenderAIBudgetStep.tsx` (524 lines) | Two modes: AI estimate (calls `POST /api/ai/estimate-budget` with GPT-4o) or manual entry. AI returns `{estimatedBudget, budgetRange, breakdown, reasoning}` in SAR. Manual supports exact amount or min/max range. Toggle for "Show price to vendors". Project size auto-calculated (small <50K, medium 50-250K, large 250K+). Full i18n EN/AR. |
| 20 | **Step 4: Submission Process** | `TenderSubmissionProcessStep.tsx` (552 lines) | Configure: submission deadline (with deadline proximity warnings), submission type (quote only / full tech+financial proposal / video pitch / proposal + video), video requirements (mandatory vs optional), inquiry method (inside Bid Q&A / external email+WhatsApp). Email can be saved for future tenders via `PATCH /api/user/tender-inquiry-email`. Full i18n EN/AR. |
| 21 | **Step 5: Evaluation Criteria** | `TenderEvaluationCriteriaStep.tsx` (637 lines) | Two sections: evaluation weights (custom criteria with percentage weights, must total 100%) and submission requirements (preset list: legal registration, CR certificate, VAT, GOSI, etc. — each can be mandatory or preferred, plus custom requirements). Skip-both-sections option available. Full i18n EN/AR. |
| 22 | **Vendor Requirements** | `TenderVendorRequirementsStep.tsx` (314 lines) | Qualification checklist: preset requirements with mandatory/preferred toggle + custom requirements. **Note: NOT yet translated to Arabic.** |
| 23 | **Brief/Summary** | `TenderBriefStep.tsx` (885 lines) | Pre-publication summary showing all configured tender details in organized sections: title, scope, budget, timeline, submission process, evaluation criteria, vendor requirements. Copy invitation link button. |

#### AI Features
| # | Feature | Key Files | How It Works |
|---|---------|-----------|-------------|
| 24 | **AI Copilot** | `TenderAICopilot.tsx` (1,168 lines), `server/replit_integrations/copilot/index.ts` | Conversational tender creation. Uses GPT-4.1 via Replit AI integration with SSE (Server-Sent Events) streaming. System prompt guides AI to collect: service/product, budget, timeline, deliverables, deadline. AI responds with JSON: `{message, suggestions[], tenderData, readyToLaunch}`. Quick-reply suggestion buttons. Progress tracker showing which fields are collected. Builds company context from user's active company. |
| 25 | **AI Budget Estimation** | `POST /api/ai/estimate-budget` | GPT-4o with detailed Saudi market rate guidelines (15 project types with SAR ranges). Returns structured JSON: estimated budget, min/max range, line-item breakdown, reasoning text. Fallback estimate if JSON parsing fails. |
| 26 | **AI Category Suggestion** | `POST /api/ai/suggest-category` | Auto-categorizes tender from 15 predefined `VENDOR_CATEGORIES` (Construction, IT, Healthcare, etc.) using tender title, description, skills, and deliverables. Called during tender publishing. |

#### Form Builder & Custom Fields
| # | Feature | Key Files | How It Works |
|---|---------|-----------|-------------|
| 27 | **Drag-and-Drop Form Builder** | `TenderFormBuilder.tsx`, `CardLibrarySidebar.tsx`, `FormBuilderCanvas.tsx`, `DraggableCard.tsx` | @dnd-kit powered. Card types: custom text, custom textarea, custom date, custom select (dropdown), budget/pricing, company info, project timeline, deliverables, attachments, file upload. Cards have label, placeholder, required toggle, options (for select). Form structure saved as `formCards` jsonb on tenders table. |
| 28 | **Card Input Renderer** | `CardInputRenderer.tsx` (1,341 lines) | Renders each card type with appropriate UI: text inputs, textareas, date pickers, select dropdowns, budget range sliders, file upload zones, deliverable lists with add/remove, company contact fields (phone, email, CR number). |
| 29 | **Form Fill (Vendor)** | `TenderFormFill.tsx` (344 lines) | Vendor-side form filling. Reads `formCards` from tender, renders with `CardInputRenderer` in fill mode. Collects responses. |
| 30 | **Field Insights** | `FieldInsightPanel.tsx` (168 lines) | AI-powered insights panel for form builder fields — suggests improvements and best practices. |

#### Published RFP & Proposals
| # | Feature | Key Files | How It Works |
|---|---------|-----------|-------------|
| 31 | **Published RFP View** | `TenderInviteLink.tsx` (1,693 lines) | Public page at `/invite/:invitationToken`. Shows: company branding (logo, name), tender title/description, project scope, deliverables, timeline, budget (if `showPriceToVendors=true`), submission deadline with real-time countdown, submission type, evaluation criteria, vendor requirements, attachments (downloadable). Q&A section for `inside_bid` inquiry type. Login prompt for proposal submission. |
| 32 | **Tender Invitation Token** | `GET /api/tenders/:id/invite` | Resolves by `invitationToken` first (via `getTenderByInvitationToken`), then falls back to UUID lookup. Returns public tender data with company info. |
| 33 | **Proposal Submission** | `submit-offer-modal.tsx` (817 lines) | Supports 4 submission types: quote-only (price input), full proposal (technical + financial file uploads via Uppy + Object Storage), video pitch (URL input), proposal + video. Files uploaded to Object Storage with private ACL. Deadline enforcement (server rejects if past deadline). Duplicate submission prevention. Autosave support. Progress tracking. |
| 34 | **Proposal Review** | Dashboard "Proposals" tab | Two sub-tabs: "Submitted" (vendor's own proposals) and "Received" (incoming proposals on company's tenders). Received proposals show: company name/logo, submission date, file download links, quote amount, video URL. Accept/reject actions with `PATCH /api/offers/:offerId/status`. |
| 35 | **Offer View Tracking** | `offer_views` table, `POST /api/offers/:offerId/view` | Tracks which users have viewed incoming proposals. Unread badge on proposal cards. Prevents duplicate view records. |

#### Vendor Base & Network Management
| # | Feature | Key Files | How It Works |
|---|---------|-----------|-------------|
| 36 | **Vendors Base** | Dashboard "Vendors Base" tab, `VendorsBase.tsx`, `GET /api/vendors-base` | Company's private vendor catalog. Shows approved vendors with company name, logo, category, join method (invitation/traction/tender_invite), join date. Search functionality. Remove vendor option. |
| 37 | **Traction Link** | `TractionLink.tsx`, `GET/POST /api/r/:slug` | Public page at `/traction/:slug`. Vendors can apply to join a company's vendor base. Shows requester company profile (logo, name, bio). Application creates a `join_request` record. Requires vendor to be logged in with a company. |
| 38 | **Join Request Management** | Dashboard, `POST /api/join-requests/:id/approve|reject` | Requester admins see pending join requests with vendor company details. Approve adds vendor to `vendors_base`. Reject records rejection reason. Pending count badge via `GET /api/join-requests/pending-count`. |

#### Tender Q&A System
| # | Feature | Key Files | How It Works |
|---|---------|-----------|-------------|
| 39 | **Anonymous Q&A** | `tender_questions` table, `TenderInviteLink.tsx` | Vendors submit questions anonymously on published RFPs (only when `inquiryType='inside_bid'`). Questions shown without vendor identity to all viewers. Tender owners see `askedByCompanyName` for context. |
| 40 | **Answer Questions** | `PATCH /api/tenders/:id/questions/:questionId/answer` | Tender owner (admin+ role) can answer questions. Answers visible to all viewers. |

#### Admin System
| # | Feature | Key Files | How It Works |
|---|---------|-----------|-------------|
| 41 | **Admin Dashboard** | `AdminDashboard.tsx` (166 lines), `GET /api/admin/metrics` | Real-time metrics: pending verifications, pending join requests, proposals in last 24h, blocked awards. Event-first calculation from database aggregations. |
| 42 | **Company Verification Panel** | `AdminVendors.tsx` (317 lines), `GET /api/admin/companies/pending` | Lists companies with `verificationStatus='under_review'`. Shows company name, legal name, CR number, category, city. Approve/reject buttons with optional notes. |
| 43 | **Admin Join Requests** | `AdminJoinRequests.tsx` (245 lines), `GET /api/admin/join-requests` | Cross-company view of all join requests with vendor/requester names and status. Approve/reject from admin level (bypasses requester approval). |
| 44 | **Blocked Awards** | `GET /api/admin/awards/blocked`, `POST /api/admin/awards/:awardId/unblock` | Backend endpoints for managing awards blocked due to company verification issues. Admin can unblock after verifying company. |
| 45 | **User Promotion** | `POST /api/admin/users/:userId/promote` | Promote any user to platform admin (`isAdmin=true`). Logs audit trail with before/after state. |
| 46 | **Audit Logging** | `audit_log` table, `GET /api/admin/audit-logs` | Every admin action logged: company verification, rejection, join request decisions, user promotion. Full before/after state snapshots stored as JSON. Queryable with limit parameter. |
| 47 | **Error Log Viewer** | `GET /api/admin/errors` | View last 200 client + server errors with: userId, companyId, source, method, path, status code, message, stack trace, user agent, metadata, timestamp. |

#### Observability & Analytics
| # | Feature | Key Files | How It Works |
|---|---------|-----------|-------------|
| 48 | **Client Error Logging** | `client/src/lib/errorLogger.ts` | `setupGlobalErrorHandlers()` captures `window.onerror` and `unhandledrejection` events. `reportError()` sends to `POST /api/errors` with rate limiting (1s minimum interval). API error responses also auto-reported from `queryClient.ts`. |
| 49 | **Server Error Logging** | `server/routes.ts` (global error middleware) | Express error handler middleware at end of route chain. Captures unhandled errors with user/company context from JWT. |
| 50 | **Product Events** | `product_events` table | Append-only event log: `company_created`, `company_verified`, `proposal_submitted`, `settings_visited`. Used for admin metrics calculations. |
| 51 | **Onboarding Tasks** | `GET /api/onboarding-tasks` | 6-task checklist: hasTender, hasCompletedProfile, hasProfilePicture, hasVendors, hasReviewedProposal, hasVisitedSettings. Calculated from database state. `completedCount` returned for progress display. |

#### i18n (Internationalization)
| # | Feature | Key Files | How It Works |
|---|---------|-----------|-------------|
| 52 | **i18n System** | `client/src/lib/i18n.tsx` (2,022 lines) | React Context + Provider pattern. `useI18n()` hook returns `{t, locale, setLocale, dir}`. `t('section.key')` lookup with dot notation. `dir` returns `'rtl'` for Arabic. Language stored in localStorage. |
| 53 | **Translation Coverage** | Various pages | **Translated (EN/AR)**: Tender creation flow (7 pages), auth pages, dashboard, settings, navigation, common strings. **Not translated**: ~23 pages still hardcoded English (see Section 2 below). |

#### Other Features
| # | Feature | Key Files | How It Works |
|---|---------|-----------|-------------|
| 54 | **Tender Templates** | `/api/templates` CRUD | Save form builder card configurations as reusable templates. Templates are company-scoped. CRUD: create, list by company, get by ID, update, delete. Access control: private to company unless `isPublic=true`. |
| 55 | **Tender Attachments** | `POST /api/objects/upload`, `PUT /api/objects/metadata` | Requester uploads PDF/DOC/DOCX/XLS/XLSX/PNG/JPG (10MB max). Files stored in Object Storage with private ACL. URLs saved in `attachments` jsonb array on tenders. Displayed as downloadable cards on invite page with file type icons and sizes. |
| 56 | **Voice Notes** | `voice-recorder.tsx`, audio integration | Record audio in project scope step. Uploaded to Object Storage. `voiceNoteUrl` stored on tender. Playable on invite page. |
| 57 | **File ACL Security** | `server/objectAcl.ts`, `server/objectStorage.ts` | Owner-based access control. Each uploaded file gets an ACL policy: `{owner, visibility}`. Protected file access checks: direct owner, company ownership of proposal's tender, voice notes on published tenders, attachments on published tenders. Multi-layer fallback. |
| 58 | **Status Transitions** | `PATCH /api/tenders/:id/status` | Validated state machine: draft → published/cancelled, published → draft/closed/cancelled, closed → (terminal), cancelled → (terminal). |
| 59 | **Landing Page** | `Landing.tsx` + 12 section components | Marketing page: Header, Hero, SocialProof, Problem, Features, HowItWorks, UniqueSellingPoint, UseCases, Results, Testimonials, CTA, Footer, BackToTop. |
| 60 | **Tender Edit** | `TenderEditPage.tsx` (1,276 lines) | Edit draft or published tenders inline. All fields editable: title, description, scope, budget, deadline, submission type, evaluation criteria. Uses `PATCH /api/tenders/:id`. |

---

### PARTIALLY Implemented (Detailed)

| # | Feature | What's Done | What's Missing | Effort to Complete |
|---|---------|-------------|----------------|-------------------|
| 1 | **Email Notifications (SendGrid)** | `@sendgrid/mail` package installed, `javascript_sendgrid` integration configured | **Zero email-sending code** in `server/routes.ts`. No email sent for: tender invitations, proposal received/accepted/rejected, company verified/rejected, join request approved/rejected, new vendor questions | Medium — need to write email templates + trigger points in routes |
| 2 | **i18n: Remaining Pages** | 7 tender flow pages + auth + dashboard + settings + nav + common translated. Form builder components (`CardLibrarySidebar`, `FormBuilderCanvas`, `DraggableCard`, `FieldInsightPanel`) have `t()` calls | **23 pages still hardcoded English**: `TenderVendorRequirementsStep` (314 lines), `TenderBriefStep` (885 lines, partially — has 88 t() calls but likely mixed), `TenderReview` (747 lines, 16 t() calls — mostly hardcoded), `TenderAICopilot` (1,168 lines, 28 t() calls — mostly hardcoded), `TenderEditPage` (1,276 lines, 32 t() calls — mostly hardcoded), `TenderInviteLink` (1,693 lines, 75 t() calls — still has hardcoded strings), `TractionLink` (276 lines, 6 t() calls — mostly hardcoded), `AdminDashboard` (166 lines, 19 t() calls — mostly translated), `AdminVendors` (317 lines, 56 t() calls — mostly translated), `Landing.tsx` + all 12 landing components (no i18n), `tender-details.tsx` (1,545 lines, no i18n), `AdminJoinRequests` (245 lines), `CompanyOnboarding` (268 lines, 39 t() calls — partial) | Large — thousands of strings to extract and translate |
| 3 | **Vendor Invitation System** | `invitations` table (tenderId, companyId, vendorEmail, vendorName, invitationToken, status), `invitationLinks` table (requesterCompanyId, tenderId, vendorEmail, token, status), `VendorInvitation.tsx` (309 lines), `invitation-signup.tsx` (398 lines), `invitation-links.tsx` pages built | Pages **not routed** in `App.tsx`. No email delivery for invitations. No UI in dashboard to create invitations. `VendorInvitation.tsx` handles token-based acceptance but isn't accessible. | Medium — need to wire routes + email delivery + dashboard UI |
| 4 | **Award System (Frontend)** | `awards` table fully defined (tenderId, companyId, offerId, status: pending/blocked/awarded, blockReason, awardedBy, awardedAt), `POST /api/admin/awards/:awardId/unblock` admin endpoint, `createAward()` in storage, `getBlockedAwards()` query | **No requester UI** to select a winner from proposals tab. No "Award" button on proposal cards. No award confirmation flow. Admin can unblock blocked awards but requesters can't initiate them. `AdminAwards.tsx` (built but not routed) has admin UI. | Small-Medium — need "Award" button + confirmation dialog in Dashboard proposals tab |
| 5 | **Dark Mode** | CSS custom properties defined in `:root` and `.dark` classes in `index.css`. Many components use `dark:` Tailwind variants. shadcn components have built-in dark mode support. | No `ThemeProvider` component. No toggle UI (switch/button) anywhere. No localStorage persistence for theme. `tailwind.config.ts` would need `darkMode: ["class"]` verification. | Small — create ThemeProvider + toggle button in settings/navbar |
| 6 | **Admin Sub-Pages** | `AdminAuditLogs.tsx`, `AdminAwards.tsx`, `AdminUsers.tsx` pages built (each ~200 lines) | **Not routed** in `App.tsx`. Features accessible only via main `AdminDashboard.tsx` if they were linked. Need routes: `/admin/audit-logs`, `/admin/awards`, `/admin/users`. | Tiny — just add 3 Route entries in App.tsx |
| 7 | **Tender Details (Internal)** | `tender-details.tsx` (1,545 lines) routed at `/tenders/:id` | Overlaps significantly with `TenderEditPage.tsx` (1,276 lines at `/tenders/:id/edit`) and `TenderInviteLink.tsx` (1,693 lines at `/invite/:id`). May contain legacy patterns. Role of this page vs edit page vs invite page needs clarification. | Needs review — may be legacy/redundant |

---

### NOT Implemented (Referenced but Missing)

| # | Feature | Evidence in Code | What Would Be Needed |
|---|---------|-----------------|---------------------|
| 1 | **Email Delivery** | `@sendgrid/mail` installed, `javascript_sendgrid` integration configured | Email service class, HTML templates for each notification type, trigger integration into existing routes (on proposal submit, on company verified, on join request approved, etc.) |
| 2 | **Real-time Notifications** | No notification table, no bell icon, no WebSocket handler despite `ws` package installed | `notifications` table (userId, type, message, isRead, metadata, createdAt), WebSocket server for push notifications, bell icon component in navbar, notification dropdown UI |
| 3 | **Payment/Billing** | No evidence at all — no Stripe, no payment tables | Full payment system if monetization planned |
| 4 | **Company Document Upload** | `companies.documents` jsonb field: `{vatCertificate?, gosiCertificate?, nationalAddressCertificate?, [key]: string}` | Upload UI in CompanyOnboarding or Settings, Object Storage integration for document files, admin review during verification |
| 5 | **Company Certifications** | `companies.certifications` jsonb array field | UI to add/remove certification names, display on company profile |
| 6 | **Company Brochure** | `company_profiles.brochureUrl` text field | Upload button in Settings, PDF display on company profile |
| 7 | **Company Social Links** | `company_profiles.socialLinks` jsonb: `{website?, linkedin?, twitter?, [key]: string}` | Social links editor in Settings, social icons on company profile views |
| 8 | **Company Tags** | `company_profiles.tags` jsonb array field | Tag input component in Settings, tag display on company profile |
| 9 | **Invitation Email Flow** | `invitations` + `invitationLinks` tables with full schema | Email sending on invitation creation, invitation acceptance flow, auto-add to vendors base on acceptance |
| 10 | **404 Page** | `not-found.tsx` exists in pages folder | Add as default route in App.tsx Switch component |
| 11 | **Password Reset** | No evidence | Reset token generation, email delivery, reset form UI |
| 12 | **Team Member Invitations** | `user_companies.invitedBy` field exists | UI for company owners to invite users, email invitation, accept/join flow |

---

## 3. Pages & Screens

### Routed Pages (26 — in App.tsx)

| Route | Component File | Lines | i18n `t()` Calls | Status | Description |
|-------|---------------|-------|-------------------|--------|-------------|
| `/` | `Landing.tsx` | 37 | 0 | Built, no i18n | Composes 12 landing section components |
| `/login` | `login.tsx` | 137 | 22 | Built, translated | Email/password login form |
| `/signup` | `register.tsx` | 166 | 26 | Built, translated | Registration with validation |
| `/onboarding` | `CompanyOnboarding.tsx` | 268 | 39 | Built, partial i18n | 3-step company creation wizard |
| `/dashboard` | `Dashboard.tsx` | 2,802 | 172 | Built, mostly translated | Mega-component: sidebar + 4 tabs |
| `/admin/dashboard` | `AdminDashboard.tsx` | 166 | 19 | Built, mostly translated | Admin metrics overview |
| `/admin/vendors` | `AdminVendors.tsx` | 317 | 56 | Built, mostly translated | Company verification panel |
| `/admin/join-requests` | `AdminJoinRequests.tsx` | 245 | 0 | Built, no i18n | Admin join request management |
| `/tenders/new` | `TenderCreateChoice.tsx` | ~200 | Full | Built, fully translated | AI vs Manual entry point |
| `/tenders/new/ai` | `TenderAICopilot.tsx` | 1,168 | 28 | Built, partial i18n | AI conversational tender builder |
| `/tenders/new/manual` | `TenderStartMethodStep.tsx` | 818 | Full | Built, fully translated | Template selection |
| `/tenders/new/title` | `TenderTitleStep.tsx` | ~200 | Full | Built, fully translated | Project title (Step 1) |
| `/tenders/new/project-scope` | `TenderProjectScopeStep.tsx` | 905 | Full | Built, fully translated | Scope/deliverables (Step 2) |
| `/tenders/new/ai-budget` | `TenderAIBudgetStep.tsx` | 524 | Full | Built, fully translated | Budget estimation (Step 3) |
| `/tenders/new/submission-process` | `TenderSubmissionProcessStep.tsx` | 552 | Full | Built, fully translated | Submission config (Step 4) |
| `/tenders/new/evaluation-criteria` | `TenderEvaluationCriteriaStep.tsx` | 637 | Full | Built, fully translated | Evaluation setup (Step 5) |
| `/tenders/new/vendor-requirements` | `TenderVendorRequirementsStep.tsx` | 314 | 0 | Built, no i18n | Vendor qualification checklist |
| `/tenders/new/brief` | `TenderBriefStep.tsx` | 885 | 88 | Built, partial i18n | Pre-publish summary |
| `/tenders/new/form-builder` | `TenderFormBuilder.tsx` | 341 | 6 | Built, minimal i18n | Drag-and-drop form editor |
| `/tenders/new/fill` | `TenderFormFill.tsx` | 344 | 0 | Built, no i18n | Vendor form preview/fill |
| `/tenders/new/review` | `TenderReview.tsx` | 747 | 16 | Built, minimal i18n | Final review + publish |
| `/invite/:id` | `TenderInviteLink.tsx` | 1,693 | 75 | Built, partial i18n | Public RFP view |
| `/tenders/:id/edit` | `TenderEditPage.tsx` | 1,276 | 32 | Built, partial i18n | Inline tender editing |
| `/tenders/:id` | `TenderDetails.tsx` | 1,545 | 0 | Built, no i18n | Internal tender detail view |
| `/traction/:slug` | `TractionLink.tsx` | 276 | 6 | Built, minimal i18n | Public vendor apply page |
| `/settings` | `Settings.tsx` | 798 | 70 | Built, translated | User/company settings |

### Orphan Pages (20 — NOT in router)

| File | Lines | Category | Description | Action Needed |
|------|-------|----------|-------------|---------------|
| `AdminAuditLogs.tsx` | ~200 | **Should route** | Admin audit log viewer — fully built | Add route `/admin/audit-logs` |
| `AdminAwards.tsx` | ~200 | **Should route** | Admin blocked awards panel — fully built | Add route `/admin/awards` |
| `AdminUsers.tsx` | ~200 | **Should route** | Admin user management/promotion — fully built | Add route `/admin/users` |
| `VendorInvitation.tsx` | 309 | **Should route** | Vendor invitation acceptance page — fully built | Add route `/invitation/:token` |
| `invitation-signup.tsx` | 398 | **Should route** | Sign up via invitation link — fully built | Add route `/invitation-signup` |
| `invitation-links.tsx` | ~200 | **Should route** | Manage invitation links — fully built | Add route, wire to dashboard |
| `VendorPreQualification.tsx` | 634 | **Should route** | Vendor pre-qualification form — fully built | Add route or embed in flow |
| `VendorStatus.tsx` | 204 | **Should route** | Vendor verification status view — fully built | Add route or embed |
| `not-found.tsx` | ~50 | **Should route** | 404 not found page | Add as default `<Route>` |
| `VendorsBase.tsx` | 507 | **Embedded** | Used inside Dashboard as tab content | Not orphan — works as imported component |
| `CreateTender.tsx` | 840 | **Legacy** | Old modal-based tender creation | Safe to delete |
| `RequesterProfile.tsx` | 458 | **Legacy** | Old role-based requester profile view | Safe to delete |
| `requester-dashboard.tsx` | 289 | **Legacy** | Old role-based requester dashboard | Safe to delete |
| `vendor-dashboard.tsx` | 171 | **Legacy** | Old vendor-specific dashboard | Safe to delete |
| `VendorOnboarding.tsx` | 775 | **Legacy** | Old role-based vendor onboarding | Safe to delete |
| `tender-edit.tsx` | 935 | **Legacy** | Old tender edit page (replaced by `TenderEditPage.tsx`) | Safe to delete |
| `TenderBudgetStep.tsx` | 459 | **Legacy** | Old budget step (replaced by `TenderAIBudgetStep.tsx`) | Safe to delete |
| `TenderDescriptionStep.tsx` | ~300 | **Legacy** | Old description step (folded into ProjectScope) | Safe to delete |
| `TenderScopeStep.tsx` | ~300 | **Legacy** | Old scope step (replaced by `TenderProjectScopeStep.tsx`) | Safe to delete |
| `TenderSkillsStep.tsx` | 517 | **Legacy** | Old skills step (folded into wizard) | Safe to delete |

**Summary**: 9 pages should be routed, 1 is already used as embedded component, 10 are legacy and can be deleted (~5,044 lines of dead code).

---

## 4. API & Backend (Detailed)

### All 55+ Endpoints

#### Auth Routes (3) — `server/routes.ts` lines 237-411
| Method | Path | Auth | Description | Validation |
|--------|------|------|-------------|------------|
| POST | `/api/auth/register` | None | Create user account | `registerUserSchema` (Zod) |
| POST | `/api/auth/login` | None | Login, returns JWT + companies | Email/password check |
| GET | `/api/auth/me` | JWT | Get current user + companies | Token verification |

#### User Profile Routes (3) — lines 418-515
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PATCH | `/api/user/profile` | JWT | Update name, job title, timezone, linkedin, phone |
| PATCH | `/api/user/tender-inquiry-email` | JWT | Save separate tender inquiry email |
| POST | `/api/user/profile-picture` | JWT | Upload profile picture to Object Storage |

#### Company Routes (6) — lines 518-885
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PATCH | `/api/company/profile` | JWT + Company (admin+) | Update display name, bio |
| POST | `/api/company/logo` | JWT + Company (admin+) | Upload company logo |
| POST | `/api/companies` | JWT | Create new company (user becomes owner) |
| POST | `/api/companies/switch/:companyId` | JWT | Switch active company (regenerates JWT) |
| GET | `/api/companies/:companyId/profile` | None | Get public company profile |
| PUT | `/api/companies/:companyId/profile` | JWT + Company (admin+) | Full company profile update (name, bio, legal info, traction slug, tags) |

#### Onboarding Routes (2) — lines 598-629
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/onboarding-tasks` | JWT + Company | Get 6-task completion status |
| POST | `/api/onboarding-tasks/settings-visited` | JWT | Log settings visit event |

#### Tender Routes (8) — lines 888-1322
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/tenders` | JWT + Company (admin+) | Create tender with auto-generated invitationToken + AI category suggestion |
| GET | `/api/tenders` | JWT + Company | List company's tenders with proposal counts |
| GET | `/api/tenders/:id` | JWT + Company | Get tender with proposal count (owner only) |
| GET | `/api/tenders/by-token/:token` | None | Look up tender by invitation token |
| GET | `/api/tenders/:id/invite` | None | Public tender view (resolves token or UUID) |
| PATCH | `/api/tenders/:id` | JWT + Company (admin+) | Update tender fields |
| PATCH | `/api/tenders/:id/status` | JWT + Company (admin+) | Change status (validated transitions) |
| DELETE | `/api/tenders/:id` | JWT + Company (admin+) | Delete tender |

#### Tender Q&A Routes (3) — lines 1089-1219
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/tenders/:id/questions` | Optional JWT | Get questions (owners see company names) |
| POST | `/api/tenders/:id/questions` | JWT | Post anonymous question (vendor) |
| PATCH | `/api/tenders/:id/questions/:qId/answer` | JWT + Company (admin+) | Answer a question (tender owner) |

#### AI Routes (2) — lines 1329-1466
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/ai/estimate-budget` | JWT | GPT-4o budget estimation (requires OPENAI_API_KEY) |
| POST | `/api/ai/suggest-category` | JWT | GPT-4o category suggestion from 15 categories |

#### AI Copilot Route (1) — `server/replit_integrations/copilot/index.ts`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/copilot/chat` | None | SSE streaming chat with GPT-4.1 (AI_INTEGRATIONS_OPENAI_API_KEY) |

#### Offer Routes (7) — lines 1473-1720
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/tenders/:id/offers` | JWT + Company | Submit proposal (deadline + duplicate + verification checks) |
| GET | `/api/tenders/:id/offers` | JWT + Company | Get proposals for tender (owner only) |
| GET | `/api/tenders/:id/my-offer` | JWT + Company | Check if company already submitted |
| GET | `/api/my-offers` | JWT + Company | List company's submitted proposals |
| GET | `/api/my-tenders/offers` | JWT + Company | Incoming proposals on company's tenders (with view status) |
| POST | `/api/offers/:offerId/view` | JWT + Company | Mark proposal as viewed |
| PATCH | `/api/offers/:offerId/status` | JWT + Company (admin+) | Accept/reject proposal |

#### Vendor Base Routes (1) — lines 1725-1770
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/vendors-base` | JWT + Company | List approved vendors with search |

#### Join Request Routes (4) — lines 1772-1895
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/join-requests` | JWT + Company | List join requests (by status filter) |
| GET | `/api/join-requests/pending-count` | JWT + Company | Count pending requests |
| POST | `/api/join-requests/:id/approve` | JWT + Company (admin+) | Approve + add to vendors_base |
| POST | `/api/join-requests/:id/reject` | JWT + Company (admin+) | Reject with reason |

#### Traction Link Routes (2) — lines 1897-1992
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/r/:slug` | None | Get company profile by traction slug |
| POST | `/api/r/:slug/apply` | JWT + Company | Apply to join vendor base |

#### Object Storage Routes (5) — lines 1995-2178
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/objects/profile-pictures/:filename` | None | Serve public profile pictures |
| GET | `/objects/company-logos/:filename` | None | Serve public company logos |
| POST | `/api/objects/upload` | JWT | Get presigned upload URL |
| GET | `/objects/:objectPath(*)` | JWT | Serve ACL-protected files (multi-layer access check) |
| PUT | `/api/objects/metadata` | JWT | Set file ACL policy after upload |

#### Admin Routes (9) — lines 2185-2314
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/metrics` | JWT + Admin | Dashboard metrics |
| GET | `/api/admin/companies/pending` | JWT + Admin | Pending verification list |
| POST | `/api/admin/companies/:id/verify` | JWT + Admin | Verify company + audit log |
| POST | `/api/admin/companies/:id/reject` | JWT + Admin | Reject + reason + audit log |
| GET | `/api/admin/join-requests` | JWT + Admin | All join requests |
| GET | `/api/admin/awards/blocked` | JWT + Admin | Blocked awards list |
| POST | `/api/admin/awards/:id/unblock` | JWT + Admin | Unblock award |
| GET | `/api/admin/audit-logs` | JWT + Admin | Audit log history |
| POST | `/api/admin/users/:id/promote` | JWT + Admin | Promote to admin + audit |

#### Template Routes (5) — lines 2321-2415
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/templates` | JWT + Company | Create form template |
| GET | `/api/templates` | JWT + Company | List company templates |
| GET | `/api/templates/:id` | JWT | Get template (public or owned) |
| PATCH | `/api/templates/:id` | JWT + Company | Update template |
| DELETE | `/api/templates/:id` | JWT + Company | Delete template |

#### Error Logging Routes (2) — lines 2423-2470
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/errors` | Optional JWT | Log client error |
| GET | `/api/admin/errors` | JWT + Admin | View error logs |

### Missing Backend Integrations
1. **SendGrid**: Package + integration installed, zero email code
2. **WebSocket**: `ws` package installed, no handlers registered
3. **Invitation creation endpoint**: No `POST /api/invitations` to create vendor invitations
4. **Award creation endpoint**: `storage.createAward()` exists but no route to call it
5. **Vendor removal from base**: `storage.removeVendorFromBase()` exists but no route

---

## 5. Database & Data Models (Detailed)

### All 16 Tables with Full Field Inventory

#### Core Tables (4)

**`users`** — User accounts
| Field | Type | Nullable | Default | Notes |
|-------|------|----------|---------|-------|
| id | varchar (PK) | No | `gen_random_uuid()` | UUID primary key |
| username | text (unique) | No | — | Login username |
| email | text (unique) | No | — | Login email |
| password | text | No | — | bcrypt hashed |
| name | text | No | — | Display name |
| isAdmin | boolean | No | false | Platform admin flag |
| profilePictureUrl | text | Yes | — | Object Storage URL |
| jobTitle | text | Yes | — | |
| timezone | text | Yes | — | |
| linkedinUrl | text | Yes | — | |
| phoneNumber | text | Yes | — | |
| tenderInquiryEmail | text | Yes | — | Custom inquiry email |
| createdAt | timestamp | No | now() | |

**`companies`** — Business entities
| Field | Type | Nullable | Default | Used in UI? |
|-------|------|----------|---------|------------|
| id | varchar (PK) | No | UUID | Yes |
| name | text | No | — | Yes |
| slug | text (unique) | No | — | Yes (URLs) |
| legalName | text | No | — | Yes (onboarding) |
| crNumber | text (unique) | No | — | Yes (onboarding) |
| vatNumber | text (unique) | Yes | — | Yes (onboarding) |
| city | text | Yes | — | Yes |
| category | text | Yes | — | Yes |
| certifications | jsonb (string[]) | Yes | [] | **No — unused** |
| documents | jsonb (object) | Yes | — | **No — unused** |
| verificationStatus | text | No | "not_verified" | Yes |
| onboardingState | text | No | "draft" | Yes |
| rejectionReason | text | Yes | — | Yes (admin) |
| deletedAt | timestamp | Yes | — | Soft delete |
| createdAt | timestamp | No | now() | Yes |
| updatedAt | timestamp | No | now() | Yes |

**`company_profiles`** — Public-facing company info
| Field | Type | Nullable | Default | Used in UI? |
|-------|------|----------|---------|------------|
| id | varchar (PK) | No | UUID | Yes |
| companyId | varchar (FK, unique) | No | — | Yes |
| displayName | text | No | — | Yes |
| bio | text | Yes | — | Yes |
| tags | jsonb (string[]) | Yes | [] | **No — unused** |
| logoUrl | text | Yes | — | Yes |
| headerUrl | text | Yes | — | Yes (invite page) |
| brochureUrl | text | Yes | — | **No — unused** |
| socialLinks | jsonb (object) | Yes | — | **No — unused** |
| isPublic | boolean | No | true | Yes |
| tractionSlug | text (unique) | Yes | — | Yes (traction link) |
| createdAt/updatedAt | timestamp | No | now() | |

**`user_companies`** — Many-to-many junction
| Field | Type | Notes |
|-------|------|-------|
| id | varchar (PK) | UUID |
| userId | varchar (FK → users) | |
| companyId | varchar (FK → companies) | |
| roleInCompany | text | 'owner' / 'admin' / 'member' / 'viewer' |
| invitedBy | varchar (FK → users, nullable) | **Referenced but no invite UI** |
| joinedAt | timestamp | |
| deletedAt | timestamp | Soft delete |

#### Domain Tables (8)

**`tenders`** — RFPs (35+ fields)
Key fields: id, companyId, createdBy, title, description, category, deadline, skills[], scope, budget/budgetRange/budgetMin/budgetMax, currency, projectSize, showPriceToVendors, pricingModel, milestones, duration, projectTimeline, startDate, endDate, status (draft/published/closed/cancelled), submissionType, videoRequired, inquiryType, whatsappContact, emailContact, evaluationCriteria (jsonb), objective, deliverables (jsonb array), vendorRequirements (jsonb array), voiceNoteUrl, videoUrl, attachments (jsonb array), formCards (jsonb), invitationToken (unique), allowConditionalSubmission, createdAt, updatedAt.

**`offers`** — Proposals submitted to tenders
Key fields: id, tenderId, companyId, createdBy, technicalFileUrl, financialFileUrl, combinedFileUrl, notes, quotePrice, videoUrl, conditionalSubmission, status (pending/accepted/rejected), decidedBy, decidedAt, submittedAt.

**`offer_views`** — Read tracking for proposals
Fields: id, offerId, viewerId, viewedAt.

**`invitations`** — Tender-specific vendor invitations (schema only, no sending logic)
Fields: id, tenderId, companyId (nullable), vendorEmail, vendorName, invitationToken (unique), status (pending/accepted/declined), invitedAt.

**`vendors_base`** — Approved vendor relationships
Fields: id, requesterCompanyId, vendorCompanyId, joinMethod (invitation/traction/tender_invite), addedBy, addedAt.

**`join_requests`** — Vendor applications to join vendor bases
Fields: id, requesterCompanyId, vendorCompanyId, createdBy, status (pending/approved/rejected), rejectionReason, decidedBy, decidedAt, createdAt.

**`invitation_links`** — Direct vendor invite links (schema only)
Fields: id, requesterCompanyId, tenderId, vendorEmail, token (unique), status (pending/accepted/expired), createdAt, acceptedAt.

**`awards`** — Tender awards (backend only, no frontend creation UI)
Fields: id, tenderId, companyId, offerId, status (pending/blocked/awarded), blockReason, awardedBy, awardedAt, createdAt.

#### Analytics Tables (4)

**`product_events`** — Append-only event log
Fields: id, eventType, companyId, userId, metadata (jsonb), createdAt.

**`tender_templates`** — Saved form structures
Fields: id, userId, companyId, name, description, cards (jsonb array of card configs), isPublic, createdAt, updatedAt.

**`audit_log`** — Admin action tracking
Fields: id, adminId, action, targetType, targetId, beforeState (JSON string), afterState (JSON string), notes, createdAt.

**`tender_questions`** — Q&A on tenders
Fields: id, tenderId, askedByUserId, askedByCompanyId, question, answer, answeredAt, createdAt.

**`error_logs`** — Error monitoring
Fields: id, userId, companyId, source (client/server), method, path, statusCode, errorMessage, stack, userAgent, metadata (jsonb), createdAt.

### Relations (All Properly Defined)
- users ↔ companies: many-to-many via `user_companies`
- companies → companyProfiles: one-to-one
- companies → tenders: one-to-many
- tenders → offers: one-to-many
- tenders → invitations: one-to-many
- tenders → awards: one-to-many
- companies → vendorsBase: many-to-many (requester ↔ vendor)
- companies → joinRequests: many-to-many (requester ↔ vendor)
- users → auditLog: one-to-many
- users → tenderTemplates: one-to-many

### Schema Health Assessment
- **All 16 tables**: Fully migrated and operational
- **All relations**: Properly defined with foreign keys
- **Validation schemas**: Created for all insert operations via `drizzle-zod`
- **Unused fields (5)**: `companies.certifications`, `companies.documents`, `company_profiles.brochureUrl`, `company_profiles.socialLinks`, `company_profiles.tags` — schema exists but no UI
- **No missing migrations**: All tables in sync with Drizzle schema
- **UUIDs**: All primary keys use `gen_random_uuid()` — consistent

---

## 6. Summary Table

| Feature | Status | i18n | Notes |
|---------|--------|------|-------|
| User Registration | Done | EN/AR | Zod validation, bcrypt hashing |
| User Login | Done | EN/AR | JWT with company context |
| Session Persistence | Done | — | Zustand + localStorage |
| User Profile Editing | Done | EN/AR | Name, job, timezone, linkedin, phone |
| Profile Picture Upload | Done | — | Object Storage, 5MB max |
| Company Creation | Done | Partial | 3-step onboarding wizard |
| Company Verification | Done | Partial | Admin approve/reject + audit |
| Company Profile | Done | EN/AR | Display name, bio, logo |
| Company Switching | Done | — | Regenerates JWT |
| Multi-Company Support | Done | — | Users can own/join multiple companies |
| Tender Creation (Choose Path) | Done | EN/AR | AI Copilot or Manual |
| Tender Template Selection | Done | EN/AR | Load saved templates |
| Step 1: Title | Done | EN/AR | Character limit, tips |
| Step 2: Project Scope | Done | EN/AR | Deliverables, timeline, milestones, voice note |
| Step 3: Budget | Done | EN/AR | AI estimation or manual |
| Step 4: Submission Process | Done | EN/AR | Deadline, type, Q&A method |
| Step 5: Evaluation Criteria | Done | EN/AR | Weights, requirements, presets |
| Vendor Requirements | Done | **No** | Hardcoded English |
| Tender Brief/Summary | Done | Partial | 88 t() calls but mixed |
| Form Builder (Drag & Drop) | Done | Minimal | 6 t() calls, mostly hardcoded |
| Form Fill (Vendor) | Done | **No** | Hardcoded English |
| Tender Review & Publish | Done | Minimal | 16 t() calls, mostly hardcoded |
| Published RFP Page | Done | Partial | 75 t() calls but has hardcoded strings |
| AI Copilot | Done | Partial | 28 t() calls, mostly hardcoded |
| AI Budget Estimation | Done | EN/AR | GPT-4o, SAR market rates |
| AI Category Suggestion | Done | — | 15 vendor categories |
| Proposal Submission | Done | Partial | Uppy uploads, 4 submission types |
| Proposal Review | Done | Partial | Accept/reject, file downloads |
| Vendors Base | Done | Partial | Search, add/remove |
| Traction Link | Done | Minimal | 6 t() calls, mostly hardcoded |
| Join Requests | Done | **No** | Dashboard tab, hardcoded |
| Tender Q&A | Done | Partial | Anonymous questions, owner answers |
| Tender Attachments | Done | — | Upload/download with ACL |
| Voice Notes | Done | — | Audio recording + playback |
| Tender Templates CRUD | Done | — | Save/load form configs |
| Tender Edit Page | Done | Partial | 32 t() calls |
| Tender Details (Internal) | Done | **No** | 1,545 lines, no i18n |
| Admin Dashboard | Done | Mostly | Metrics overview |
| Admin Company Verification | Done | Mostly | Approve/reject panel |
| Admin Join Requests | Done | **No** | Hardcoded English |
| Admin Audit Logs | Done | **No** | Built but **not routed** |
| Admin Awards | Done | **No** | Built but **not routed** |
| Admin Users | Done | **No** | Built but **not routed** |
| Admin Error Logs | Done | — | Backend only |
| Audit Logging | Done | — | Full before/after snapshots |
| Error Logging | Done | — | Client + server capture |
| Product Events | Done | — | Event-first analytics |
| Onboarding Tasks | Done | — | 6-task checklist |
| Landing Page | Done | **No** | 12 sections, all hardcoded English |
| Settings Page | Done | EN/AR | Profile + language + company |
| 404 Page | Done | **No** | Built but **not routed** |
| Offer View Tracking | Done | — | Read/unread badges |
| File ACL Security | Done | — | Multi-layer access checks |
| Status Transitions | Done | — | Validated state machine |
| i18n: Tender Flow | Done | EN/AR | 7 pages fully translated |
| i18n: Core App | Done | EN/AR | Auth, dashboard, settings, nav |
| i18n: Remaining Pages | **Partial** | — | ~23 pages need translation |
| Award System (Frontend) | **Partial** | — | Backend done, no "Award Winner" button |
| Vendor Invitation Flow | **Partial** | — | Tables + pages built, not routed, no email |
| Dark Mode | **Partial** | — | CSS vars exist, no toggle UI |
| Email Notifications | **Not Started** | — | SendGrid installed, zero code |
| WebSocket Real-time | **Not Started** | — | `ws` installed, zero code |
| Notification System | **Not Started** | — | No tables, no UI |
| Payment/Billing | **Not Started** | — | Nothing exists |
| Company Documents | **Not Started** | — | Schema fields exist, no UI |
| Company Certifications | **Not Started** | — | Schema field exists, no UI |
| Social Links Editing | **Not Started** | — | Schema field exists, no UI |
| Company Brochure | **Not Started** | — | Schema field exists, no UI |
| Company Tags | **Not Started** | — | Schema field exists, no UI |
| Password Reset | **Not Started** | — | No evidence |
| Team Member Invitations | **Not Started** | — | `invitedBy` field exists, no flow |

---

## 7. Recommended Priority Actions

### Quick Wins (< 1 hour each)
1. **Route 3 admin pages** (`AdminAuditLogs`, `AdminAwards`, `AdminUsers`) — just add `<Route>` entries
2. **Route `not-found.tsx`** as default/fallback route
3. **Delete 10 legacy files** (~5,044 lines of dead code)
4. **Route `VendorInvitation.tsx`** and `invitation-signup.tsx`

### Medium Priority (1-3 hours each)
5. **Add "Award Winner" button** to Dashboard proposals tab
6. **Build dark mode toggle** (ThemeProvider + Settings/navbar button)
7. **Complete i18n** for `TenderVendorRequirementsStep` (smallest untranslated routed page)
8. **Wire SendGrid** for critical notifications (proposal received, company verified)

### Larger Efforts (3+ hours each)
9. **Complete i18n** for all remaining pages (~23 pages, thousands of strings)
10. **Build vendor invitation email flow** (invitation creation UI + SendGrid delivery + acceptance)
11. **Build notification system** (table, WebSocket, bell icon, dropdown)
12. **Add company document upload** (VAT cert, GOSI, etc.) during onboarding
