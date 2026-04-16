#!/usr/bin/env bash
set -euo pipefail

MYSQL_URL="${MYSQL_URL:?Set MYSQL_URL first}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

mysql "$MYSQL_URL" < "$SCRIPT_DIR/00_reset_scope.sql"
mysql "$MYSQL_URL" < "$SCRIPT_DIR/10_destinations.sql"
mysql "$MYSQL_URL" < "$SCRIPT_DIR/20_locations.sql"
mysql "$MYSQL_URL" < "$SCRIPT_DIR/30_reviews.sql"
mysql "$MYSQL_URL" < "$SCRIPT_DIR/40_dashboard_support.sql"

echo "Seed completed successfully"
