# Needs you

Things the loop found that are a product or data decision rather than a layout
fix. The newest are at the bottom. Answer in chat, or edit this file.

1. **The two case-duplicate production accounts - merged (2026-09-25).**
   Ahmed confirmed they are the same person. In production
   (`PROD_DATABASE_URL`) the account `xakamsx@gmail.com` ("Abdulrahman", holds
   the company membership) is the one that survives, and it took over the
   admin flag. The other one (`Xakamsx@gmail.com`, "ahmed") owned and
   referenced nothing, so no data had to move. Its row was kept, not
   deleted: email renamed to `xakamsx+merged-e832e59f@gmail.com`, admin
   removed. No case-duplicate emails are left. Nothing else was touched, so
   undoing it is two updates: set user `e832e59f-…` back to email
   `Xakamsx@gmail.com` with `is_admin = true`, and set user `982f49b6-…`
   back to `is_admin = false`.

2. **The stray dependency-update commit — resolved, no action needed.**
   Checked with `git log`: that commit only exists as a shared ancestor of
   both `main` and this branch (it landed on `main` before this branch was
   recreated from it). It won't show up as part of this branch's pull
   request — nothing to move.

3. **"Better on desktop" popup on phones — resolved.** Added a "don't show
   this again" checkbox. Checking it and dismissing the popup once hides it
   for good on that device; it's still there for people who haven't seen it
   yet or didn't check the box.

4. **Language switch on desktop — resolved.** Login and signup now show the
   AR/EN switch on desktop too, not just phones.

5. **Brand orange for small links — still open, no action taken.** `#FE3C01`
   on white is 3.6:1, below the 4.5:1 bar for small text ("Forgot password?",
   "Sign up", the password-strength word). You said you're not sure it
   matters — leaving it exactly as it is unless you want it revisited later.
   A slightly darker orange such as `#D93300` would pass (about 4.7:1).

6. **"Feels like an installed app" — decided, no further action here.** You
   said the home-screen icon isn't the important part — the whole journey
   feeling native is what matters, which matches what batch 9 already plans
   to cover (see queue.md): per-page motion and interaction polish, done as
   its own pass once every page's Arabic/mobile layout is fixed. Global
   groundwork (icon, manifest, status-bar tint, press feedback, no tap flash)
   already shipped in batch 1 and stays as-is.

7. **iPhone Safari is priority #1 — decided, no action needed.** You can't
   free up the disk space for a real iOS Simulator right now, so WebKit-via-
   Playwright (already the default for every check) stays the closest
   available proxy, plus your own real-iPhone check when you're ready to do
   one.

8. **Team-invite desktop role dropdown — fixed.** "Business Developer" no
   longer truncates on desktop; widened the picker.

9. **IndividualProfileEditor empty Field/Industry placeholder — fixed.** The
   real cause: `VENDOR_CATEGORIES` stores full display strings today (e.g.
   "Professional Services"), so any saved category that predates that
   wording — or comes from anywhere else using a different string — matched
   no dropdown option. The picker then showed neither the old value nor the
   placeholder, just a blank box, in both languages. It now falls back to the
   placeholder whenever the stored category isn't one of today's exact
   options.

10. **Landing page Arabic font — resolved.** Ahmed prefers the app's font,
    so the landing and pricing pages now use IBM Plex Sans Arabic like every
    other screen (Latin text stays in Inter). Tajawal is no longer downloaded.

11. **Cookie Policy page — done.** Ahmed asked for one. New page at
    `/cookies` (English + Arabic, laid out for phones), linked from both
    footers and from the Privacy and Terms pages. It lists every cookie and
    browser-storage key the app actually writes, checked against the code and
    against what bidapp.sa sets for a first-time visitor (two Clerk sign-in
    cookies; no advertising or third-party tracking cookies). Worth a quick
    read by whoever handles your legal pages before you rely on it.

12. **Privacy Policy providers — fixed (2026-09-26).** Section 4 now names
    Supabase (database and file storage) and Vercel (hosting and website
    performance analytics) instead of Replit and Neon; date bumped to
    September 2026, English and Arabic.

13. **Developer docs (/docs) — Arabic version being built (Ahmed chose
    option B, 2026-09-26).** All prose, headings, tables and menus are
    translated. Code (cURL, Python, JSON and other snippets) stays exactly as
    in English so it can be copied and run. The docs follow the app's
    language, with an AR/EN switch in the docs header (and in the phone menu).

14. **Privacy Policy doesn't mention the AI provider.** The AI features
    (Copilot, AI chat, and the image/audio tools) send what people type, and
    likely tender text, to OpenAI (`server/ai/*`). Section 4 lists no AI
    provider, so this is a gap in what the policy discloses. I didn't add it
    without you. Want me to add OpenAI to the list of service providers, and
    a sentence about AI features (what's sent and whether it's used to train
    models)? That last part needs a fact from you or OpenAI's terms.

