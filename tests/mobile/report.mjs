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

// Light markdown → HTML for decisions and per-page fix notes.
const md = (text) =>
  esc(text)
    .split(/\n{2,}/)
    .map((block) => {
      if (/^#{1,6} /.test(block)) {
        const level = Math.min(6, block.match(/^#+/)[0].length + 2);
        return `<h${level}>${block.replace(/^#+ /, "")}</h${level}>`;
      }
      if (/^\s*[-*] /m.test(block)) return `<ul>${block.split(/\n/).filter(Boolean).map((l) => `<li>${l.replace(/^\s*[-*] /, "")}</li>`).join("")}</ul>`;
      if (/^\s*\d+\. /m.test(block)) return `<ol>${block.split(/\n/).filter(Boolean).map((l) => `<li>${l.replace(/^\s*\d+\. /, "")}</li>`).join("")}</ol>`;
      return `<p>${block.replace(/\n/g, "<br>")}</p>`;
    })
    .join("")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
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
  const notes = readIf(path.join(dir, "pages", page, "result.md"));
  body += `<section class="page" id="page-${esc(page)}"><h2>${esc(page)}</h2>${notes ? `<div class="notes">${md(notes)}</div>` : ""}`;
  for (const s of states.filter((x) => x.page === page)) {
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
  body += `</section>`;
}

const totalRows = PROJECTS.filter((p) => totals[p])
  .map((p) => `<tr><td>${esc(PROJECT_LABELS[p])}</td><td>${totals[p].before ? totals[p].before.fails : "–"}</td><td>${totals[p].after ? totals[p].after.fails : "–"}</td><td>${totals[p].after ? totals[p].after.warns : "–"}</td></tr>`)
  .join("");
const decisions = readIf(path.join(ROOT, "docs", "mobile-audit", "decisions.md"));
const nav = pages.map((p) => `<a href="#page-${esc(p)}">${esc(p)}</a>`).join("");

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
</style>
</head>
<body>
<main>
<h1>Mobile + Arabic report — ${esc(batch)}</h1>
<p class="lead">Every screen, photographed before and after the fixes, on phones in Arabic and English. Built ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC. Photos show sample (made-up) accounts only.</p>
<table><thead><tr><th>Phone</th><th>Fails before</th><th>Fails after</th><th>Warnings after</th></tr></thead><tbody>${totalRows}</tbody></table>
${decisions ? `<h2>Needs you</h2><div class="decisions">${md(decisions)}</div>` : ""}
<nav>${nav}</nav>
${body}
</main>
</body>
</html>`;

const out = path.join(dir, "report.html");
fs.writeFileSync(out, html);
console.log(`Report: ${path.relative(ROOT, out)} (${states.length} screen states, ${pages.length} pages)`);
