# Needs you

Things the loop found that are a product or data decision rather than a layout
fix. The newest are at the bottom. Answer in chat, or edit this file.

**21 resolved, 1 in progress, 7 still need your answer** (#5, 17, 23, 24, 25, 26, 29).

1. **✅ The two case-duplicate production accounts - merged (2026-09-25).**
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

2. **✅ The stray dependency-update commit — resolved, no action needed.**
   Checked with `git log`: that commit only exists as a shared ancestor of
   both `main` and this branch (it landed on `main` before this branch was
   recreated from it). It won't show up as part of this branch's pull
   request — nothing to move.

3. **✅ "Better on desktop" popup on phones — resolved.** Added a "don't show
   this again" checkbox. Checking it and dismissing the popup once hides it
   for good on that device; it's still there for people who haven't seen it
   yet or didn't check the box.

4. **✅ Language switch on desktop — resolved.** Login and signup now show the
   AR/EN switch on desktop too, not just phones.

5. **Brand orange for small links — still open, no action taken.** `#FE3C01`
   on white is 3.6:1, below the 4.5:1 bar for small text ("Forgot password?",
   "Sign up", the password-strength word). You said you're not sure it
   matters — leaving it exactly as it is unless you want it revisited later.
   A slightly darker orange such as `#D93300` would pass (about 4.7:1).

6. **✅ "Feels like an installed app" — decided, no further action here.** You
   said the home-screen icon isn't the important part — the whole journey
   feeling native is what matters, which matches what batch 9 already plans
   to cover (see queue.md): per-page motion and interaction polish, done as
   its own pass once every page's Arabic/mobile layout is fixed. Global
   groundwork (icon, manifest, status-bar tint, press feedback, no tap flash)
   already shipped in batch 1 and stays as-is.

7. **✅ iPhone Safari is priority #1 — decided, no action needed.** You can't
   free up the disk space for a real iOS Simulator right now, so WebKit-via-
   Playwright (already the default for every check) stays the closest
   available proxy, plus your own real-iPhone check when you're ready to do
   one.

8. **✅ Team-invite desktop role dropdown — fixed.** "Business Developer" no
   longer truncates on desktop; widened the picker.

9. **✅ IndividualProfileEditor empty Field/Industry placeholder — fixed.** The
   real cause: `VENDOR_CATEGORIES` stores full display strings today (e.g.
   "Professional Services"), so any saved category that predates that
   wording — or comes from anywhere else using a different string — matched
   no dropdown option. The picker then showed neither the old value nor the
   placeholder, just a blank box, in both languages. It now falls back to the
   placeholder whenever the stored category isn't one of today's exact
   options.

10. **✅ Landing page Arabic font — resolved.** Ahmed prefers the app's font,
    so the landing and pricing pages now use IBM Plex Sans Arabic like every
    other screen (Latin text stays in Inter). Tajawal is no longer downloaded.

11. **✅ Cookie Policy page — done.** Ahmed asked for one. New page at
    `/cookies` (English + Arabic, laid out for phones), linked from both
    footers and from the Privacy and Terms pages. It lists every cookie and
    browser-storage key the app actually writes, checked against the code and
    against what bidapp.sa sets for a first-time visitor (two Clerk sign-in
    cookies; no advertising or third-party tracking cookies). Worth a quick
    read by whoever handles your legal pages before you rely on it.

12. **✅ Privacy Policy providers — fixed (2026-09-26).** Section 4 now names
    Supabase (database and file storage) and Vercel (hosting and website
    performance analytics) instead of Replit and Neon; date bumped to
    September 2026, English and Arabic.

13. **🟡 Developer docs (/docs) — Arabic version being built (Ahmed chose
    option B, 2026-09-26).** All prose, headings, tables and menus are
    translated. Code (cURL, Python, JSON and other snippets) stays exactly as
    in English so it can be copied and run. The docs follow the app's
    language, with an AR/EN switch in the docs header (and in the phone menu).

14. **✅ Privacy Policy doesn't mention the AI provider — Ahmed says no
    (2026-09-27).** Left as is; no change to the Privacy Policy.

15. **✅ AI-chat history: the trash icon deletes at once — fixed (2026-09-27,
    Ahmed said add a confirm).** Same confirm-dialog pattern as the RFP and
    vendor deletes: title, the chat's own title, "This can't be undone",
    Delete / Cancel. Verified in the phone window in Arabic.

16. **✅ Menus and dropdowns are left-to-right on Arabic pages, app-wide — fixed
    (2026-09-27, Ahmed said fix it).** The whole app is now wrapped in Radix's
    `DirectionProvider`, keyed to the current language. Verified in the phone
    window on a page no fixer had touched (Settings > timezone): the dropdown
    now opens right-aligned with the checkmark on the correct side. Re-ran
    batch 1 and batch 2's checks afterwards to confirm nothing moved (see
    queue.md).

