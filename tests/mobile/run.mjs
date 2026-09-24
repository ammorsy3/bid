// One command for the capture spec, so agents (and permission rules) don't
// need environment-variable prefixes:
//
//   node tests/mobile/run.mjs --phase after --states login,signup-errors \
//        --projects iphone-chrome,android-chrome --langs ar,en [--batch batch-1] [--summary]
//
// --states takes state ids or page names from tests/mobile/states.json.
// --phase before | after | assert (assert = after + fail on problems).
// --summary prints the checklist summary for the same states afterwards.
import { spawnSync } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : undefined;
};
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const env = { ...process.env };
env.AUDIT_PHASE = opt("phase") ?? "after";
env.AUDIT_BATCH = opt("batch") ?? env.AUDIT_BATCH ?? "batch-1";
if (opt("states")) env.AUDIT_STATES = opt("states");
if (opt("langs")) env.AUDIT_LANGS = opt("langs");
if (opt("port")) env.AUDIT_PORT = opt("port");

const projectFlags = (opt("projects") ?? "").split(",").filter(Boolean).flatMap((p) => ["--project", p]);
const run = spawnSync("npx", ["playwright", "test", "-c", "playwright.mobile.config.ts", ...projectFlags], {
  cwd: ROOT,
  env,
  stdio: "inherit",
});

if (args.includes("--summary")) {
  const summaryArgs = ["tests/mobile/summary.mjs", "--batch", env.AUDIT_BATCH, "--phase", env.AUDIT_PHASE === "assert" ? "after" : env.AUDIT_PHASE];
  if (env.AUDIT_STATES) summaryArgs.push("--states", env.AUDIT_STATES);
  spawnSync("node", summaryArgs, { cwd: ROOT, stdio: "inherit" });
}
process.exit(run.status ?? 1);
