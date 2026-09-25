# Needs you

Things the loop found that are a product or data decision rather than a layout
fix. The newest are at the bottom. Answer in chat, or edit this file.

1. **Two production accounts differ only by capital letters in the email —
   wait before merging, they may not be the same person.** You asked to merge
   them since it's "probably one person with two accounts." I looked before
   touching anything, and found a mismatch worth flagging first:
   - `Xakamsx@gmail.com` — name saved as **"ahmed"**, is an admin, never
     logged in, owns nothing, belongs to no company.
   - `xakamsx@gmail.com` — name saved as **"Abdulrahman"**, not an admin,
     never logged in, but **is a member of one company**.

   Different names on the two accounts. It's possible "ahmed" is your own
   old test/admin account and "Abdulrahman" is a real teammate who happens to
   share a similar-looking email — in which case merging would fold a real
   person's membership into an unrelated admin account, which I can't undo
   once their old account is gone. Please confirm these two really are the
   same human (and if so, which one should survive) before I merge anything.
   I have a script ready (modeled on `scripts/merge-databases.mjs`) that does
   a dry run first and shows exactly what would move.

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
