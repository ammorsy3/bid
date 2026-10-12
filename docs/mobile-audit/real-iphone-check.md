# Real iPhone check (about 5 minutes)

What this is: you open Bid on your own iPhone, over your home Wi-Fi, and tap through a few screens.
The test browsers on the Mac are a very close copy of Safari, but only a real phone can show some things
(see the list at the bottom).

**One thing that changed:** your Mac's port 5000 is taken by macOS ("AirPlay Receiver"). When I tested
`http://192.168.1.125:5000/login` it answered "403 Forbidden", which is not Bid. So use port **5137**
(the audit server). It also has email switched off, so nobody can be emailed by accident.

## Before you start (on the Mac)
1. Make sure the Mac and the iPhone are on the **same Wi-Fi** (not the iPhone's mobile data).
2. Open Terminal and start the audit server:
   ```
   cd /Users/ahmedfarag/bid/bid && bash tests/mobile/serve.sh
   ```
   Leave that window open. Wait until you see "serving on port 5137".
   (If it says the port is in use, the server is already running: that is fine, go on.)
3. Find your Mac's Wi-Fi address. In a second Terminal tab type:
   ```
   ipconfig getifaddr en0
   ```
   It prints something like `192.168.1.125`. Call that **MAC-IP**. It can change after a restart, so read it again each time.

## Part 1: open it in Safari (2 minutes)
1. On the iPhone, open **Safari** (the compass icon).
2. Tap the address bar and type `http://MAC-IP:5137/login` (use your real number), then tap **Go**.
3. You should see the Bid sign-in page. Check these four things:
   - The page fits the screen. You cannot slide it left or right.
   - Tap the **Email** box. The keyboard opens and the page does **not** zoom in.
   - Tap the **AR** button at the top. The page flips to Arabic, right-to-left, and the arrow icons point the other way.
   - Turn the iPhone sideways and back. Nothing breaks.
4. Open these four in the same way (type the address, tap Go) and just look and scroll:
   - `http://MAC-IP:5137/` (the marketplace)
   - `http://MAC-IP:5137/pricing`
   - `http://MAC-IP:5137/docs/mcp`
   - `http://MAC-IP:5137/invite/demo-tender` will say "not found" on this server; that is fine, skip it.
5. Don't sign up and don't press Pay. Google, LinkedIn and Slack sign-in will not work on a home-network address (they need the real `bidapp.sa` address); that is expected, not a bug.

## Part 2: open it from a WhatsApp message (2 minutes)
1. On the Mac, send yourself the link: in WhatsApp on your phone, open a chat with yourself (or any chat you don't mind) and send `http://MAC-IP:5137/login`.
2. Tap the link in the message.
3. WhatsApp hands links to Safari, so it should open the same sign-in page. Check:
   - It opens, with no "this link can't be opened" message.
   - The top bar and the bottom of the page are not hidden behind the iPhone's rounded corners or the home bar.
   - Tap **AR**, then press your browser's back arrow. You come back to WhatsApp, not to a blank page.
4. To check the in-app-browser note, open Instagram, paste the same link in a story reply or a message to yourself, and tap it. Above the Google button you should see a short note that Google sign-in needs Safari or Chrome.

## Part 3: only if you have a minute
1. In Safari tap the **Share** icon, then **Add to Home Screen**, then **Add**.
2. Open Bid from the new home-screen icon. It should open full-screen (no Safari address bar) with the Bid orange icon.

## What to tell me afterwards
Just write what looked wrong and on which page, for example "pricing, Arabic, the monthly/yearly switch is cut off". A photo helps. Press the side button and volume-up together for a screenshot.

---

## Screens only a real phone can prove
The Mac's test browsers cannot check these, so they are on your list, in order of importance:

| # | What | Where | What "right" looks like |
|---|---|---|---|
| 1 | The iPhone keyboard with sticky bars | Tender wizard (any step), tender edit page, the question box on an invite page, the submit-offer popup | Tapping a box does not zoom the page. The box you are typing in and the Save/Next button are both still visible above the keyboard. |
| 2 | The home bar gap | Vendor tender page bottom "Submit proposal" bar (open a tender as a vendor) | The button is not touching the iPhone's bottom line; there is a little space under it. |
| 3 | Safari's moving address bar | Any long page (marketplace, tender page) | When you scroll, the page does not jump or leave a blank strip at the bottom. |
| 4 | Real voice note | An invite page with a voice note (signed in) | The play button plays sound; the timeline moves. |
| 5 | Real file pick | Settings > company: upload a logo; submit-offer popup: attach a file | The iPhone offers Photos / Files / Camera and the chosen file shows. |
| 6 | Arabic dates in Safari | Any date on an Arabic page | Written like "2 أكتوبر 2026". Safari may add a comma; tell me if it looks odd. |
| 7 | Google / LinkedIn / Slack sign-in and the return to the invite | Live site `bidapp.sa` only (after this branch is deployed): open an invite link while signed out, sign in with Google | After signing in you land back on the same tender, not on the dashboard. |
| 8 | Dark mode | Turn on the iPhone's dark appearance (Settings > Display) and open the login and pricing pages | Text is readable; the Bid logo is visible. |
| 9 | Add to Home Screen | Part 3 above | Full-screen, right icon, status-bar colour matches the page. |
| 10 | Your CMF Phone (Android Chrome) | Repeat Part 1 steps 1-3 in Chrome on the CMF Phone | Same as Safari. Tell me its screen width in Settings if you want me to add it as a test profile. |
