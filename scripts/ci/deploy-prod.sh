#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/home/nullbox/hsts}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
SOURCE_DIR="${SOURCE_DIR:-$PWD}"
DEPLOY_BACKEND="${DEPLOY_BACKEND:-true}"
DEPLOY_FRONTEND="${DEPLOY_FRONTEND:-true}"

if [[ "$DEPLOY_BACKEND" != "true" && "$DEPLOY_FRONTEND" != "true" ]]; then
  echo "Nothing to deploy. Set DEPLOY_BACKEND and/or DEPLOY_FRONTEND to true." >&2
  exit 1
fi

run_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

run_root mkdir -p "$DEPLOY_DIR"

run_root rsync -a --delete \
  --exclude '.git/' \
  --exclude '.github/' \
  --exclude '.env' \
  --exclude 'docs/' \
  --exclude '.claude/' \
  --exclude '.playwright-mcp/' \
  --exclude '.superpowers/' \
  --exclude '.gitnexus/' \
  --exclude 'node_modules/' \
  --exclude 'dist/' \
  --exclude 'bin/' \
  --exclude 'obj/' \
  --exclude 'HSTS.BE/HSTS.API/appsettings.json' \
  "$SOURCE_DIR"/ "$DEPLOY_DIR"/

pushd "$DEPLOY_DIR" >/dev/null

if [[ "$DEPLOY_BACKEND" == "true" ]]; then
  run_root docker compose -f "$COMPOSE_FILE" build backend
fi

if [[ "$DEPLOY_FRONTEND" == "true" ]]; then
  run_root docker compose -f "$COMPOSE_FILE" build nginx
fi

if [[ "$DEPLOY_BACKEND" == "true" ]]; then
  run_root docker compose -f "$COMPOSE_FILE" up -d backend
fi

if [[ "$DEPLOY_FRONTEND" == "true" ]]; then
  run_root docker compose -f "$COMPOSE_FILE" up -d --no-deps nginx
fi

run_root docker compose -f "$COMPOSE_FILE" ps

popd >/dev/null
