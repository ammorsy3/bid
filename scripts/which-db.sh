#!/usr/bin/env bash
# Which database is production ACTUALLY using?
#
# On 2026-08-02 this project had a production outage because the answer was
# assumed from variable names instead of measured. `.env` calls one database
# DATABASE_URL and another PROD_DATABASE_URL, and the names did not match
# reality. Migrations were applied to the wrong one and bidapp.sa login broke.
#
# This script answers the question by BEHAVIOUR, not by naming. It reads a live
# counter off the deployed site and compares it against the same query run
# directly against each candidate database. Whichever matches is the one
# production is talking to.
#
# Run it before any migration, and after any change to Vercel env vars.
#
#   ./scripts/which-db.sh
#
# Exit codes: 0 = exactly one candidate matched. 1 = zero or multiple matched
# (ambiguous — do NOT migrate until resolved).

set -uo pipefail
cd "$(dirname "$0")/.."

SITE="${SITE:-https://www.bidapp.sa}"

set -a; . ./.env >/dev/null 2>&1; set +a

# Counter used as the fingerprint. Must match server/storage.ts getMarketplaceStats().
FINGERPRINT_SQL="select count(*) from offers o
  join tenders t on o.tender_id = t.id
  join companies c on t.company_id = c.id
  where t.is_marketplace = true
    and t.marketplace_status = 'approved'
    and c.deleted_at is null"

echo "Asking the live site what it sees..."
LIVE_JSON=$(curl -sS --max-time 30 "$SITE/api/marketplace/stats") || {
  echo "  FAILED to reach $SITE — cannot determine anything. Aborting."; exit 1; }
LIVE=$(printf '%s' "$LIVE_JSON" | sed -n 's/.*"totalOffers":\([0-9]*\).*/\1/p')
[ -z "$LIVE" ] && { echo "  Unexpected response: $LIVE_JSON"; exit 1; }
echo "  $SITE reports totalOffers = $LIVE"
echo

MATCHES=0
MATCHED_NAME=""
for VAR in DATABASE_URL PROD_DATABASE_URL; do
  URL="${!VAR:-}"
  if [ -z "$URL" ]; then
    printf '  %-20s (not set)\n' "$VAR"; continue
  fi
  REF=$(printf '%s' "$URL" | sed -n 's#.*://[^:]*\.\([a-z0-9]*\):.*#\1#p')
  PORT=$(printf '%s' "$URL" | sed -n 's#.*:\([0-9]*\)/.*#\1#p')
  VAL=$(psql "$URL" -t -A -c "$FINGERPRINT_SQL" 2>/dev/null | tr -d ' ')
  if [ -z "$VAL" ]; then
    printf '  %-20s ref=%-22s port=%-5s UNREACHABLE\n' "$VAR" "$REF" "$PORT"; continue
  fi
  if [ "$VAL" = "$LIVE" ]; then
    STATUS="<<< PRODUCTION IS USING THIS"
    MATCHES=$((MATCHES+1)); MATCHED_NAME="$VAR"
  else
    STATUS="not in use by production"
  fi
  printf '  %-20s ref=%-22s port=%-5s totalOffers=%-4s %s\n' "$VAR" "$REF" "$PORT" "$VAL" "$STATUS"
done

echo
if [ "$MATCHES" -eq 1 ]; then
  echo "RESULT: production is served by \$$MATCHED_NAME"
  echo "        Any migration must target that one, and only AFTER the code is deployed."
  exit 0
elif [ "$MATCHES" -eq 0 ]; then
  echo "RESULT: AMBIGUOUS — no candidate matched the live site."
  echo "        Vercel may point at a database not listed in .env. Do not migrate."
  exit 1
else
  echo "RESULT: AMBIGUOUS — $MATCHES candidates matched (identical counters)."
  echo "        Use a more distinctive fingerprint before migrating."
  exit 1
fi
