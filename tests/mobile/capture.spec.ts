// Photographs every screen state in states.json and runs the in-page
// checklist (checker.js) on it. Run through playwright.mobile.config.ts — the
// header there lists the AUDIT_* switches. Each state × language × phone
// writes <state>.<lang>.png and <state>.<lang>.json under
// .mobile-audit/<batch>/<before|after>/<project>/.
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { installGuard, loadPersona } = require("./guard.cjs");

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, "../..");
const CHECKER = path.join(HERE, "checker.js");
const PHASE = process.env.AUDIT_PHASE ?? "after";
const BATCH = process.env.AUDIT_BATCH ?? "batch-1";
const OUT_PHASE = PHASE === "assert" ? "after" : PHASE;
const PHONES = new Set([
  "android-chrome",
  "iphone-chrome",
  "big-iphone",
  "iphone-webkit",
  "iphone-dark",
  "forced-dark",
]);
// Visual-only projects: their checklist results are recorded but never fail
// the run (forced-dark repaints at paint time, invisible to computed styles).
const VISUAL_ONLY = new Set(["forced-dark"]);
// Session mode (real server, real account): keep the saved sign-in, only pin the language.
const SESSION_MODE = (process.env.AUDIT_PORT ?? "5138") !== "5138";

type Action = {
  click?: string;
  type?: string;
  fill?: [string, string];
  press?: string;
  wait?: number;
  waitFor?: string;
  eval?: string;
};
type State = {
  id: string;
  batch: string;
  page: string;
  title: string;
  route: string;
  persona?: string;
  langs?: string[];
  expectLang?: string;
  storage?: Record<string, string | null>;
  sessionStorage?: Record<string, string>;
  actions?: Action[];
  expectDialog?: boolean;
  allowBusy?: boolean;
  keyboard?: boolean;
  fullPage?: boolean;
  userAgent?: string;
  projects?: string[];
  skipProjects?: string[];
};

