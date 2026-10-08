// CI gate: fail on any high/critical advisory in shipped dependencies, except the
// advisories listed below. Each entry needs a reason and should be removed once fixed.
import { execSync } from "node:child_process";

const ALLOWED = {
  // braces: stack-exhaustion DoS on deeply nested glob patterns. Reached only through
  // Tailwind 3's build tooling (tailwindcss -> chokidar/fast-glob/micromatch -> braces),
  // which runs at build time on our own source and never in production. npm's only fix is
  // upgrading to Tailwind 4 (a breaking change). Remove when Tailwind is upgraded.
  "GHSA-vfj7-8cjw-p6xm": "braces via Tailwind 3 build tooling (build-time only)",
};

let raw;
try {
  raw = execSync("npm audit --omit=dev --json", { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  raw = e.stdout; // npm audit exits non-zero when it finds anything
}
const report = JSON.parse(raw);
if (report.error) {
  console.error("npm audit failed to run:", report.error.summary ?? report.error);
  process.exit(1);
}

const blocking = new Map();
const ignored = new Set();
for (const [name, vuln] of Object.entries(report.vulnerabilities ?? {})) {
  for (const via of vuln.via) {
    if (typeof via === "string" || !["high", "critical"].includes(via.severity)) continue;
    const id = via.url?.split("/").pop() ?? String(via.source);
    if (ALLOWED[id]) ignored.add(`${id} (${ALLOWED[id]})`);
    else blocking.set(id, `${via.severity}: ${via.name} - ${via.title} ${via.url ?? ""}`);
  }
}

for (const note of ignored) console.log(`allowed: ${note}`);
if (blocking.size) {
  console.error("\nHigh/critical advisories in shipped dependencies:");
  for (const line of blocking.values()) console.error(`  ${line}`);
  process.exit(1);
}
console.log("No blocking advisories.");
