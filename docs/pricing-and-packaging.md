# Pricing & Packaging

Status: **proposed, not yet enforced.** The `/pricing` page ships the story publicly; the
entitlement system that actually gates anything is not built yet. See §8.

**Page revision — credits kept low-profile (client call).** The public `/pricing` page still
shows the plan allowances (200 / 500 / pooled) and the free grant, but the standalone
**Credit Usage** cost table and the **Top-up packs** section have been pulled from the page,
along with the two credit-mechanics FAQ entries ("what happens when my credits run out",
"how do free credits refresh"). The credit model itself is unchanged — everything in §6 still
holds; it just isn't merchandised on the page. Billing terms on the page are now **Monthly
and Yearly only** (quarterly dropped). The free strip is one unlabelled list rather than a
requester / vendor / both split.

---

## 1. The one-sentence version

**Bid is SAR 79 or SAR 179 per user per month, and everything AI runs on credits.**

That sentence is the whole point. Every decision below exists to keep it sayable.

(The public page no longer *says* the credits half out loud — see the page-revision note
above — but the model is still built on it.)

---

## 2. The problem this model solves

The original notes contained a contradiction worth naming, because the model is built to
resolve it:

- *"unified price for vendors and requesters"*
- *"I don't want the vendor to not be able to submit an offer just because they don't have a subscription"*

If a vendor can always submit — the one thing a vendor comes to Bid to do — there is nothing
left to charge them a subscription for. A "unified price" would be a price most vendors never
pay, which makes it not really unified.

**The resolution: credits are the unified thing, not the subscription.**

One wallet. One currency. Both roles.

| | Requester spends credits on | Vendor spends credits on |
|---|---|---|
| Today | AI tender building, proposal analysis, smart ranking | Submitting proposals |
| Later | — | AI review of their own proposal before sending |

Same credit costs, same top-up packs, same upsell ladder. Now "unified for vendors and
requesters" is literally true, and no vendor is ever blocked by a *subscription* — only by
having spent their credits, which is a wall they walked into themselves and can clear with a
single top-up.

It also gives the free trial shape that was asked for: **limited by usage, not by time.**
Nothing expires on a calendar. A tyre-kicker who signs up and does nothing keeps their 100
credits forever; someone getting real value burns through them and pays. That is the correct
shape — it charges the people who are succeeding.

---

## 3. The three boxes

Free is deliberately **not** a box. The three-box technique works by moving someone from
"yes or no" to "which one", and a free box reintroduces the no. Free lives as a slim strip
underneath the three boxes, with its own "Start free" CTA. The closing CTA reads
*"3 tenders, no card required."*

|  | **Pro** | **Business** ← highlighted | **Enterprise** |
|---|---|---|---|
| **Base price** | SAR 79 /user/mo | SAR 179 /user/mo | Custom |
| | ~$21 | ~$48 | |
| **Credits/mo** | 200 | 500 | Pooled |
| Unlimited tenders | ✅ | ✅ | ✅ |
| Publish to the marketplace | ✅ | ✅ | ✅ |
| Vendors base | ✅ | ✅ | ✅ |
| Standardised proposal format | ✅ | ✅ | ✅ |
| AI tender builder | ✅ credits | ✅ credits | ✅ |
| Tender templates | ✅ | ✅ | ✅ |
| Vendor Q&A | ✅ | ✅ | ✅ |
| Traction link | ✅ | ✅ | ✅ |
| AI proposal analyser & ranking | — | ✅ credits | ✅ |
| Side-by-side comparison | — | ✅ | ✅ |
| Tender analytics | — | ⏳ | ✅ |
| API & integrations | — | ✅ | ✅ |
| SSO, SLA, dedicated support | — | — | ✅ |

⏳ = not built yet. Everything else on this table exists today — see §8.

### Every paid feature is requester-side

Worth stating plainly, because the page has to: apart from API access, nothing in Pro or
Business is bought by a vendor. A vendor's entire relationship with Bid is the free tier plus
credits. Exceptions in the feature lists carry a **Both** chip. The free strip lists its
inclusions as one unlabelled set rather than splitting them into requester / vendor columns —
the same person is often both, so the split created more confusion than it removed.

