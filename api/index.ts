// Vercel serverless entry.
//
// This file is deliberately a one-line re-export. Vercel compiles what lives in
// api/ but leaves the rest of the repo as TypeScript, so importing the server
// source directly from here fails at runtime with
//   Cannot find module '/var/task/server/app'
// The real handler is bundled ahead of time by the build command into
// dist/server.js — a single self-contained file with the @shared/* alias already
// resolved — and that is what gets deployed alongside this entry.
//
// Source lives in server/serverless.ts.
export { default } from "../dist/server.js";
