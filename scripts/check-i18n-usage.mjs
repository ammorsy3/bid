#!/usr/bin/env node
// Two questions about client/src/lib/i18n.tsx, from opposite directions:
//
//   1. Which keys are defined but never referenced?  (dead weight, low stakes)
//   2. Which user-facing strings are HARDCODED IN ENGLISH even though a
//      translation for that exact text already exists?  (an Arabic bug, and
//      the reason this script exists)
//
// (2) is the one that matters. Every Arabic bug found in this repo so far has
// been of that shape: the key was written, translated, and then the component
// hardcoded the English anyway. Tests never catch it — the page renders fine,
// just in the wrong language.
//
//   node scripts/check-i18n-usage.mjs            # summary
//   node scripts/check-i18n-usage.mjs --dead     # also list unreferenced keys
//
// Exit code is always 0: this is a report, not a gate. Some findings are
// judgement calls (a hardcoded "Save" may be deliberate).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, join, extname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const clientSrc = resolve(root, 'client', 'src');
const i18nPath = resolve(clientSrc, 'lib', 'i18n.tsx');
const showDead = process.argv.includes('--dead');

// ---------------------------------------------------------------- load keys
const src = readFileSync(i18nPath, 'utf8');
const startMarker = 'const translations = {';
const startIdx = src.indexOf(startMarker);
if (startIdx < 0) { console.error('Could not find translations object'); process.exit(2); }
let depth = 0, inString = null, escape = false, endIdx = -1;
for (let i = startIdx + startMarker.length - 1; i < src.length; i++) {
  const c = src[i];
  if (escape) { escape = false; continue; }
  if (inString) { if (c === '\\') { escape = true; continue; } if (c === inString) inString = null; continue; }
  if (c === '"' || c === "'" || c === '`') { inString = c; continue; }
  if (c === '{') depth++;
  else if (c === '}' && --depth === 0) { endIdx = i; break; }
}
const translations = Function(`"use strict"; return (${src.slice(startIdx + startMarker.length - 1, endIdx + 1)});`)();

const flatten = (obj, prefix = '', out = new Map()) => {
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, path, out);
    else out.set(path, String(v));
  }
  return out;
};
const enKeys = flatten(translations.en);

// ---------------------------------------------------------------- load code
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (['.ts', '.tsx'].includes(extname(p)) && p !== i18nPath) files.push(p);
  }
})(clientSrc);

const sources = new Map(files.map(f => [f, readFileSync(f, 'utf8')]));
const allCode = [...sources.values()].join('\n');

