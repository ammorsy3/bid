#!/usr/bin/env node
// Reports translation keys present in `en` but missing in `ar` (and vice versa)
// in client/src/lib/i18n.tsx. Walks the whole `translations` object and lists
// every leaf path that's missing on either side. Run from repo root:
//   node scripts/check-i18n-parity.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const i18nPath = resolve(here, '..', 'client', 'src', 'lib', 'i18n.tsx');
const src = readFileSync(i18nPath, 'utf8');

// Extract the `const translations = { ... };` literal by brace-matching.
const startMarker = 'const translations = {';
const startIdx = src.indexOf(startMarker);
if (startIdx < 0) {
  console.error('Could not find `const translations = {` in i18n.tsx');
  process.exit(2);
}
let i = startIdx + startMarker.length - 1; // points at the opening `{`
let depth = 0;
let inString = null; // null, '"', "'", or '`'
let escape = false;
let endIdx = -1;
for (; i < src.length; i++) {
  const c = src[i];
  if (escape) { escape = false; continue; }
  if (inString) {
    if (c === '\\') { escape = true; continue; }
    if (c === inString) inString = null;
    continue;
  }
  if (c === '"' || c === "'" || c === '`') { inString = c; continue; }
  if (c === '{') depth++;
  else if (c === '}') {
    depth--;
    if (depth === 0) { endIdx = i; break; }
  }
}
if (endIdx < 0) {
  console.error('Could not find matching `}` for translations object');
  process.exit(2);
}

const literal = src.slice(startIdx + startMarker.length - 1, endIdx + 1);

// Evaluate as a JS object expression. The translations object is pure data
// (no function calls), so wrapping in `(...)` and using Function is safe.
let translations;
try {
  translations = Function(`"use strict"; return (${literal});`)();
} catch (err) {
  console.error('Failed to evaluate translations literal:', err.message);
  process.exit(2);
}

if (!translations.en || !translations.ar) {
  console.error('translations object is missing `en` or `ar` top-level key');
  process.exit(2);
}

// Walk an object and collect every leaf path as a dotted string.
function leafPaths(obj, prefix = '') {
  const out = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      for (const p of leafPaths(v, path)) out.add(p);
    } else {
      out.add(path);
    }
  }
  return out;
}

const enPaths = leafPaths(translations.en);
const arPaths = leafPaths(translations.ar);

const missingInAr = [...enPaths].filter(p => !arPaths.has(p)).sort();
const missingInEn = [...arPaths].filter(p => !enPaths.has(p)).sort();

console.log(`EN keys: ${enPaths.size}`);
console.log(`AR keys: ${arPaths.size}`);
console.log('');

if (missingInAr.length === 0 && missingInEn.length === 0) {
  console.log('✓ Full key parity between EN and AR.');
  process.exit(0);
}

if (missingInAr.length > 0) {
  console.log(`Missing in AR (${missingInAr.length}):`);
  for (const p of missingInAr) console.log(`  ${p}`);
  console.log('');
}
if (missingInEn.length > 0) {
  console.log(`Missing in EN (${missingInEn.length}):`);
  for (const p of missingInEn) console.log(`  ${p}`);
  console.log('');
}
process.exit(1);
