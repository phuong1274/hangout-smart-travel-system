#!/bin/bash
# Run all performance tests sequentially and generate reports
# Usage: ./run-all.sh [environment] [output_dir]
# Example: ./run-all.sh local-dev

set -e

ENV=${1:-local-dev}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
PERF_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPORT_BASE="$PERF_DIR/reports/run-$TIMESTAMP"

echo "╔═══════════════════════════════════════════╗"
echo "║  HSTS Performance Test Suite - Run All    ║"
echo "║  Environment: $ENV"
echo "║  Timestamp:   $TIMESTAMP"
echo "╚═══════════════════════════════════════════╝"
echo ""

cd "$PERF_DIR"

declare -a TESTS=(
  "smoke/smoke"
  "load/locations-load"
  "load/auth-load"
  "load/itinerary-load"
  "load/dashboard-load"
  "load/reviews-load"
  "load/trips-load"
  "load/expenses-load"
  "stress/stress-mixed"
  "spike/spike-traffic"
)

TOTAL=${#TESTS[@]}
CURRENT=0
PASSED=0
FAILED=0

for test in "${TESTS[@]}"; do
  CURRENT=$((CURRENT + 1))
  TEST_NAME=$(basename "$test")
  REPORT_DIR="$REPORT_BASE/$TEST_NAME"
  mkdir -p "$REPORT_DIR"

  echo "[$CURRENT/$TOTAL] Running: $test"

  K6_WEB_DASHBOARD=true \
  K6_WEB_DASHBOARD_EXPORT="$REPORT_DIR/report.html" \
  ENV="$ENV" \
  k6 run "tests/$test.js" \
    --summary-export="$REPORT_DIR/summary.json" \
    > "$REPORT_DIR/output.txt" 2>&1 && {
    echo "  ✓ PASSED"
    PASSED=$((PASSED + 1))
  } || {
    echo "  ✗ FAILED (exit code: $?)"
    FAILED=$((FAILED + 1))
  }

  echo ""
done

echo "╔═══════════════════════════════════════════╗"
echo "║  Results Summary                          ║"
echo "║  Total:  $TOTAL"
echo "║  Passed: $PASSED"
echo "║  Failed: $FAILED"
echo "╚═══════════════════════════════════════════╝"
echo ""
echo "Reports saved to: $REPORT_BASE"
echo "Open any report.html in a browser to view details."
