#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/home/nullbox/hsts}"
ENV_FILE="${ENV_FILE:-$DEPLOY_DIR/.env}"

run_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

if ! run_root test -f "$ENV_FILE"; then
  echo "Missing production env file: $ENV_FILE" >&2
  exit 1
fi

required_keys=(
  JWT_SECRET_KEY
  JWT_ISSUER
  JWT_AUDIENCE
  MYSQL_ROOT_PASSWORD
  MYSQL_DATABASE
  MYSQL_USER
  MYSQL_PASSWORD
  CORS_ALLOWED_ORIGIN
  RESEND_API_KEY
  RESEND_FROM_EMAIL
  RESEND_FROM_NAME
  GOOGLE_CLIENT_ID
  CLOUDINARY_CLOUD_NAME
  CLOUDINARY_API_KEY
  CLOUDINARY_API_SECRET
)

for key in "${required_keys[@]}"; do
  if ! run_root grep -Eq "^${key}=.+" "$ENV_FILE"; then
    echo "Missing required key in $ENV_FILE: $key" >&2
    exit 1
  fi
done

echo "Production env validation passed."
