# Vendor-Side Negotiation Experience — Implementation Spec

This document describes the vendor-side experience for the negotiation & award phase, intended for future implementation.

---

## 1. Vendor Notification System

### New `notifications` table

```sql
CREATE TABLE notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  company_id VARCHAR NOT NULL REFERENCES companies(id),
  type TEXT NOT NULL, -- 'resubmission_request', 'discount_request', 'award', 'rejection', 'free_message'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB, -- { actionId, tenderId, offerId, ... }
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

### Behavior
- When a negotiation action is created (requester-side), auto-insert a notification for **each user** in the target vendor company.
- API endpoints:
  - `GET /api/notifications` — paginated, ordered by `created_at DESC`
  - `PATCH /api/notifications/:id/read` — mark as read
  - `GET /api/notifications/unread-count` — returns `{ count: number }`

---

## 2. Vendor Dashboard Changes

- **Notification bell icon** in the header navbar, with unread count badge (red dot/number).
- **Notification dropdown** showing the 5 most recent notifications, with "View all" link.
- Each notification links to the relevant tender/offer page.

---

## 3. Vendor Tender Page Changes

When a vendor views a tender they've submitted an offer for:

### Resubmission Requested
- Show banner: "Resubmission Requested" with the requester's message.
- "Resubmit Proposal" button opens the `SubmitOfferModal`.
- The offer form is pre-filled with the vendor's previous submission data.

### Discount Requested
- Show banner: "Discount Requested" with message and requested percentage.
- "Submit Revised Price" flow — simplified re-submission that only modifies pricing.

### Awarded
- Show prominent "You've been awarded!" banner with the award message.
- Visual celebration (confetti or similar).

### Rejected
- Show "Not selected" banner with the rejection message.
- Respectful, non-prominent styling.

### Free Message Received
- Show in a "Messages" section on the tender page.
- Simple chronological list of messages from the requester.

---

## 4. Email Integration (SendGrid)

- Each negotiation action triggers an email via SendGrid.
- **Email templates per action type**, personalized with:
  - Vendor company name
  - Tender title and RFP ID
  - Requester org name
  - Action-specific content (message, discount %, etc.)
- Sent from: `notifications@bid.sa`
- Include "View in Bid" CTA button linking to the relevant page.
- Respect vendor's email preferences (future: notification settings page).

---

## 5. Resubmission Flow (Vendor Side)

1. Vendor sees the tender page with a "Resubmit" button (visible when `resubmissionAllowed === true`).
2. Opens the same `SubmitOfferModal` but pre-filled with their previous submission.
3. On submit:
   - Old offer status set to `'superseded'`
   - New offer created with fresh data
   - The `resubmissionAllowed` flag is reset to `false` after submission

---

## 6. Data Model References

- **`negotiation_actions` table**: see `shared/schema.ts`
- **`offers.resubmission_allowed`** field: boolean flag, set to `true` by requester's resubmission request
- **Offer statuses**: `'pending'`, `'accepted'`, `'rejected'`, `'superseded'`
- **API endpoints** (already built):
  - `POST /api/tenders/:tenderId/negotiation-actions` — create actions (requester only)
  - `GET /api/tenders/:tenderId/negotiation-actions` — list actions (requester only; vendor endpoint TBD)
  - `GET /api/offers/:offerId/contact-info` — get vendor contact details (requester only)
