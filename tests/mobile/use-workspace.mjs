// Makes a copy of your saved sign-in that is set to a different workspace.
//
//   node tests/mobile/use-workspace.mjs "Seet" seet
//
// Your workspace is stored inside the sign-in token. The app's own "switch
// workspace" request (POST /api/companies/switch/:id, which stores nothing and only
// returns a new token) is sent to the audit server on :5137 with the token saved by
// `npm run e2e:login`, and the result is written to tests/e2e/.auth/<name>.json.
// tests/e2e/.auth/user.json is left alone. Nothing secret is printed.
//
// Use it with the audit:   node tests/mobile/run.mjs --workspace seet ...
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const AUTH_DIR = path.join(ROOT, "tests", "e2e", ".auth");
const BASE = process.env.AUDIT_ORIGIN ?? "http://localhost:5137";
const [wanted, outName] = process.argv.slice(2);

if (!wanted || !outName) {
  console.error('usage: node tests/mobile/use-workspace.mjs "<workspace name>" <output-name>');
  process.exit(2);
}
const src = path.join(AUTH_DIR, "user.json");
if (!fs.existsSync(src)) {
  console.error("No saved sign-in. Run: npm run e2e:login");
  process.exit(1);
}

const state = JSON.parse(fs.readFileSync(src, "utf8"));
const origin = (state.origins ?? []).find((o) => o.origin === BASE);
const item = (name) => origin?.localStorage.find((i) => i.name === name);
const token = item("token")?.value;
if (!token) {
  console.error(`The saved sign-in has no session for ${BASE}. Run: npm run e2e:login`);
  process.exit(1);
}

const call = async (method, url) => {
  const res = await fetch(BASE + url, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: method === "POST" ? "{}" : undefined });
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}`);
  return res.json();
};

const me = await call("GET", "/api/auth/me");
const companies = me.companies ?? [];
const match = companies.find((c) => c.name.toLowerCase() === wanted.toLowerCase());
if (!match) {
  console.error(`No workspace named "${wanted}". You have: ${companies.map((c) => c.name).join(", ")}`);
  process.exit(1);
}
const switched = await call("POST", `/api/companies/switch/${match.id}`);

// Replace the token and the persisted "active workspace" in the copy.
item("token").value = switched.token;
const persisted = item("auth-storage");
if (persisted) {
  const store = JSON.parse(persisted.value);
  const s = store.state ?? store;
  s.activeCompany = switched.activeCompany;
  if ("token" in s) s.token = switched.token;
  persisted.value = JSON.stringify(store);
}
const out = path.join(AUTH_DIR, `${outName}.json`);
fs.writeFileSync(out, JSON.stringify(state));
console.log(`Saved ${path.relative(ROOT, out)}: workspace "${switched.activeCompany.name}" (${switched.activeCompany.accountType}, ${switched.activeCompany.role}).`);
