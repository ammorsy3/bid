// Compact text summary of checklist results, for people and agents.
//
//   node tests/mobile/summary.mjs                      # batch-1, after, all projects
//   node tests/mobile/summary.mjs --phase before --project iphone-chrome
//   node tests/mobile/summary.mjs --page login --details   # every issue line
//   node tests/mobile/summary.mjs --states login,signup-errors
//   node tests/mobile/summary.mjs --missing            # requests the guard had no fixture for
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const batch = opt("batch", "batch-1");
const phase = opt("phase", "after");
const onlyProject = opt("project", null);
const onlyPage = opt("page", null);
const onlyState = opt("state", null);
// --states takes a comma list of state ids or page names (what run.mjs passes on).
const onlyStates = (opt("states", "") || "").split(",").filter(Boolean);
const dir = path.join(ROOT, ".mobile-audit", batch, phase);

if (flag("missing")) {
  const logFile = path.join(ROOT, ".mobile-audit", "guard-log.jsonl");
  const lines = fs.existsSync(logFile) ? fs.readFileSync(logFile, "utf8").trim().split("\n") : [];
  const missing = new Map();
  for (const line of lines) {
    const e = JSON.parse(line);
    if (e.via !== "MISSING-FIXTURE") continue;
    const key = `${e.method} ${e.path.split("?")[0]}`;
    missing.set(key, (missing.get(key) || new Set()).add(e.state || "?"));
  }
  if (!missing.size) console.log("No missing fixtures in the guard log.");
  for (const [key, states] of missing) console.log(`${key}   (states: ${[...states].join(", ")})`);
  process.exit(0);
}

if (!fs.existsSync(dir)) {
  console.log(`Nothing captured yet in ${path.relative(ROOT, dir)}`);
  process.exit(0);
}

const rows = [];
for (const project of fs.readdirSync(dir).sort()) {
  if (onlyProject && project !== onlyProject) continue;
  for (const file of fs.readdirSync(path.join(dir, project)).filter((f) => f.endsWith(".json")).sort()) {
    const r = JSON.parse(fs.readFileSync(path.join(dir, project, file), "utf8"));
    if (onlyPage && r.page !== onlyPage) continue;
    if (onlyState && r.state !== onlyState) continue;
    if (onlyStates.length && !onlyStates.includes(r.state) && !onlyStates.includes(r.page)) continue;
    rows.push(r);
  }
}

let totalFails = 0;
for (const r of rows) {
  totalFails += r.fails;
  const failRules = [...new Set(r.issues.filter((i) => i.level === "fail").map((i) => i.rule))].join(",");
  console.log(`${String(r.fails).padStart(2)} fail ${String(r.warns).padStart(2)} warn  ${r.project.padEnd(14)} ${r.state} [${r.lang}]${failRules ? "  — " + failRules : ""}`);
  if (flag("details")) {
    for (const i of r.issues) console.log(`      ${i.level.toUpperCase()} ${i.rule}: ${i.detail}${i.sel ? `  @ ${i.sel}` : ""}${i.text ? `  "${i.text}"` : ""}`);
  }
}
console.log(`\n${rows.length} captures, ${totalFails} fails (${phase}, ${batch})`);