This is the honest version of the "unified price" idea. The price *list* is unified — one
page, one set of boxes — but the value is not symmetric, and pretending otherwise is what
made the earlier draft confusing to read.

### Why the middle box wins

Business is 2.27× the price of Pro for 2.5× the credits **plus** the entire AI evaluation
layer — analyser, 0–100 weighted scoring, side-by-side comparison, API access. Pro exists
mainly to make Business look obvious, not to be bought.

---

## 4. Billing terms

One base monthly rate per plan; each term discounts it. The page always shows the **effective
monthly rate** so the three plans stay comparable, with the billed total underneath.

| Term | Discount | Pro | Business |
|---|---|---|---|
| Monthly | — | SAR 79/mo | SAR 179/mo |
| Yearly | 20% | SAR 63/mo → SAR 756 per year | SAR 143/mo → SAR 1,716 per year |

Saving vs. paying monthly: Pro SAR 192/year; Business SAR 432/year. The yearly toggle
carries a *Save 20%* note so the trade is legible before anyone does arithmetic. Quarterly
was dropped — two options read cleaner than three, and the 10% middle tier wasn't pulling
its weight.

Rates are rounded to whole riyals, and the billed total is derived from the rounded rate —
so the number on the card always multiplies out exactly to what gets charged. No off-by-a-riyal
discrepancies between the headline and the invoice.

---

## 5. Free tier — the usage trial

The grant differs by what each role does, but the page presents it as **one unlabelled
list** — the same account is often requester and vendor at once, so splitting it into
columns added confusion. The underlying entitlements:

| Requester side | Vendor side | Shared |
|---|---|---|
| 3 published tenders (lifetime) | ~10 proposals a month | 100 credits every 30 days, balance capped at 200 |
| Private tenders only | Free company profile | |
| 1 seat | | |

Lifetime rather than concurrent on the tender count — a concurrent cap is a nuisance, a
lifetime cap is a decision point. The vendor's "~10 proposals a month" is not a separate
quota; it is simply what 100 credits buys at 10 credits a submission, stated in the units a
vendor actually thinks in.

**The governing rule: no gate ever fires mid-task.** A vendor with 4 credits left who opens
the submit modal gets told *before* they start writing, not after. A requester publishing
their 4th tender is told at the start of the wizard, not on the final publish click. Getting
this wrong is the single fastest way to make people hate a paywall.

### The regenerating credit grant

Free accounts get **100 credits every 30 days**, and the balance **caps at 200**. Spend 70
in month one and you start month two on 130; sit idle another month and you reach 200, where
it stops.

Three things this gets right:

- **Nobody is ever permanently stuck.** A free user who burns their credits is back in the
  product in 30 days rather than churning for good.
- **The cap prevents hoarding.** Without it, a patient user banks a year of credits and runs
  20 tender analyses for free. The ceiling means the only way to get more throughput is to pay.
- **It rewards activity, not patience.** Someone using the product hits the ceiling constantly
  and feels the limit; someone idle just sits at 200. The pressure lands on exactly the people
  getting value.

Implementation notes: grant on a **rolling 30-day anniversary from signup**, not the calendar
month — simpler, and it spreads the refill load instead of spiking on the 1st. Grant is
`min(balance + 100, 200)`, and the cap applies **only to free-tier grant credits** — purchased
credits sit outside it and never expire, or a user who tops up would have their paid credits
silently burned by the ceiling. That distinction has to exist in the ledger from day one.

### Caveat: don't apply the marketplace lock to free vendors

Gating **marketplace publishing** for free *requesters* is a good upsell — reach is the
valuable thing, and the money is on the requester side anyway.

Applying the same lock to free *vendors* is self-defeating. If free vendors can't see
marketplace tenders, then a requester who upgrades specifically to reach new suppliers is
publishing to a pool containing only *paid* vendors — a fraction of the market. That devalues
the exact feature they just paid for, and the landing page's own claim ("~38 new vendors per
tender") stops being true.

**Recommendation: free vendors browse and bid on the marketplace freely; free requesters
can't publish to it.** Same feature, gated on the side that captures the value.

