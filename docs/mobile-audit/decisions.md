# Needs you

Things the loop found that are a product or data decision rather than a layout
fix. The newest are at the bottom. Answer in chat, or edit this file.

1. **Two production accounts differ only by capital letters in the email.**
   Login now matches emails whatever the capitals, but for this one pair it
   keeps today's behaviour: the exact spelling wins. It is probably one person
   with two accounts. Merge them later, or leave as is?

2. **A dependency-update commit landed on this branch by accident**
   ("Apply the 54 grouped dependency updates", from another Claude session
   working in the same folder). Keep it in this PR, or move it to `main` first?

3. **"Better on desktop" popup on phones.** After the fix it only appears right
   after a real sign-in on a phone, never over the login form. Now that the
   mobile screens are being polished, do you still want it at all?

4. **Language switch on desktop.** Login and signup now have an AR/EN switch.
   It is hidden on desktop so desktop stays exactly as it was. Show it there too?
   (One class to remove on each page.)

5. **Brand orange for small links.** `#FE3C01` on white is 3.6:1, below the
   4.5:1 readability bar for small text ("Forgot password?", "Sign up", the
   password-strength word). A slightly darker orange such as `#D93300` would
   pass (about 4.7:1). That's an app-wide colour decision, so it wasn't changed.

6. **"Feels like an installed app" — decided.** Global groundwork (home-screen
   icon, manifest, status-bar tint, press feedback on every button, no tap
   flash) is done and shipped in batch 1. Per-page app-feel polish (custom
   motion, one-off controls) is deferred to a dedicated pass after every page
   has its Arabic/mobile layout fixed — added as batch 9 in queue.md.

7. **iPhone Safari is priority #1 — decided.** Every check and every fixer
   round now looks at `iphone-webkit` (Safari's engine) first, ahead of
   Android. There's no real iOS Simulator here (Xcode needs disk space this
   Mac doesn't have — 13 GB free), so WebKit-via-Playwright plus your own
   5-minute real-iPhone check (README.md) is the closest available proxy. If
   you free up ~20 GB and want the exact Simulator, say so and I'll set it up.

8. **Pre-existing desktop bug, not fixed (out of scope for this audit).** On
   /onboarding/team-invite, the role dropdown showing "Business Developer"
   truncates to "Business…" on desktop too — this was already true before
   any of this work started (same `sm:w-40` width). Fixing it would mean
   widening a desktop control, which this audit deliberately leaves alone
   (mobile + Arabic only, desktop pixels unchanged). Worth a quick separate
   fix whenever you're next in that file.

9. **Pre-existing, not fixed: empty Field/Industry dropdown placeholder.**
   IndividualProfileEditor's specialization Select shows no placeholder text
   when nothing is chosen, in both languages — noticed while reviewing the
   onboarding pages, predates this audit, not touched. Worth a quick look
   next time you're in that file.
