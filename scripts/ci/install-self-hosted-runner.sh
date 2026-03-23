#!/usr/bin/env bash
set -euo pipefail

RUNNER_VERSION="${RUNNER_VERSION:-2.325.0}"
RUNNER_DIR="${RUNNER_DIR:-/opt/actions-runner}"
RUNNER_LABELS="${RUNNER_LABELS:-linux,prod}"
RUNNER_USER="${RUNNER_USER:-actions-runner}"
RUNNER_NAME="${RUNNER_NAME:-$(hostname)-prod}"
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
apt-get install -y --no-install-recommends curl ca-certificates tar git rsync sudo

if ! id -u "$RUNNER_USER" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "$RUNNER_USER"
fi

if getent group docker >/dev/null 2>&1; then
  usermod -aG docker "$RUNNER_USER"
fi

cat >/etc/sudoers.d/"$RUNNER_USER" <<EOF
$RUNNER_USER ALL=(ALL) NOPASSWD:ALL
EOF
chmod 440 /etc/sudoers.d/"$RUNNER_USER"

mkdir -p "$RUNNER_DIR"
chown -R "$RUNNER_USER":"$RUNNER_USER" "$RUNNER_DIR"
cd "$RUNNER_DIR"

if [[ ! -f "$RUNNER_DIR/.runner" ]]; then
  sudo -u "$RUNNER_USER" curl -fsSL -o "$RUNNER_DIR/actions-runner.tar.gz" \
    "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
  sudo -u "$RUNNER_USER" tar xzf "$RUNNER_DIR/actions-runner.tar.gz" -C "$RUNNER_DIR"
  rm -f "$RUNNER_DIR/actions-runner.tar.gz"
fi

sudo -u "$RUNNER_USER" ./config.sh \
  --url "$GITHUB_RUNNER_URL" \
  --token "$GITHUB_RUNNER_TOKEN" \
  --labels "$RUNNER_LABELS" \
  --name "$RUNNER_NAME" \
  --unattended \
  --replace

./svc.sh install "$RUNNER_USER"
./svc.sh start

echo "Self-hosted runner installed at $RUNNER_DIR for user $RUNNER_USER"