---

## 6. Credits

> **Not on the public page.** As of the latest revision, neither the credit-cost table below
> nor the top-up packs appear on `/pricing` (client call — keep the page simple). Both still
> govern the product; they're just not merchandised. The plan allowances (§3) and the free
> grant (§5) are the only credit figures the page now shows.

### Costs

| Action | Credits | Who | Built? |
|---|---|---|---|
| Submit a proposal | **10** | Vendor | ✅ |
| AI Copilot — build a tender | **10** | Requester | ✅ `TenderAICopilot` |
| Analyse one proposal | **5** | Requester | ✅ `POST /api/ai/analyze-offer/:offerId` |
| Smart-rank a whole tender | **15** | Requester | ✅ `POST /api/ai/analyze-proposals/:tenderId` |
| AI budget estimate | **2** | Requester | ✅ `POST /api/ai/estimate-budget` |
| AI review my proposal | **5** | Vendor | ⏳ analysis is owner-only today |
| Automatic category tagging | **0** | Requester | ✅ — never charge |
| Publish a tender | **0** | Requester | ✅ — plan-limited, not credit-limited |

**Two rules that keep this fair:**

1. **Never charge for something the user didn't press a button for.** Category suggestion runs
   automatically on publish — it must stay free forever. The moment credits drain from an
   action nobody chose, people stop trusting the meter.
2. **Never charge twice for a retry.** If an AI call fails or returns garbage, refund
   automatically. Cheap to build, and it removes the main reason people rage about metered AI.

Note that `analyze-proposals` re-runs the whole tender from scratch (it deletes existing
analyses and clears cached requirements), so the 15-credit tender-wide charge must be
per-run, not per-proposal — otherwise a re-run silently costs a multiple of what the user
expects.

### Why publishing a tender is a plan limit, not a credit cost

"3 tenders free, then unlimited" is instantly understandable. "Publishing costs 30 credits"
forces mental arithmetic before someone knows if they even like the product. Structural
things get counted; consumable AI actions get metered.

### Top-up packs (the upsell)

| Pack | Price | Per credit |
|---|---|---|
| 100 credits | SAR 49 | 0.490 |
| 300 credits | SAR 139 | 0.463 |
| 1,000 credits | SAR 439 | 0.439 |

Plan credits work out at **0.395 SAR/credit on Pro** and **0.358 on Business**. Every top-up
pack is dearer than both, so a heavy top-up buyer always feels the pull toward upgrading —
which is the entire job of a top-up pack.

This was wrong in the first draft: Business bundled 500 credits for SAR 109 (0.218/credit)
while a 200-credit top-up cost SAR 79 (0.395). Subscription credits were being sold at nearly
half the top-up rate, and Pro's entire fee was exactly the price of its own credits, which
made every feature in the plan nominally free. Raising Business to SAR 179 and repricing the
packs fixes both.

**Expiry:** plan credits reset at the end of each billing period (use them or lose them —
this drives habit). **Purchased credits never expire.** That asymmetry is what justifies the
higher per-credit price and is the standard, defensible arrangement.

---

## 7. Currency

SAR is primary, USD is a secondary display line. The product is SAR-native throughout —
budgets, the Saudi market-rate tables in the AI budget estimator, CR/VAT/GOSI requirements —
and "SAR 179" reads far better to a Riyadh SMB than a converted dollar figure.

USD is display-only at a fixed 3.75 peg (the riyal is pegged, so no FX handling is needed).
**Billing always charges SAR.**

---

## 8. What is and isn't built

The first draft of this doc was wrong here. It trusted `docs/PROJECT_AUDIT.md`, which is
stale and still lists proposal analysis as "Not Started". Verified against the code:

