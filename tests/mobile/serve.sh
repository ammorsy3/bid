#!/usr/bin/env bash
# Real dev server for session-mode audit batches (batch 2 onward).
# - Port 5137, which the audit browsers and the saved e2e session use.
# - Email switched off: the Postmark tokens are set to empty. dotenv never
#   overrides a variable that is already set, and server/email.ts skips sending
#   without a token, so nobody can be emailed while this runs. (Sign in with
#   `npm run e2e:login` BEFORE starting this — the login code can't be emailed now.)
# - Restarts itself: server/vite.ts stops the whole server on any build error,
#   and a half-finished edit by the fixer would otherwise end the run.
set -u
cd "$(dirname "$0")/../.."
restarts=0
while true; do
  PORT=5137 POSTMARK_API_TOKEN= POSTMARK_AUTH_TOKEN= npm run dev
  restarts=$((restarts + 1))
  if [ "$restarts" -ge 20 ]; then
    echo "[serve.sh] the dev server stopped 20 times — giving up" >&2
    exit 1
  fi
  echo "[serve.sh] dev server stopped (restart #$restarts); restarting in 2s" >&2
  sleep 2
done
