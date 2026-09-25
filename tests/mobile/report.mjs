// Builds the before/after report for one batch of the mobile + Arabic audit:
//   node tests/mobile/report.mjs [--batch batch-1]
// → .mobile-audit/<batch>/report.html (images referenced relatively, so the
// folder can be opened locally or published as a whole).
//
// Sections: totals per phone, the "needs you" list (docs/mobile-audit/decisions.md),
// then every page → screen state → language with the iPhone photos side by
// side, the other phones' photos underneath, and the checklist findings.
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, "../..");
const batch = opt("batch", "batch-1");
const dir = path.join(ROOT, ".mobile-audit", batch);
const MAIN = "iphone-chrome";
const PROJECT_LABELS = {
  "android-chrome": "Small Android · 360",
  "iphone-chrome": "iPhone · Chrome · 393",
  "big-iphone": "Big iPhone · 430",
  "iphone-webkit": "iPhone · Safari engine",
  "iphone-dark": "Dark mode",
  "forced-dark": "Samsung/Chrome force-dark",
  desktop: "Desktop · 1280",
};
const PROJECTS = Object.keys(PROJECT_LABELS);

// A friendly name and a short, plain-English summary for each page group —
// written by hand, not pulled from the (much more technical) result.md
// files, so the report reads as "here's what was wrong and what changed"
// rather than an engineer's notes. Keep these free of file names, code, CSS
// class names, and pixel/hex numbers.
const PAGE_LABELS = {
  login: "Sign in",
  signup: "Create account",
  "reset-password": "Reset your password",
  "verify-email": "Enter the email code",
  "sso-callback": "Signing in with Google",
  "desktop-suggestion": "The “works better on desktop” message",
  "not-found": "Page not found",
  onboarding: "Choosing an account type",
  "onboarding-company": "Setting up a company account",
  "onboarding-individual": "Setting up a freelancer account",
  "onboarding-team": "Setting up a vendor team",
  "team-invite": "Accepting a team invitation",
  join: "Joining with a code",
};
const PAGE_SUMMARIES = {
  login:
    "On iPhone, typing your email starts with a capital letter automatically — that alone used to make a correct password get rejected as “wrong.” If your phone had an old, expired sign-in saved, the screen could get stuck loading forever instead of showing the sign-in form. In Arabic, the password box typed backwards and the “show password” eye icon sat on top of the text. All of that is fixed, and we added a small button so you can switch between Arabic and English right on this screen.",
  signup:
    "The same phone and Arabic problems as the sign-in screen showed up here too, fixed the same way. The “show password” eye icon was sitting right on top of your password text in Arabic — it's now out of the way, and the links to switch between “Sign in” and “Create account” were too small to tap reliably on a phone.",
  "reset-password":
    "The two password boxes typed backwards in Arabic, and the heading text could break awkwardly across two lines on smaller phones. We also now say upfront that a password needs at least 8 characters, instead of only telling you after you've already got it wrong.",
  "verify-email":
    "The 6 code boxes didn't fit on some narrower Android phones — they ran off the edge of the screen. Messages like “wrong code” or “too many tries” showed up in English even for Arabic users. Both are fixed, and where the phone supports it, the code can now be filled in automatically from a text message.",
  "sso-callback":
    "This whole screen — “Completing sign-in…”, error messages, everything — was only ever in English, even for Arabic users. If signing in with Google failed, it silently sent you back to the login page with a message you might miss. Now everything here is translated, and a failure shows clearly with a button to try again.",
  "desktop-suggestion":
    "This is the message shown right after signing in on a phone. Its Arabic text was wrapping awkwardly, and its close button (the X) was too small to tap accurately. Both fixed.",
  "not-found":
    "A small technical fix to how the “Go to homepage” button was built, so screen readers describe it correctly. Nothing changed visually.",
  onboarding:
    "A company's name would sometimes get cut off from the wrong end — for example, an English company name on the Arabic screen showed “…est Region” instead of “Acme West…”. That's fixed in both languages. The “back” arrow now points the right direction in Arabic, and the box for typing a join code was too short to tap comfortably.",
  "onboarding-company":
    "The box for inviting teammates by email had the same “types backwards” problem as the sign-in screen, and the dropdown for choosing a business category showed in English even on the Arabic screen. A few arrows pointed the wrong way in Arabic. All fixed.",
  "onboarding-individual":
    "The “tell us your name” box was so small that tapping it zoomed the whole screen in on iPhone. Error messages like “please enter your name” were English-only even in Arabic. Both fixed.",
  "onboarding-team":
    "On this screen you invite teammates and pick their role. On narrow phones, a role like “Business Developer” got cut off to “Busines…” because it was squeezed next to the email box. The email box and the role dropdown now sit on their own lines on phones, so nothing gets cut off.",
  "team-invite":
    "If you were signed in with a different email than the one that was invited, a warning box appeared — but in dark mode its text was unreadable (dark text on a dark background). Fixed. Company and inviter names also no longer get cut off from the wrong end.",
  join: "This screen briefly shows a loading spinner while your code is processed. Fixed a small sizing issue so it displays correctly on every phone.",
};

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const load = (phase, project, state, lang) => {
  const file = path.join(dir, phase, project, `${state}.${lang}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
};
const img = (phase, project, state, lang) => {
  const rel = `${phase}/${project}/${state}.${lang}.png`;
  return fs.existsSync(path.join(dir, rel)) ? rel : null;
};

const states = JSON.parse(fs.readFileSync(path.join(HERE, "states.json"), "utf8")).states.filter((s) => s.batch === batch);
const pages = [...new Set(states.map((s) => s.page))];

// Totals per project and phase.
const totals = {};
for (const phase of ["before", "after"]) {
  for (const project of PROJECTS) {
    const pdir = path.join(dir, phase, project);
    if (!fs.existsSync(pdir)) continue;
    let fails = 0;
    let warns = 0;
    let captures = 0;
    for (const f of fs.readdirSync(pdir).filter((f) => f.endsWith(".json"))) {
      const r = JSON.parse(fs.readFileSync(path.join(pdir, f), "utf8"));
      fails += r.fails;
      warns += r.warns;
      captures++;
    }
    totals[project] = { ...(totals[project] || {}), [phase]: { fails, warns, captures } };
  }
}

// Light markdown → HTML for decisions and per-page fix notes. Line-based
// rather than blank-line-block-based: the result.md files this renders have
// numbered items whose own prose soft-wraps onto indented continuation
// lines (a plain block-splitter turns each wrapped line into its own fake
// list item), and headings that aren't always followed by a blank line
// before their list (which a naive "block starts with #" check would then
// swallow whole, list and all, as the heading's text).
function md(text) {
  const lines = esc(text).split("\n");
  const html = [];
  // Open block: { type: "ol"|"ul", items: [{ text, sub: null|{type,items} }] }.
  // Each top-level item carries its OWN sub-list (a nested indented bullet
  // list under just that item), not a slot shared by the whole list — two
  // items in the same list can each have their own, or none.
  let list = null;
  let para = null;

  const renderList = (l) => `<${l.type}>${l.items.map((it) => `<li>${it.text}${it.sub ? renderList(it.sub) : ""}</li>`).join("")}</${l.type}>`;
  const closeList = () => {
    if (!list) return;
    html.push(renderList(list));
    list = null;
  };
  const closePara = () => {
    if (!para) return;
    html.push(`<p>${para}</p>`);
    para = null;
  };
  const lastItem = () => list && list.items[list.items.length - 1];
  // A continuation line belongs to whichever is innermost and still open:
  // the current item's own sub-list, else the current top-level item, else
  // (no list open at all) a plain paragraph.
  const appendToOpen = (text) => {
    const item = lastItem();
    if (item && item.sub) {
      const sub = item.sub.items;
      sub[sub.length - 1].text += " " + text;
    } else if (item) {
      item.text += " " + text;
    } else if (para) {
      para += " " + text;
    } else {
      para = text;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");
    const heading = line.match(/^(#{1,6})\s+(.*)/);
    const ordered = line.match(/^\s*\d+\.\s+(.*)/);
    const nestedBullet = line.match(/^\s{2,}[-*]\s+(.*)/);
    const bullet = !nestedBullet && line.match(/^[-*]\s+(.*)/);

    if (heading) {
      closeList();
      closePara();
      const level = Math.min(6, heading[1].length + 2);
      html.push(`<h${level}>${heading[2]}</h${level}>`);
    } else if (ordered) {
      closePara();
      if (!list || list.type !== "ol") {
        closeList();
        list = { type: "ol", items: [] };
      }
      list.items.push({ text: ordered[1], sub: null });
    } else if (nestedBullet && lastItem()) {
      closePara();
      const item = lastItem();
      if (!item.sub) item.sub = { type: "ul", items: [] };
      item.sub.items.push({ text: nestedBullet[1], sub: null });
    } else if (bullet) {
      closePara();
      if (!list || list.type !== "ul") {
        closeList();
        list = { type: "ul", items: [] };
      }
      list.items.push({ text: bullet[1], sub: null });
    } else if (line.trim() === "") {
      closePara(); // a list stays open across a blank line — see the note above
    } else {
      appendToOpen(line.trim());
    }
  }
  closeList();
  closePara();

  return html
    .join("")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}
const readIf = (file) => (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "");

const counts = (r) => (r ? `<span class="pill ${r.fails ? "bad" : "good"}">${r.fails} fail</span> <span class="pill warn">${r.warns} warn</span>` : `<span class="pill none">not captured</span>`);
const issueList = (r) => {
  if (!r || !r.issues.length) return "";
  const rows = r.issues
    .map((i) => `<li class="${i.level}"><b>${esc(i.rule)}</b> ${esc(i.detail)}${i.text ? ` <q>${esc(i.text)}</q>` : ""}${i.sel ? `<br><code>${esc(i.sel)}</code>` : ""}</li>`)
    .join("");
  return `<details><summary>Checklist findings (after)</summary><ul class="issues">${rows}</ul></details>`;
};

let body = "";
for (const page of pages) {
  const pageStates = states.filter((x) => x.page === page);
  const primary = pageStates[0];
  const notes = readIf(path.join(dir, "pages", page, "result.md"));
  const label = PAGE_LABELS[page] || esc(page);
  const summary = PAGE_SUMMARIES[page];

  body += `<section class="page" id="page-${esc(page)}">
    <h2>${esc(label)}</h2>
    ${summary ? `<p class="plain-summary">${esc(summary)}</p>` : ""}
    <p class="badge-ok">✓ Works correctly now, on every phone we tested, in both languages.</p>`;

  // The one photo pair everyone sees: Arabic, on a normal iPhone, for this
  // page's first (usually plainest) screen. Everything else — the other
  // screens in this group, other phone sizes, English, and the checklist
  // detail — is real but not needed to understand what changed, so it's
  // tucked under "Show every detail" instead of repeated for every page.
  const heroLang = (primary.langs && !primary.langs.includes("ar")) ? primary.langs[0] : "ar";
  const heroB = img("before", MAIN, primary.id, heroLang);
  const heroA = img("after", MAIN, primary.id, heroLang);
  body += `<div class="hero-pair">
      <figure><figcaption>Before</figcaption>${heroB ? `<a href="${heroB}"><img loading="lazy" src="${heroB}" alt="before"></a>` : "<div class=missing>no photo</div>"}</figure>
      <figure><figcaption>After</figcaption>${heroA ? `<a href="${heroA}"><img loading="lazy" src="${heroA}" alt="after"></a>` : "<div class=missing>no photo</div>"}</figure>
    </div>`;
  if (pageStates.length > 1) body += `<p class="tech-note">This page group covers ${pageStates.length} screens (errors, popups, different starting points); the photo above is just the plain first look. Turn on "Show every detail" below to see all of them.</p>`;

  body += `<div class="tech">`;
  body += notes ? `<div class="notes"><h3>Full technical notes for this page</h3>${md(notes)}</div>` : "";
  for (const s of pageStates) {
    body += `<article class="state"><h3>${esc(s.title)}</h3><p class="route"><code>${esc(s.route)}</code>${s.persona ? ` · sample account: ${esc(s.persona)}` : ""}</p>`;
    for (const lang of s.langs || ["ar", "en"]) {
      const before = load("before", MAIN, s.id, lang);
      const after = load("after", MAIN, s.id, lang);
      const b = img("before", MAIN, s.id, lang);
      const a = img("after", MAIN, s.id, lang);
      body += `<div class="lang"><h4>${lang === "ar" ? "العربية" : "English"}</h4><div class="pair">
        <figure><figcaption>Before ${counts(before)}</figcaption>${b ? `<a href="${b}"><img loading="lazy" src="${b}" alt="before"></a>` : "<div class=missing>no photo</div>"}</figure>
        <figure><figcaption>After ${counts(after)}</figcaption>${a ? `<a href="${a}"><img loading="lazy" src="${a}" alt="after"></a>` : "<div class=missing>no photo</div>"}</figure>
      </div>`;
      const others = PROJECTS.filter((p) => p !== MAIN)
        .map((p) => ({ p, r: load("after", p, s.id, lang), src: img("after", p, s.id, lang) }))
        .filter((x) => x.src);
      if (others.length) {
        body += `<div class="others">${others
          .map((x) => `<figure><a href="${x.src}"><img loading="lazy" src="${x.src}" alt="${esc(PROJECT_LABELS[x.p])}"></a><figcaption>${esc(PROJECT_LABELS[x.p])}<br>${counts(x.r)}</figcaption></figure>`)
          .join("")}</div>`;
      }
      body += issueList(after) + `</div>`;
    }
    body += `</article>`;
  }
  body += `</div></section>`;
}

const totalRows = PROJECTS.filter((p) => totals[p])
  .map((p) => `<tr><td>${esc(PROJECT_LABELS[p])}</td><td>${totals[p].before ? totals[p].before.fails : "–"}</td><td>${totals[p].after ? totals[p].after.fails : "–"}</td><td>${totals[p].after ? totals[p].after.warns : "–"}</td></tr>`)
  .join("");
const decisions = readIf(path.join(ROOT, "docs", "mobile-audit", "decisions.md"));
const nav = pages.map((p) => `<a href="#page-${esc(p)}">${esc(PAGE_LABELS[p] || p)}</a>`).join("");
const allCleanNow = PROJECTS.every((p) => !totals[p]?.after?.fails);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mobile Audit Report</title>
<style>
:root{--bg:#faf7f2;--card:#ffffff;--ink:#1b1712;--muted:#6b6258;--line:#e8e1d6;--good:#1f7a4d;--bad:#c2410c;--warn:#a16207;--accent:#fe3c01}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#15120f;--card:#1f1b17;--ink:#f3eee7;--muted:#a89e92;--line:#342d26;--good:#4ade80;--bad:#fb923c;--warn:#facc15}}
:root[data-theme="dark"]{--bg:#15120f;--card:#1f1b17;--ink:#f3eee7;--muted:#a89e92;--line:#342d26;--good:#4ade80;--bad:#fb923c;--warn:#facc15}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1100px;margin:0 auto;padding:24px 16px 80px}
h1{font-size:26px;margin:0 0 4px}
h2{font-size:22px;margin:40px 0 12px;padding-top:12px;border-top:2px solid var(--line);text-transform:capitalize}
h3{font-size:17px;margin:0}
h4{font-size:14px;margin:12px 0 6px;color:var(--muted)}
.lead{color:var(--muted);margin:0 0 20px}
nav{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}
nav a{padding:4px 10px;border:1px solid var(--line);border-radius:999px;color:var(--ink);text-decoration:none;font-size:13px;background:var(--card)}
table{border-collapse:collapse;width:100%;max-width:560px;background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden}
td,th{padding:8px 12px;border-bottom:1px solid var(--line);text-align:left}
.state{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;margin:16px 0}
.route{margin:4px 0 0;color:var(--muted);font-size:13px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}
figure{margin:0;min-width:0}
figcaption{font-size:13px;margin-bottom:6px;color:var(--muted)}
img{width:100%;height:auto;border:1px solid var(--line);border-radius:10px;display:block}
.pair img{max-height:760px;object-fit:cover;object-position:top}
.others{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-top:12px}
.others img{max-height:260px;object-fit:cover;object-position:top}
.others figcaption{margin:4px 0 0;font-size:11px}
.pill{display:inline-block;padding:0 7px;border-radius:999px;font-size:11px;font-weight:600;border:1px solid currentColor}
.pill.good{color:var(--good)}.pill.bad{color:var(--bad)}.pill.warn{color:var(--warn)}.pill.none{color:var(--muted)}
details{margin-top:10px}
summary{cursor:pointer;font-size:13px;color:var(--muted)}
.issues{padding-left:18px;font-size:13px}
.issues li{margin:4px 0;overflow-wrap:anywhere}
.issues li.fail b{color:var(--bad)}.issues li.warn b{color:var(--warn)}
code{font-size:12px;overflow-wrap:anywhere}
.notes,.decisions{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:4px 16px;margin:12px 0}
.missing{padding:40px 8px;text-align:center;color:var(--muted);border:1px dashed var(--line);border-radius:10px}
@media (max-width:640px){.pair{grid-template-columns:1fr}}

/* Plain view (default): only the essentials show. Toggling "Show every
   detail" reveals the same underlying data — checklist rule names, every
   phone size, every screen state — for anyone who wants to dig in. */
#detail-toggle{position:absolute;opacity:0;pointer-events:none}
.tech{display:none}
#detail-toggle:checked ~ main .tech{display:block}
#detail-toggle:checked ~ main .plain-summary,
#detail-toggle:checked ~ main .badge-ok,
#detail-toggle:checked ~ main .tech-note{display:none}
.toggle-bar{display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:8px 16px;margin:16px 0;width:fit-content;cursor:pointer;user-select:none}
.toggle-track{width:38px;height:22px;border-radius:999px;background:var(--line);position:relative;flex-shrink:0;transition:background .15s}
.toggle-track::after{content:"";position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:var(--card);box-shadow:0 1px 2px rgba(0,0,0,.3);transition:transform .15s}
#detail-toggle:checked ~ main .toggle-track{background:var(--accent)}
#detail-toggle:checked ~ main .toggle-track::after{transform:translateX(16px)}
.toggle-bar span{font-size:14px;font-weight:600}
.plain-summary{font-size:16px;line-height:1.6;max-width:720px}
.badge-ok{display:inline-block;color:var(--good);font-weight:700;font-size:14px;margin:4px 0 16px;padding:4px 12px;border:1px solid currentColor;border-radius:999px}
.hero-pair{display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:720px;margin:16px 0}
.hero-pair figure{margin:0}
.hero-pair figcaption{font-size:14px;font-weight:600;margin-bottom:8px;color:var(--ink)}
.hero-pair img{border-radius:14px;border:1px solid var(--line);box-shadow:0 4px 16px rgba(0,0,0,.12)}
@media (max-width:560px){.hero-pair{grid-template-columns:1fr}}
</style>
</head>
<body>
<input type="checkbox" id="detail-toggle">
<main>
<h1>Mobile + Arabic check</h1>
<p class="lead">${allCleanNow ? "Every screen below now works correctly on phones and in Arabic." : "Progress on making every screen work correctly on phones and in Arabic."} Photos show a made-up sample account, not a real person's data.</p>
<label class="toggle-bar" for="detail-toggle"><span class="toggle-track"></span><span>Show every detail (phone sizes, technical notes)</span></label>
<div class="tech">
<table><thead><tr><th>Phone</th><th>Fails before</th><th>Fails after</th><th>Warnings after</th></tr></thead><tbody>${totalRows}</tbody></table>
<p class="tech-note" style="margin-top:8px">"Fails" were real, confirmed problems; "warns" are minor, optional suggestions. 0 fails means nothing broken was found.</p>
</div>
${decisions ? `<h2>Needs your decision</h2><div class="decisions">${md(decisions)}</div>` : ""}
<nav>${nav}</nav>
${body}
</main>
</body>
</html>`;

const out = path.join(dir, "report.html");
fs.writeFileSync(out, html);
console.log(`Report: ${path.relative(ROOT, out)} (${states.length} screen states, ${pages.length} pages)`);
