#!/bin/bash
# Run performance tests against production safely
# Usage: ./run-production.sh [test-name]
# Requires: PROD_URL environment variable

set -e

if [ -z "$PROD_URL" ]; then
  echo "ERROR: Set PROD_URL environment variable"
  echo "  export PROD_URL=https://your-app.onrender.com/api"
  exit 1
fi

TEST=${1:-"locations-load"}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_DIR="reports/prod-$TIMESTAMP"
PERF_DIR="$(cd "$(dirname "$0")/.." && pwd)"

mkdir -p "$PERF_DIR/$REPORT_DIR"

echo "=== Production Performance Test ==="
echo "Target: $PROD_URL"
echo "Test:   $TEST"
echo "Report: $REPORT_DIR"
echo "==================================="

cd "$PERF_DIR"

K6_WEB_DASHBOARD=true \
K6_WEB_DASHBOARD_EXPORT="$REPORT_DIR/report.html" \
ENV=production \
PROD_URL="$PROD_URL" \
k6 run \
  --summary-export="$REPORT_DIR/summary.json" \
  "tests/load/prod-$TEST.js" || true

echo ""
echo "Report saved to $REPORT_DIR/report.html"
echo "JSON summary:  $REPORT_DIR/summary.json"
