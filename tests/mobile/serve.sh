#!/usr/bin/env bash
# Real dev server for session-mode audit batches (batch 2 onward).
# - Port 5137, which the audit browsers and the saved e2e session use.
# - Email switched off: the Postmark tokens are set to empty. dotenv never
#   overrides a variable that is already set, and server/email.ts skips sending
#   without a token, so nobody can be emailed while this runs. (Sign in with
#   `npm run e2e:login` BEFORE starting this — the login code can't be emailed now.)
# - Restarts itself: server/vite.ts stops the whole server on any build error or
#   page error, and a half-finished edit by the fixer would otherwise end the run.
set -u
cd "$(dirname "$0")/../.."
restarts=0
while true; do
  # No `tsx watch` here: watch mode keeps running after the server exits and waits
  # for a server file to change, so a crash caused by a page error (the dev server
  # exits on those) would never be restarted. Plain tsx exits, and this loop restarts it.
  PORT=5137 NODE_ENV=development POSTMARK_API_TOKEN= POSTMARK_AUTH_TOKEN= npx tsx server/index.ts
  restarts=$((restarts + 1))
  if [ "$restarts" -ge 20 ]; then
    echo "[serve.sh] the dev server stopped 20 times — giving up" >&2
    exit 1
  fi
  echo "[serve.sh] dev server stopped (restart #$restarts); restarting in 2s" >&2
  sleep 2
done
