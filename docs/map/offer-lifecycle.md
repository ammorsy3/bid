# Index: offer / proposal lifecycle

Greppable index, not documentation.

## Aliasing — three names for one row

| Layer | Name |
|---|---|
| DB table | `offers` |
| Drizzle/TS | `offers`, `Offer`, `InsertOffer` |
| API paths | `/api/offers/*`, `/api/my-offers`, `/api/my-tenders/offers` |
| UI copy (EN) | **"Proposal"** — `dashboard.proposals`, "Submit Proposal", "Pending Proposals" |
| UI copy (AR) | عرض / العروض |
| Dashboard tab | `proposals` |
| Email | `sendNewOfferNotification`, `sendOfferDecisionNotification` |

The database says *offer*, every user-facing surface says *proposal*, and the
dashboard route is `/proposals` while the API is `/api/offers`. Consistent within
each layer, never across.

## Status values — documented vs real

`shared/schema.ts:408` — `status: text("status").notNull().default("pending")`
with comment `'pending', 'accepted', 'rejected', 'superseded'`.

**No enum, no CHECK constraint.** Any string is storable.

| Value | In schema comment | Accepted by API | In production |
|---|---|---|---|
| `pending` | yes | yes | 16 |
| `accepted` | yes | yes | 4 |
| `rejected` | yes | yes | 2 |
| **`shortlisted`** | **no** | **yes** | **1** |
| `superseded` | yes | no (server-set only) | 0 |

- API validation: `server/routes.ts:5117` — `['accepted','rejected','pending','shortlisted']`
- `superseded` is written only by `server/routes.ts:4911` when a vendor resubmits
- `shared/schema.ts:417` — partial unique index `where status != 'superseded'`, one live offer per (tender, user)

## Where status is read/written

- `server/routes.ts:5109-5140` — `PATCH /api/offers/:offerId/status`, the only status endpoint
- `server/routes.ts:4911` — supersede-on-resubmit
- `server/routes.ts:5494` — on award, other `pending` offers are notified
- `server/storage.ts` — `updateOfferStatus`, `getIncomingOffersByCompany`, `getOffersByCompany`
- `client/src/pages/Dashboard.tsx:177, 200` — TS union type **includes `shortlisted`, omits `superseded`**
- `client/src/pages/Dashboard.tsx:956-960, 2539, 2685, 3676-3725` — shortlist UI

## i18n

`dashboard.shortlisted` ✅ both locales · `accepted` ✅ · `rejected` ✅ ·
`pending` ✅ · **`superseded` — no key in either locale**

## Email

`sendNewOfferNotification` (`:339`) · `sendOfferDecisionNotification` (`:427`,
`outcome: 'accepted' | 'rejected'` — **no shortlisted branch**) ·
`sendAwardNotification` (`:483`) · `sendNegotiationActionNotification` (`:538`)

## Tests

None cover offer status transitions.

---
Indexed at commit `d4b57fe`