15. **AI-chat history: the trash icon deletes at once.** In the dashboard menu each
    saved AI chat has a trash icon that deletes it with no "are you sure" and no
    undo. On phones it is now always visible (before, it only showed on hover, which
    phones don't have), so an accidental tap is easier. Want a confirm dialog or an
    "Undo" toast? (Product call, not a layout fix.)

16. **Menus and dropdowns are left-to-right on Arabic pages, app-wide.** The app
    has no global text-direction setting for its dropdown/menu/tab components (Radix),
    so on Arabic pages they still lay out left-to-right. I only fixed the workspace
    list in the menu. A one-place fix would cover every page, but it touches every
    page, so I'd like your OK before doing it (I'd do it right after batch 3 and
    re-run all earlier batches to check nothing moved).

17. **The app can sign someone out when the server hiccups.** While auditing, the
    server briefly answered 500 on the tender lists (against the dev database);
    the app then received a 403 "Invalid token" and logged the user out. A short
    server or database error should never end someone's session. Not a layout
    problem and `server/` is outside this audit, so I've left it. Worth a look on
    its own: it may only happen on the dev copy of the database.

18. **Onboarding checklist opens the finished first step.** The "Get started" list
    always opens step 1, even when step 1 is done, so a finished company sees a
    "you're verified" line first instead of the next thing to do. Opening the
    first unfinished step needs a small change to how the list works, which also
    changes desktop. Want it?

19. **RFP rows on phones: buttons became "tap the row + ... menu".** On desktop each
    RFP row has View / Copy link / Edit / Delete buttons. On phones there wasn't
    room, so tapping the row opens it and a "..." menu holds Copy link, Edit and
    Delete (Delete asks to confirm in a sheet). Desktop is untouched and still uses
    the browser's own "are you sure" box. Say if you want the phone or desktop way
    changed.

20. **The tender list is slow on the server.** Loading "my RFPs" (`GET /api/tenders`
    in `server/routes.ts`) runs two database lookups per tender: 120 for Seet's 60
    tenders. It took 2-7 seconds during the audit (against the dev database) and
    twice failed with an error for about five minutes, which broke two photo runs.
    One combined lookup would fix it. Someone with many RFPs would notice this on
    their phone. Not a layout problem and `server/` is outside this audit, so I
    left it; want me to fix it as a separate task afterwards?

21. **Red status text on dark backgrounds is 3.52:1** (`components/brand/StatusDot.tsx`,
    e.g. the "Closed" pill in dark mode). Shared component, so I left it. It is
    the same kind of decision as the brand-orange one (#5).

22. **Proposals tab: small wording/product calls.** (a) On phones the vendor button
    says "Vendor profile"; on desktop it still says "View" (which in Arabic is the
    same word as "Proposal"). (b) Incoming offers that are still pending show no
    badge, on desktop too; a "Pending" badge might help buyers. (c) The empty-state
    buttons ("Explore Marketplace" / "Create RFP") were added on phones only.
    Say if any of these should apply on desktop as well.

23. **Arabic "days left" wording needs a native-speaker glance.** New phrases such as
    "يوم واحد متبقي", "يومان متبقيان", "أيام متبقية" replace an English-style count.
    Every deadline in the test data has already passed, so the photos never show
    them; the wording is grammatical but hasn't been seen on screen.

24. **Arabic dates show a comma in Safari (WebKit) but not Chrome** ("2 يونيو، 2026" vs
    "2 يونيو 2026"), because the browser formats it. Cosmetic; worth a look on a
    real iPhone, or we format it ourselves so both match.

25. **Vendors tab: product calls made on phones only.** (a) The app has no "add
    vendor / invite by email" dialog at all, only the joining link and approving
    requests; inviting by email would be a new feature. (b) On phones "View" is
    labelled "Vendor profile", the cards themselves aren't tappable, and the small
    filter chips are hidden. (c) The "Not verified" filter used to match nothing on
    every screen size; it now means "not verified", which includes "under review"
    and "rejected". Say if you want any of it different.

26. **Small server/data things on the Vendors tab.** `/api/vendors-base` sends the
    English word "No category" for vendors without one (`server/routes.ts` around
    line 5504), so an Arabic user sees English. One vendor logo is stored at a path
    that answers 401 to an image tag, so it shows the grey placeholder. And on the
    Proposals tab the accept/reject toasts are hard-coded English. All outside the
    layout work, so I've left them; want me to fix them as one small task?

27. **A few audit states patch the page from the outside.** Three new vendor states
    (many, many-more, requests) fake extra data by replacing the browser's `fetch`
    and finding the app's data cache through React's internals. That's fine for
    photos, but it can break when React or the data library is upgraded; if those
    states start failing, that's the reason, not the page.

