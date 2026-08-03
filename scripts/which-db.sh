#!/usr/bin/env bash
# Which database is production ACTUALLY using?
#
# Run this before any migration, and after any change to Vercel env vars.
#
#   ./scripts/which-db.sh
#
# WHY THIS EXISTS
# On 2026-08-02 this project had a production outage because the answer was
# assumed from variable names instead of measured. `.env` calls one database
# DATABASE_URL and another PROD_DATABASE_URL, and at the time the names were
# inverted: bidapp.sa served from the one labelled "dev". Migrations dropped
# columns from the wrong database and login broke with `42703`.
#
# HOW IT WORKS
# It posts a unique marker to the live site's public error-logging endpoint,
# which writes a row, then looks for that row in each candidate database.
# Whichever database received it is the one production talks to. That is a
# direct observation, not an inference.
#
# An earlier version compared a read-only counter (`totalOffers` from
# /api/marketplace/stats) against each database. That worked until the two
# databases were merged on 2026-08-03 — once they held the same data the
# counters matched and the check could no longer tell them apart. Any read-only
# fingerprint has that failure mode: it depends on the databases DIFFERING.
# Writing a marker does not.
#
# COST: one row in `error_logs` per run, with message "which-db probe <uuid>".
# That table is append-only with a 30-day retention sweep, and the endpoint is
# the app's own client-error reporter, so this is a normal write on a normal
# path — not a special-case backdoor.
#
# Exit codes: 0 = exactly one database matched. 1 = zero or several (ambiguous —
# do NOT migrate until it is resolved).

set -uo pipefail
cd "$(dirname "$0")/.."

SITE="${SITE:-https://www.bidapp.sa}"
CANDIDATES=(DATABASE_URL PROD_DATABASE_URL)

set -a; . ./.env >/dev/null 2>&1; set +a

MARKER="which-db probe $(uuidgen 2>/dev/null || date +%s%N)"

echo "Posting a marker to the live site…"
CODE=$(curl -sS --max-time 30 -o /dev/null -w '%{http_code}' \
  -X POST "$SITE/api/errors" \
  -H 'Content-Type: application/json' \
  --data "$(printf '{"message":%s,"path":"/scripts/which-db.sh"}' "$(printf '%s' "$MARKER" | sed 's/"/\\"/g;s/^/"/;s/$/"/')")") || {
  echo "  FAILED to reach $SITE — cannot determine anything. Aborting."; exit 1; }

if [ "$CODE" != "200" ] && [ "$CODE" != "201" ]; then
  echo "  $SITE/api/errors returned HTTP $CODE — expected 200/201."
  echo "  Cannot place a marker, so the answer cannot be measured. Aborting."
  exit 1
fi
echo "  ok — marker: $MARKER"
echo

# Give the write a moment to land before reading it back.
sleep 2

MATCHES=0
MATCHED_NAME=""
for VAR in "${CANDIDATES[@]}"; do
  URL="${!VAR:-}"
  if [ -z "$URL" ]; then
    printf '  %-20s (not set)\n' "$VAR"; continue
  fi
  REF=$(printf '%s' "$URL" | sed -n 's#.*://[^:]*\.\([a-z0-9]*\):.*#\1#p')
  PORT=$(printf '%s' "$URL" | sed -n 's#.*:\([0-9]*\)/.*#\1#p')

  FOUND=$(psql "$URL" -t -A -c \
    "select count(*) from error_logs where error_message = '${MARKER//\'/\'\'}'" 2>/dev/null | tr -d ' ')

  if [ -z "$FOUND" ]; then
    printf '  %-20s ref=%-22s port=%-5s UNREACHABLE\n' "$VAR" "$REF" "$PORT"; continue
  fi
  if [ "$FOUND" -gt 0 ] 2>/dev/null; then
    STATUS="<<< PRODUCTION IS USING THIS"
    MATCHES=$((MATCHES+1)); MATCHED_NAME="$VAR"
  else
    STATUS="not in use by production"
  fi
  printf '  %-20s ref=%-22s port=%-5s marker=%-5s %s\n' "$VAR" "$REF" "$PORT" "$FOUND" "$STATUS"
done

echo
if [ "$MATCHES" -eq 1 ]; then
  echo "RESULT: production is served by \$$MATCHED_NAME"
  echo "        Any migration must target that one — and only AFTER the code that"
  echo "        stops using the dropped columns is deployed."
  exit 0
elif [ "$MATCHES" -eq 0 ]; then
  echo "RESULT: AMBIGUOUS — the marker landed in none of the candidates."
  echo "        Vercel is pointed at a database not listed in .env, or the write"
  echo "        did not land. Do not migrate until this is understood."
  exit 1
else
  echo "RESULT: AMBIGUOUS — the marker landed in $MATCHES candidates."
  echo "        Two entries in .env point at the same database. Do not migrate."
  exit 1
fi
