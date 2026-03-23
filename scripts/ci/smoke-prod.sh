#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost}"
HEALTH_URL="${HEALTH_URL:-$BASE_URL/api/health}"
HOME_URL="${HOME_URL:-$BASE_URL/}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-20}"
SLEEP_SECONDS="${SLEEP_SECONDS:-5}"

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  if curl -fsS "$HEALTH_URL" >/dev/null; then
    break
  fi
  if [[ "$attempt" == "$MAX_ATTEMPTS" ]]; then
    echo "Backend health check failed at $HEALTH_URL" >&2
    exit 1
  fi
  sleep "$SLEEP_SECONDS"
done

curl -fsS "$HOME_URL" >/dev/null

echo "Production smoke checks passed."
