// Signs the visible phone window in (session-mode batches).
//
// The `phone` Chrome window is a throwaway browser with no login. This serves the
// sign-in you saved with `npm run e2e:login` (tests/e2e/.auth/user.json) to that
// window, on 127.0.0.1 only, for 60 seconds, then exits. The window's page fetches
// it and copies it into its own localStorage; see README.md ("Signing the phone
// window in"). The token is never printed here.
//
//   node tests/mobile/serve-session.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// AUDIT_SIGNIN=seet serves tests/e2e/.auth/seet.json (see use-workspace.mjs); default user.json.
const FILE = path.join(ROOT, "tests", "e2e", ".auth", `${process.env.AUDIT_SIGNIN ?? "user"}.json`);
const ORIGIN = process.env.AUDIT_ORIGIN ?? "http://localhost:5137";

if (!fs.existsSync(FILE)) {
  console.error(`No saved sign-in at ${FILE}. Run: npm run e2e:login`);
  process.exit(1);
}
const state = JSON.parse(fs.readFileSync(FILE, "utf8"));
const items = (state.origins ?? []).find((o) => o.origin === ORIGIN)?.localStorage ?? [];
if (!items.some((i) => i.name === "token")) {
  console.error(`The saved sign-in has no session for ${ORIGIN}. Run: npm run e2e:login`);
  process.exit(1);
}

const server = http.createServer((_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ localStorage: items }));
});
server.listen(5298, "127.0.0.1", () => {
  console.log(`Serving ${items.length} storage items to the phone window on 127.0.0.1:5298 for 60s.`);
});
setTimeout(() => {
  server.close();
  console.log("Closed.");
  process.exit(0);
}, 60_000);