// ------------------------------------------------------- 1. referenced keys
const referenced = new Set();
for (const m of allCode.matchAll(/\bt\(\s*['"`]([A-Za-z0-9_.]+)['"`]/g)) referenced.add(m[1]);
// Dynamic keys: t(`foo.bar${x}`) — treat every key under that prefix as used.
const dynamicPrefixes = [];
for (const m of allCode.matchAll(/\bt\(\s*`([A-Za-z0-9_.]*)\$\{/g)) if (m[1]) dynamicPrefixes.push(m[1]);
// Keys assembled elsewhere and passed in (ROLE_LABEL_KEYS etc.) appear as bare
// string literals rather than inside t(); count those too.
const bareLiterals = new Set();
for (const m of allCode.matchAll(/['"`]([A-Za-z0-9_]+\.[A-Za-z0-9_.]+)['"`]/g)) bareLiterals.add(m[1]);

const isUsed = (key) =>
  referenced.has(key) ||
  bareLiterals.has(key) ||
  dynamicPrefixes.some(p => key.startsWith(p));

const dead = [...enKeys.keys()].filter(k => !isUsed(k));

// --------------------------------------- 2. hardcoded English with a key
// Index translations by their English text so a hardcoded string can be looked
// up. Skip very short or non-alphabetic values: "1", "OK", ":" match noise.
const byText = new Map();
for (const [key, val] of enKeys) {
  const t = val.trim();
  if (t.length < 4) continue;
  if (!/[A-Za-z]{3}/.test(t)) continue;
  if (/\{/.test(t)) continue;                 // has placeholders; can't match a literal
  if (!byText.has(t)) byText.set(t, []);
  byText.get(t).push(key);
}

// Pull user-visible string literals out of JSX: text nodes, and the props that
// actually reach a user's eyes.
const ALT_PROP = /\balt\s*=\s*["']([^"'{}<>]{4,})["']/g;
const VISIBLE_PROPS = /\b(placeholder|title|label|aria-label|description|emptyMessage|tooltip)\s*=\s*["']([^"'{}<>]{4,})["']/g;
const JSX_TEXT = />\s*([A-Z][^<>{}\n]{3,})\s*</g;

// A file nothing renders cannot show anything to anyone. Reporting its strings
// as Arabic bugs sends you to fix pages that never appear — which is most of
// what the raw "unreferenced keys" number was pointing at.
//
// This has to be REACHABILITY from the entry point, not "does anything import
// it". A dead page importing a dead modal makes the modal look alive.
const byBasename = new Map();
for (const f of files) {
  const b = f.split('/').pop().replace(/\.tsx?$/, '');
  if (!byBasename.has(b)) byBasename.set(b, []);
  byBasename.get(b).push(f);
}
const importsOf = (file) => {
  const out = [];
  for (const m of (sources.get(file) || '').matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const spec = m[1];
    if (!spec.startsWith('.') && !spec.startsWith('@/')) continue;
    for (const target of byBasename.get(spec.split('/').pop()) || []) {
      if (target !== file) out.push(target);
    }
  }
  return out;
};

const entries = files.filter(f => /\/(App|main)\.tsx?$/.test(f));
const reachable = new Set(entries);
const stack = [...entries];
while (stack.length) {
  for (const next of importsOf(stack.pop())) {
    if (!reachable.has(next)) { reachable.add(next); stack.push(next); }
  }
}
const orphans = files.filter(f => !reachable.has(f));
const orphanSet = new Set(orphans);

const hardcoded = [];
for (const [file, code] of sources) {
  const rel = relative(root, file);
  if (rel.includes('/pages/docs/')) continue;   // developer docs, English by design
  if (rel.includes('/components/ui/')) continue; // vendored primitives
  if (orphanSet.has(file)) continue;             // nothing renders it
  const lines = code.split('\n');

  const record = (text, idx, kind) => {
    const clean = text.trim().replace(/\s+/g, ' ');
    const keys = byText.get(clean);
    if (!keys) return;
    const line = code.slice(0, idx).split('\n').length;
    // Already localised nearby: a `t()` call on this line, or an isRtl ternary
    // that supplies the Arabic in the other branch (the Landing page does this).
    const window = lines.slice(Math.max(0, line - 3), line + 1).join('\n');
    if (/\bt\(/.test(lines[line - 1] || '')) return;
    if (/isRtl\s*\?/.test(window)) return;
    hardcoded.push({ file: rel, line, text: clean, keys, kind });
  };

  for (const m of code.matchAll(ALT_PROP)) record(m[1], m.index, 'alt');
  for (const m of code.matchAll(VISIBLE_PROPS)) record(m[2], m.index, 'prop');
  for (const m of code.matchAll(JSX_TEXT)) record(m[1], m.index, 'text');
}

// ----------------------------------------------------------------- report
console.log(`i18n keys defined (en): ${enKeys.size}`);
console.log(`referenced somewhere:   ${enKeys.size - dead.length}`);
console.log(`never referenced:       ${dead.length}`);
console.log(`files nothing imports:  ${orphans.length}`);
console.log('');

// An unused shadcn primitive is a component library shipping more than you use
// — expected, not a finding. An unused *page* is a different thing entirely.
const vendored = orphans.filter(f => relative(root, f).includes('/components/ui/'));
const appOrphans = orphans.filter(f => !relative(root, f).includes('/components/ui/'));

if (appOrphans.length) {
  console.log(`ORPHANED APP FILES — nothing imports these, so they render to nobody:`);
  for (const f of appOrphans.sort()) console.log(`  ${relative(root, f)}`);
  console.log(`  (plus ${vendored.length} unused components/ui primitives, which is normal)`);
  console.log('');
}

if (hardcoded.length === 0) {
  console.log('No hardcoded English in live code that duplicates an existing translation.');
} else {
  console.log(`HARDCODED ENGLISH WITH AN EXISTING TRANSLATION — ${hardcoded.length} site(s) in live code:`);
  console.log('(text/prop = a user reads it; alt = a screen reader announces it)\n');
  const byFile = new Map();
  for (const h of hardcoded) {
    if (!byFile.has(h.file)) byFile.set(h.file, []);
    byFile.get(h.file).push(h);
  }
  for (const [file, hits] of [...byFile].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${file}`);
    for (const h of hits.sort((a, b) => a.line - b.line)) {
      console.log(`    :${h.line} [${h.kind}] "${h.text}"  ->  ${h.keys.join(' | ')}`);
    }
  }
}

if (showDead) {
  console.log(`\nNEVER REFERENCED (${dead.length}):`);
  const byNs = new Map();
  for (const k of dead) {
    const ns = k.split('.')[0];
    if (!byNs.has(ns)) byNs.set(ns, []);
    byNs.get(ns).push(k);
  }
  for (const [ns, keys] of [...byNs].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${ns} (${keys.length}): ${keys.map(k => k.split('.').slice(1).join('.')).join(', ')}`);
  }
}