| Thing | State |
|---|---|
| AI proposal analyser | ✅ Multi-agent pipeline, `analyzeOfferWithAI` |
| Smart ranking / scoring | ✅ `proposal_analyses.overallScore` (0–100 weighted) + per-criterion scores with justifications |
| Side-by-side comparison | ✅ `ProposalComparison.tsx` (1,050 lines), rendered at `tender-details.tsx:1968` |
| API & integrations | ✅ `SettingsIntegrations.tsx`, real API keys with scopes |
| Vendor self-review of a proposal | ⏳ analysis routes are tender-owner-only |
| Tender analytics | ⏳ only an admin verification funnel exists |
| **Entitlement enforcement** | ❌ nothing — every limit above is currently decorative |
| **Payment processor** | ❌ nothing — no Stripe/Tap/Moyasar |
| `plans`, `subscriptions`, `credit_ledger`, `usage_counters` | ❌ nothing |

**This materially changes the pricing story.** Business now has three of its four
differentiators live today, which is what makes SAR 179 defensible rather than a promise.
Only tender analytics is still marked "Coming soon" on the page.

For Saudi payments, Stripe support is limited locally — **Moyasar** or **Tap** are the usual
choices, and both handle mada, which matters for SMB conversion here.

`docs/PROJECT_AUDIT.md` should be corrected; it will keep misleading anyone who reads it.

---

## 9. Suggested build order

1. `plans` / `subscriptions` / `credit_ledger` / `usage_counters` in `shared/schema.ts`
2. `server/entitlements.ts` — one `can(user, action)` + `spend(user, action)` used everywhere,
   never inline checks scattered through routes
3. Gate the cheap things first: publish-tender count, AI copilot, budget estimate
4. Meter the analysis routes — the biggest real cost centre, and already built
5. Upgrade-prompt UI at the gates (pre-task, per the rule in §5)
6. Payment processor + real subscriptions
7. Vendor submission credits — **last**, so supply isn't choked while the marketplace is thin

---

## 10. Further levers worth considering

Not built, not decided — parked here so they aren't lost.

**1. Only refill credits for verified companies.** A regenerating free grant invites account
farming: a vendor spins up new accounts for 100 free credits each and never pays. The platform
already verifies companies against a CR number, so tie the 30-day refill to
`verificationStatus === 'verified'`. Unverified accounts keep their one-time 100 and stop
there. This kills the farm and pushes verification, which the marketplace wants anyway. **Do
this one before switching on the refill**, not after.

**2. Pay referrals in credits.** `settings.inviteFriend` ("Invite a Friend & Earn") already
exists in the i18n file with nothing behind it. Credits are the natural reward — they cost
margin rather than cash, and they pull the referrer back into the product to spend them. 100
credits per side on the referee's first published tender or first submitted proposal.

**3. "Powered by Bid" on free RFP pages.** Every published RFP link gets sent to vendors
outside the platform — it's already the product's widest-reaching surface. A small byline on
free-tier invite pages, removed on paid, turns each free user into distribution. Cheap to
build, and removing branding is a well-understood reason to upgrade.

**4. Notify at the credit ceiling.** When a free user sits at 200, tell them: credits stop
accruing there and they're leaving value unused. It's an honest message and a strong
re-engagement trigger — the user is being told to *use the thing*, not to buy.

**5. Grant credits for activation, not just time.** A one-off bonus (say 50) for completing
the profile and publishing a first tender ties the currency to the activation milestones that
actually predict retention.

**6. Consider capped rollover on paid plans.** "Use it or lose it" drives habit but generates
resentment and support tickets. Letting paid credits roll over up to one month's allowance
keeps most of the urgency while removing the sharpest complaint. Adds ledger complexity —
worth it only if the tickets actually materialise.

---

## 11. Open decisions

1. Business at SAR 179 (~$48) — or SAR 184 to land on exactly $49?
2. Free tier: 3 tenders **lifetime** (assumed) or 3 concurrent?
2b. Does the marketplace lock apply to free vendors, or only free requesters? (See §5 —
   strong recommendation for requesters-only.)
3. Tier names: Pro / Business / Enterprise, or revert to Tenderer / Sourcing Expert?
   (Note: *tenderer* means the **bidder** in procurement English, including in Saudi
   government tendering documents — it reads wrong as a buyer-side tier name.)
4. Vendor submission credits at launch, or hold until liquidity is better?
5. Do plan credits really expire monthly? (Recommended yes, but it generates support tickets.)