17. **The app can sign someone out when the server hiccups.** While auditing, the
    server briefly answered 500 on the tender lists (against the dev database);
    the app then received a 403 "Invalid token" and logged the user out. A short
    server or database error should never end someone's session. Not a layout
    problem and `server/` is outside this audit, so I've left it. Worth a look on
    its own: it may only happen on the dev copy of the database.

18. **✅ Onboarding checklist opens the finished first step — Ahmed says leave it
    (2026-09-27).** No change.

19. **✅ RFP rows on phones: "tap the row + ... menu" — Ahmed says keep it
    (2026-09-27).** No change.

20. **✅ The tender list is slow on the server — fixed (2026-09-27, Ahmed said fix
    it).** `GET /api/tenders` now runs two grouped queries (one `GROUP BY` each
    for offer counts and invitation counts) instead of two per tender. Verified
    against the real dev server with Seet's 60 tenders: 0.4-1.0s, down from
    2-7s, and the totals still match what the Proposals tab shows (11 offers,
    1 invitation).

21. **✅ Red status text on dark backgrounds — fixed (2026-09-27, Ahmed said fix
    it).** `--state-lost` is now lightened in dark mode only (#E34C3B, 4.59:1);
    light mode unchanged. See the commit for the full explanation.

22. **✅ Proposals tab: small wording/product calls — Ahmed says leave desktop as
    is (2026-09-27).** None of (a)/(b)/(c) applied to desktop; phones keep their
    own wording and behaviour.

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

26. **Small server/data things — two fixed, one still open (2026-09-27, Ahmed
    said fix the translations).** "No category" and the accept/reject toasts are
    fixed; see the commit for the full explanation. Still open: one vendor logo
    is stored at a path that answers 401 to an image tag, so it shows the grey
    placeholder instead — a broken file reference, not a translation gap; want
    me to track down which vendor and fix the stored path?

27. **✅ A few audit states patch the page from the outside.** Three new vendor states
    (many, many-more, requests) fake extra data by replacing the browser's `fetch`
    and finding the app's data cache through React's internals. That's fine for
    photos, but it can break when React or the data library is upgraded; if those
    states start failing, that's the reason, not the page.


28. **✅ "Take a tour" link is 16px tall on desktop — fixed (2026-09-28, Ahmed
    said fix it).** Same `min-h-11` (44px) the phone version already had,
    now unconditional. Verified with the real capture harness across all 5
    pages it appears on: 0 fails.

29. **One shared menu component has no tap feedback yet.** `DropdownMenuItem`
    (`client/src/components/ui/dropdown-menu.tsx`, used by the workspace-switcher
    dropdown and others) has a focus style but no `active:` state — found during
    batch 9's press-feedback sweep. Left alone on purpose: it's a low-level shared
    piece used across many pages that haven't had their base pass yet (2b, 4-8),
    so fixing it now is outside batch 9's scope; worth a small dedicated pass once
    more of the app is through its base fix.


30. **Small grey and orange text on the cream pages is too faint (marketplace,
    2026-09-30).** The warm grey (#8A8078) and the orange (#FE3C01) on the cream
    background only reach about 3:1 to 3.9:1 contrast; small text should reach
    4.5:1. This is a brand-colour decision, so I left it. A darker grey (about
    #6B6259) and orange (about #D63300) for small text only would pass. It will
    show up on every page that uses the cream look. Want me to change the text
    colours (buttons and big headlines stay as they are)?

31. **Marketplace: Arabic wording check + grid toggle.** (a) The new Arabic
    strings (`marketplace.*` in `i18n.tsx`, plus seven city names in
    `category-labels.ts`) need a native-speaker glance; the "no results" title
    uses the everyday "ما فيه فرص تطابق بحثك", the formal alternative is "لا
    توجد فرص تطابق بحثك" (one string). (b) The list/grid toggle is now hidden
    on phones, because the phone layout is always one column; say if you want
    a two-column phone grid instead. (c) Any new city added to the filter list
    needs a matching Arabic name in `CITY_AR`.
