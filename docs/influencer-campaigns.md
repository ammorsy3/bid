# Influencer campaigns

How we tag influencer traffic, and what the numbers in **Admin → Growth →
Campaigns** actually mean.

## The naming convention

Every link is built from four values. Three of them are fixed by the convention;
only `utm_campaign` is a judgement call.

| Parameter | Value | Example |
|---|---|---|
| `utm_source` | the platform, lowercase | `instagram` |
| `utm_medium` | always `influencer` | `influencer` |
| `utm_campaign` | the **push**, shared by everyone in it | `launch-2026-09` |
| `utm_content` | the **person**, their handle | `saraalharbi` |

The split between the last two is the part worth getting right:

- `utm_campaign` answers *"did the September launch work?"*
- `utm_content` answers *"which influencer made it work?"*

So everyone promoting the same thing at the same time shares one
`utm_campaign`, and is told apart by `utm_content`. Give each influencer their
own `utm_campaign` and you can never total the push; give them all the same
`utm_content` and you can never pay the right person.

Rules for both values: lowercase, hyphens, no spaces, no Arabic. They end up in
a URL and in reports, and analytics tools treat `Launch` and `launch` as two
different campaigns.

Suggested `utm_campaign` shape: `<what>-<year>-<month>` — `launch-2026-09`,
`ramadan-2027-02`, `contractors-2026-11`.

## What the influencer actually gets

A short link, not the long one:

```
https://bidapp.sa/r/saraalharbi-launch-2026-09
```

It 302-redirects to the full UTM URL. This matters for three reasons: it fits in
a bio, it survives being read aloud in a story, and **the destination stays
editable after they have posted it** — you can point the same link at a
different landing page next month without asking anyone to re-post.

Raw UTM links still work. Anyone who rebuilds a link by hand is still counted,
as long as the tags match a campaign — and if they don't match, the clicks show
up in the **Unmatched traffic** panel rather than vanishing, which is usually
how you find out someone typed `Launch_2026_09`.

## What gets counted

| Column | Meaning |
|---|---|
| Clicks | every arrival, deduplicated to one per visitor per 30 minutes |
| Visitors | distinct browsers |
| Signups | accounts created by someone who arrived through this campaign |
| Companies | of those, how many completed onboarding into a company |
| Verified | of those, how many got verified |
| Tenders | of those, how many went on to post a tender |

Each column counts **distinct users**, so the funnel can only ever narrow. The
last three are derived at read time from the real tables — they are not written
by the tracking code, so a user who signs up in September and creates their
company in November is counted correctly the moment they do it.

### Attribution rule: first touch, 90 days

Whoever sent a visitor here **first** gets the credit, for 90 days, even if the
visitor wanders off and returns through Google a week later. A second
influencer's click is still counted as a click, but cannot take the signup.

This is deliberately generous to the first influencer, and it is the number to
quote when negotiating: an influencer who "sends traffic that converts later"
is credited, not written off.

### What is not counted

- Someone who clears their browser storage between the click and the signup.
- Someone who clicks on their phone and signs up on their laptop.

Both undercount, never overcount. Treat the signup numbers as a floor.

## Cost per signup

Enter the fee when creating the campaign and the dashboard divides. It is only
as honest as the fees you enter — a campaign with a blank fee reads as free and
quietly flatters the average.

## Adding a campaign

Admin → Growth → Campaigns → **New campaign**. The form builds the code, the
short link and the UTM URL from what you type, and previews both before you
save. Send the influencer the short link and nothing else.

Statuses: **Active** while it is running, **Paused** to stop promoting it
without losing the numbers, **Ended** when it is over. A campaign that already
has traffic cannot be deleted — deleting it would erase where real users came
from — so end it instead.

## Operational notes

- `PUBLIC_APP_URL` should be set to `https://bidapp.sa` in production, so the
  links the admin page prints are always the branded domain rather than
  whichever host the request happened to arrive at.
- `/r/*` is routed to the server function in `vercel.json`. A new short-link
  prefix would need the same treatment.
- Visitor IDs are random strings a browser generates about itself, and IP
  addresses are stored only as salted hashes (PDPL). Neither identifies a
  person before that person chooses to create an account.