const only = (process.env.AUDIT_STATES ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const langs = (process.env.AUDIT_LANGS ?? "ar,en")
  .split(",")
  .map((s) => s.trim());
const states: State[] = JSON.parse(
  fs.readFileSync(path.join(HERE, "states.json"), "utf8"),
).states.filter(
  (s: State) =>
    s.batch === BATCH &&
    (only.length === 0 || only.includes(s.id) || only.includes(s.page)),
);

async function runAction(page: Page, a: Action) {
  if (a.click) await page.locator(a.click).first().click({ timeout: 8000 });
  if (a.fill)
    await page.locator(a.fill[0]).first().fill(a.fill[1], { timeout: 8000 });
  if (a.type) await page.keyboard.type(a.type, { delay: 40 });
  if (a.press) await page.keyboard.press(a.press);
  if (a.waitFor)
    await page.locator(a.waitFor).first().waitFor({ timeout: 10_000 });
  if (a.wait) await page.waitForTimeout(a.wait);
  if (a.eval) await page.evaluate(a.eval);
}

const issueKey = (i: { rule: string; sel: string }) => `${i.rule}|${i.sel}`;

for (const state of states) {
  test.describe(state.id, () => {
    // e.g. the Instagram / Snapchat in-app browsers
    if (state.userAgent) test.use({ userAgent: state.userAgent });

    for (const lang of state.langs ?? langs) {
      if (!langs.includes(lang)) continue;

      test(`${state.id} [${lang}]`, async ({
        page,
        context,
        baseURL,
      }, testInfo) => {
        const project = testInfo.project.name;
        test.skip(
          !!state.projects && !state.projects.includes(project),
          "state limited to other projects",
        );
        test.skip(
          !!state.skipProjects && state.skipProjects.includes(project),
          "state skips this project",
        );
        const expectLang = state.expectLang ?? lang;

        await installGuard(context, { state, lang });
        await context.addCookies([
          { name: "audit_state", value: state.id, url: baseURL! },
          { name: "audit_lang", value: lang, url: baseURL! },
          {
            name: "audit_persona",
            value: state.persona ?? "logged-out",
            url: baseURL!,
          },
        ]);
        const persona = loadPersona(state.persona ?? "logged-out");
        const storage: Record<string, string | null> = {
          ...(persona?.storage ?? {}),
          language: lang,
          ...(state.storage ?? {}),
        };
        // Seed storage once per tab, so a reload the app does itself (e.g. after
        // an expired session) doesn't put the old state back.
        await context.addInitScript(
          ({ storage, session, keepSignIn }) => {
            if (sessionStorage.getItem("__audit_seeded")) return;
            if (!keepSignIn) localStorage.clear();
            for (const [k, v] of Object.entries(storage)) {
              if (v === null) localStorage.removeItem(k);
              else localStorage.setItem(k, v);
            }
            for (const [k, v] of Object.entries(session))
              sessionStorage.setItem(k, v);
            sessionStorage.setItem("__audit_seeded", "1");
          },
          { storage, session: state.sessionStorage ?? {}, keepSignIn: SESSION_MODE },
        );
        await context.addInitScript({ path: CHECKER });

        await page.goto(state.route, { waitUntil: "domcontentloaded" });
        for (const action of state.actions ?? []) await runAction(page, action);

        const readiness = await page.evaluate(
          (o) => (window as any).__mobileAudit.ready(o),
          { lang: expectLang, allowBusy: !!state.allowBusy },
        );
        const result = await page.evaluate(
          (o) => (window as any).__mobileAudit.run(o),
          { lang: expectLang, expectDialog: !!state.expectDialog },
        );
        if (!readiness.ready) result.fails += 1;
        if (!readiness.ready)
          result.issues.unshift({
            level: "fail",
            rule: "not-settled",
            sel: "",
            text: "",
            detail: readiness.reason,
            box: null,
          });

        const outDir = path.join(
          ROOT,
          ".mobile-audit",
          BATCH,
          OUT_PHASE,
          project,
        );
        fs.mkdirSync(outDir, { recursive: true });
        const base = path.join(outDir, `${state.id}.${lang}`);
        await page.screenshot({
          path: `${base}.png`,
          fullPage: state.fullPage !== false && project !== "desktop",
          animations: "disabled",
          caret: "hide",
          // CSS-pixel photos (393px wide on an iPhone) keep the report light.
          scale: "css",
        });

        if (PHONES.has(project) && state.keyboard !== false) {
          const viewport = page.viewportSize()!;
          await page.setViewportSize({ width: viewport.width, height: 400 });
          const kb = await page.evaluate(() =>
            (window as any).__mobileAudit.keyboardCheck(),
          );
          await page.setViewportSize(viewport);
          result.issues.push(...kb.problems);
          result.fails += kb.problems.length;
        }

        const record = {
          state: state.id,
          page: state.page,
          title: state.title,
          route: state.route,
          lang,
          project,
          phase: OUT_PHASE,
          readiness,
          ...result,
        };
        fs.writeFileSync(`${base}.json`, JSON.stringify(record, null, 2));

        if (PHASE !== "assert" || VISUAL_ONLY.has(project)) return;
        const failLines = result.issues
          .filter((i: any) => i.level === "fail")
          .map((i: any) => `${i.rule}: ${i.detail} @ ${i.sel} "${i.text}"`);
        if (project === "desktop") {
          // Desktop isn't being redesigned: only problems that weren't there before count.
          const beforeFile = path.join(
            ROOT,
            ".mobile-audit",
            BATCH,
            "before",
            project,
            `${state.id}.${lang}.json`,
          );
          const before = fs.existsSync(beforeFile)
            ? JSON.parse(fs.readFileSync(beforeFile, "utf8"))
            : { issues: [] };
          const known = new Set(
            before.issues.filter((i: any) => i.level === "fail").map(issueKey),
          );
          const added = result.issues.filter(
            (i: any) => i.level === "fail" && !known.has(issueKey(i)),
          );
          expect(
            added.map((i: any) => `${i.rule}: ${i.detail} @ ${i.sel}`),
            "new desktop problems",
          ).toEqual([]);
        } else {
          expect(failLines, `checklist failures on ${project}`).toEqual([]);
        }
      });
    }
  });
}
