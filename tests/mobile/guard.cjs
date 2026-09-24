// Safety net for the mobile + Arabic audit browsers: the visible "phone"
// Chrome window (Playwright MCP loads this file for every tab and calls
// `.default({ page })`) and the capture spec (which calls installGuard).
//
// Every request the app makes to its own API passes through here:
//   - Saves and sends (POST/PUT/PATCH/DELETE) never reach a server. They get a
//     fake "ok" — or the scripted answer a screen state asks for — and are
//     logged. Nothing is written and nobody is emailed.
//   - Fixture mode (plain Vite on :5138, no backend): reads are answered from
//     tests/mobile/fixtures. A read with no fixture gets a logged 404 so the
//     missing fixture is easy to spot.
//   - Session mode (the real dev server): reads pass through, except the
//     current user, whose language is rewritten from the audit_lang cookie so
//     switching language never writes to the database.
//
// Which persona, screen state and language apply comes from cookies the spec
// or the in-page helper (window.__mobileAudit) sets: audit_persona,
// audit_state, audit_lang, audit_mode. /api/__audit/ping proves the guard is
// loaded; the loop refuses to run without it.

const fs = require("node:fs");
const path = require("node:path");

const FIXTURE_DIR = path.join(__dirname, "fixtures");
const STATES_FILE = path.join(__dirname, "states.json");
const LOG_FILE = path.resolve(__dirname, "../../.mobile-audit/guard-log.jsonl");
const FIXTURE_PORTS = new Set(["5138"]);
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const installedContexts = new WeakSet();
const recent = [];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function loadPersona(name) {
  const file = path.join(FIXTURE_DIR, `${name}.json`);
  return fs.existsSync(file) ? readJson(file) : null;
}

function loadCommon() {
  return loadPersona("_common") || { routes: {} };
}

function loadState(id) {
  if (!id || !fs.existsSync(STATES_FILE)) return null;
  return readJson(STATES_FILE).states.find((s) => s.id === id) || null;
}

function parseCookies(header) {
  const out = {};
  for (const part of (header || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

// Route keys look like "GET /api/tenders/:id" or "POST /api/companies/*".
function matchRoute(routes, method, pathname) {
  for (const [key, answer] of Object.entries(routes || {})) {
    const [m, pattern] = key.split(" ");
    if (m !== method && m !== "ANY") continue;
    const re = new RegExp(
      "^" + pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*").replace(/:[^/]+/g, "[^/]+") + "$",
    );
    if (re.test(pathname)) return { key, answer };
  }
  return null;
}

function log(entry) {
  const line = { at: new Date().toISOString(), ...entry };
  recent.push(line);
  if (recent.length > 200) recent.shift();
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, JSON.stringify(line) + "\n");
  } catch {
    // Logging must never break the page.
  }
}

// The current-user answer for a persona, with the language pinned.
function meFor(persona, lang) {
  if (!persona || !persona.me) return { status: 401, json: { message: "Not signed in (audit persona has no user)" } };
  const me = JSON.parse(JSON.stringify(persona.me));
  if (lang === "ar" || lang === "en") me.user.language = lang;
  return { status: 200, json: me };
}

async function fulfill(route, answer) {
  // A state can freeze a request forever to photograph a loading screen.
  if (answer.hang) return new Promise(() => {});
  const status = answer.status ?? 200;
  if (answer.body !== undefined) {
    return route.fulfill({ status, contentType: answer.contentType || "text/plain", body: String(answer.body) });
  }
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(answer.json ?? {}) });
}

