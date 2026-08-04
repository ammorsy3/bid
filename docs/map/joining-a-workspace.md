# Index: joining a workspace

Five tables cover what is really three distinct ideas. Greppable index, not documentation.

## The five tables and what each actually means

| Table | Real meaning | Direction |
|---|---|---|
| `team_invitations` | A workspace invites a **person** to become a member | workspace → person |
| `membership_requests` | A **person** asks to join a workspace | person → workspace |
| `join_requests` | A **vendor company** asks to join another company's Vendors Base | company → company |
| `invitations` | A requester invites a **company/individual** to bid on one tender | company → vendor, per tender |
| `invitation_links` | (intended) tokenised email invite to a tender | **dead — see below** |

The first two are workspace membership. The third is a vendor-base relationship,
not membership at all. The fourth is per-tender. So "five tables for two ideas"
is not quite right — they are three ideas plus one duplicate plus one corpse.

## Schema

- `shared/schema.ts:490-501` — `invitations`; `status` default `'pending'`, comment `'pending','accepted','declined'`
- `shared/schema.ts:518-537` — `joinRequests`; `status` default `'pending'`, `rejectionReason`, `decidedBy`, `decidedAt`; legacy `requesterId` at `:532`
- `shared/schema.ts:539-553` — `membershipRequests`; comment `'pending' | 'approved' | 'denied'`
- `shared/schema.ts:567-579` — `teamInvitations`; `role` comment `'admin','member','viewer'` (**no `business_developer`** — see F-04), `expiresAt` NOT NULL, `status` `'pending','accepted','expired'`
- `shared/schema.ts:581-592` — `invitationLinks`; `token` unique, `status` `'pending','accepted','expired'`

**Vocabulary drift across the three approval flows:**
`join_requests` uses `rejectionReason` / rejected · `membership_requests` uses
`decisionReason` / denied · `awards` uses approved/rejected. Three words for one act.

## Routes (`server/routes.ts`)

| Line | Route | Table |
|---|---|---|
| 1665 | `GET /api/onboarding/pending-invitations` | team_invitations |
| 1723 | `POST /api/companies/:id/membership-requests` | membership_requests |
| 1786 | `GET /api/companies/:id/membership-requests` | membership_requests |
| 1807 | `PATCH /api/companies/:id/membership-requests/:reqId/decide` | membership_requests |
| 1869 | `GET /api/users/me/membership-requests` | membership_requests |
| 2231 | `POST /api/companies/:id/invite-team` | team_invitations |
| 2327 | `GET /api/team-invitations/:token` | team_invitations |
| 2358 | `POST /api/team-invitations/:token/accept` | team_invitations |
| 2624 | `POST /api/companies/join-by-code` | user_companies directly |
| 2684 / 2711 | `GET`/`POST /api/company/join-code[/regenerate]` | companies.join_code |
| 3311 | `POST /api/tenders/:id/invite-individual` | invitations |
| 3423 | `GET /api/my-invitations` | invitations |
| 3510 | `GET /api/tenders/:id/invite` | invitations |
| 5633-5837 | `/api/join-requests*` (list, count, approve, reject, profile) | join_requests |
| 6448-6472 | `/api/admin/join-requests*` | join_requests |

**No route anywhere reads or writes `invitation_links`.**

## Storage (`server/storage.ts`)

Method counts touching each table: `invitations` 4 · `joinRequests` 9 ·
`membershipRequests` 7 · `teamInvitations` 5 · **`invitationLinks` 0** (imported
at `:13`, never queried).

## Client

- `client/src/pages/team-invite.tsx` — routed `App.tsx:172` `/team-invite/:token`
- `client/src/pages/JoinByCode.tsx` — routed `App.tsx:135` `/join/:code`
- `client/src/components/JoinCodeCard.tsx` — Settings, company/team only
- `client/src/pages/onboarding/team-invite.tsx` — onboarding step
- `client/src/components/InviteToTenderModal.tsx` — per-tender invites
- `client/src/pages/AdminJoinRequests.tsx` — **not routed**
- `client/src/pages/invitation-links.tsx` — **not routed**
- `client/src/pages/invitation-signup.tsx` — **not routed**

## Email

`sendTeamInviteEmail` (`email.ts:1278`) · `sendJoinRequestNotification` (`:1096`) ·
`sendJoinRequestDecisionNotification` (`:1139`) · `sendMembershipRequestNotification`
(`:1336`) · `sendMembershipDecisionNotification` (`:1396`) ·
`sendTenderInvitationEmail` (`:1452`, added 2026-08-03)

No email exists for `invitation_links`.

## Production data (2026-08-04)

`invitations` 3 · `join_requests` 8 · `membership_requests` **0** ·
`team_invitations` 6 · `invitation_links` **0**

## Tests

None cover any joining flow.

---
Indexed at commit `d4b57fe`
