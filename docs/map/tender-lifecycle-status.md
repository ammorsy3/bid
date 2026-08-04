# Index: tender lifecycle status

Greppable index, not documentation.

## Status values

`shared/schema.ts:301` — `status: text("status").notNull().default("draft")`
with comment `'draft', 'published', 'closed', 'cancelled'`.

No enum, no CHECK constraint — but unlike `offers`, there **is** a real state
machine on the write path.

| Value | Documented | Reachable | In production |
|---|---|---|---|
| `draft` | yes | yes | 0 |
| `published` | yes | yes | 9 |
| `closed` | yes | yes | 74 |
| `cancelled` | yes | yes | 0 |
| `awarded` | no | **never set on tenders** | 0 |

**`awarded` is not a tender status.** All four `'awarded'` references in the
codebase are on the `awards` table (`storage.ts:1792`, `:2757`, `routes.ts:5474`)
or a `joinMethod` label (`routes.ts:5485`). No code sets `tenders.status =
'awarded'` and no client checks for it. Awarding is tracked by an `awards` row,
not by the tender's status.

## The state machine

`server/routes.ts:3933-3944` — `PATCH /api/tenders/:id/status`:

```
draft     → published | cancelled
published → draft | closed | cancelled
closed    → (terminal)
cancelled → (terminal)
```

Invalid transitions return 400 with `Cannot transition from X to Y`. This is the
only status endpoint.

## Writes that bypass the state machine

Two, both legitimate — auto-close when the deadline passes, and
`published → closed` is a valid transition anyway:

- `server/storage.ts:1078-1081` — on single-tender read
- `server/storage.ts:1159-1163` — batch, on list read

Plus `server/lib/launch-tender.ts:99` sets `status: "published"` at creation,
skipping `draft` entirely — the wizard publishes directly.

## Where status is read

- `client/src/pages/Dashboard.tsx:864-870` — `getStatusBadge`, translated as of 2026-08-03
- `client/src/pages/Dashboard.tsx:542` — filter tabs `all | published | draft | closed`  (**no `cancelled`**)
- `client/src/pages/Dashboard.tsx:2413` — edit allowed for `['draft','published']`
- `client/src/components/InviteToTenderModal.tsx:76` — `status === 'published'` only
- `server/routes.ts:3295` — invite gate, published only
- `server/routes.ts:4838` — offer submission requires `published`
- `server/routes.ts:3819` — edit allowed for `['draft','published']`
- `server/storage.ts:2743-2747` — marketplace listing requires `published` + approved + future deadline

## i18n

`dashboard.published` ✅ · `dashboard.draft` ✅ · `dashboard.closedLabel` ✅ ·
`tenderCard.cancelled` ✅ — all present in both locales.

## Email

`sendTenderStatusNotification` (`email.ts:671`) handles `published`, `closed`,
`cancelled`. No `draft` branch, which is correct — a draft is not announced.

## Tests

None cover tender status transitions.

---
Indexed at commit `d4b57fe`