async function handle(route, opts) {
  const req = route.request();
  const url = new URL(req.url());
  const method = req.method();
  const headers = await req.allHeaders().catch(() => ({}));
  const cookies = parseCookies(headers.cookie);

  const state = opts.state || loadState(cookies.audit_state);
  const lang = opts.lang || cookies.audit_lang;
  const personaName = (state && state.persona) || cookies.audit_persona || "logged-out";
  const persona = loadPersona(personaName);
  const mode = opts.mode || cookies.audit_mode || (FIXTURE_PORTS.has(url.port) ? "fixture" : "session");
  const pathname = url.pathname;
  const base = { method, path: pathname + (url.search || ""), persona: personaName, state: state ? state.id : null, mode };

  // Audit endpoints: proof of life, the recent log, and data for the in-page helper.
  if (pathname === "/api/__audit/ping") {
    return fulfill(route, { json: { guard: true, mode, persona: personaName, state: base.state, lang: lang || null } });
  }
  if (pathname === "/api/__audit/log") {
    return fulfill(route, { json: recent.slice(-80) });
  }
  if (pathname === "/api/__audit/state") {
    const wanted = loadState(url.searchParams.get("id"));
    const p = wanted ? loadPersona(wanted.persona || "logged-out") : null;
    return fulfill(route, wanted ? { json: { state: wanted, storage: { ...(p?.storage || {}), ...(wanted.storage || {}) } } } : { status: 404, json: { message: "unknown state" } });
  }
  if (pathname === "/api/__audit/persona") {
    const p = loadPersona(url.searchParams.get("name") || personaName);
    return fulfill(route, p ? { json: { storage: p.storage || {} } } : { status: 404, json: { message: "unknown persona" } });
  }

  // 1. A screen state's scripted answers win (e.g. "wrong password" → 401).
  const scripted = matchRoute(state && state.overrides, method, pathname);
  if (scripted) {
    log({ ...base, status: scripted.answer.status ?? 200, via: `state:${scripted.key}` });
    return fulfill(route, scripted.answer);
  }

  // 2. Every write is faked. This is the safety guarantee: nothing reaches a server.
  if (WRITE_METHODS.has(method)) {
    const fixed = matchRoute(persona && persona.routes, method, pathname) || matchRoute(loadCommon().routes, method, pathname);
    const answer = fixed ? fixed.answer : { status: 200, json: {} };
    log({ ...base, status: answer.status ?? 200, via: fixed ? `fixture:${fixed.key}` : "blocked-write" });
    return fulfill(route, answer);
  }

  // 3. The current user: persona in fixture mode; real user with a pinned language in session mode.
  if (method === "GET" && pathname === "/api/auth/me") {
    if (mode === "fixture") {
      const explicit = matchRoute(persona && persona.routes, method, pathname);
      const answer = explicit ? explicit.answer : meFor(persona, lang);
      log({ ...base, status: answer.status, via: "fixture:me" });
      return fulfill(route, answer);
    }
    const response = await route.fetch();
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return route.fulfill({ response, body: text });
    }
    if (json && json.user && (lang === "ar" || lang === "en")) json.user.language = lang;
    log({ ...base, status: response.status(), via: "session:me-language-pinned" });
    return route.fulfill({ response, json });
  }

  // 4. Other reads: fixtures (persona, then shared). Some GETs secretly write,
  //    so session mode answers those from fixtures too (marked "always").
  const fixture = matchRoute(persona && persona.routes, method, pathname) || matchRoute(loadCommon().routes, method, pathname);
  if (fixture && (mode === "fixture" || fixture.answer.always)) {
    log({ ...base, status: fixture.answer.status ?? 200, via: `fixture:${fixture.key}` });
    return fulfill(route, fixture.answer);
  }
  if (mode === "fixture") {
    const fallback = (persona && persona.defaultGet) || { status: 404, json: { message: `audit: no fixture for ${method} ${pathname}` } };
    log({ ...base, status: fallback.status ?? 404, via: persona && persona.defaultGet ? "persona-default" : "MISSING-FIXTURE" });
    return fulfill(route, fallback);
  }
  return route.fallback();
}

// The app's own API lives under /api (and uploads under /objects). Only
// same-origin requests are intercepted; Clerk, fonts and the like pass through.
async function installGuard(context, opts = {}) {
  if (installedContexts.has(context)) return;
  installedContexts.add(context);
  const matcher = (url) => {
    const u = new URL(url);
    const local = u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname.endsWith(".local");
    return local && (u.pathname.startsWith("/api/") || u.pathname.startsWith("/objects/"));
  };
  await context.route(matcher, (route) =>
    handle(route, opts).catch((error) => {
      log({ method: route.request().method(), path: route.request().url(), status: 500, via: `guard-error:${error.message}` });
      return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: `audit guard error: ${error.message}` }) });
    }),
  );
}

module.exports = { installGuard, parseCookies, matchRoute, loadPersona, loadState };
module.exports.default = async ({ page }) => installGuard(page.context());
