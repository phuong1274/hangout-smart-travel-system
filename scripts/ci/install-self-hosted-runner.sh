#!/usr/bin/env bash
set -euo pipefail

RUNNER_VERSION="${RUNNER_VERSION:-2.325.0}"
RUNNER_DIR="${RUNNER_DIR:-/opt/actions-runner}"
RUNNER_LABELS="${RUNNER_LABELS:-linux,prod}"
GITHUB_RUNNER_URL="${GITHUB_RUNNER_URL:-}"
GITHUB_RUNNER_TOKEN="${GITHUB_RUNNER_TOKEN:-}"

if [[ -z "$GITHUB_RUNNER_URL" || -z "$GITHUB_RUNNER_TOKEN" ]]; then
  echo "GITHUB_RUNNER_URL and GITHUB_RUNNER_TOKEN are required." >&2
  exit 1
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi

apt-get update
apt-get install -y --no-install-recommends curl ca-certificates tar git rsync

mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

curl -fsSL -o actions-runner.tar.gz "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
tar xzf actions-runner.tar.gz
rm -f actions-runner.tar.gz

./config.sh \
  --url "$GITHUB_RUNNER_URL" \
  --token "$GITHUB_RUNNER_TOKEN" \
  --labels "$RUNNER_LABELS" \
  --unattended \
  --replace

./svc.sh install
./svc.sh start

echo "Self-hosted runner installed at $RUNNER_DIR"
