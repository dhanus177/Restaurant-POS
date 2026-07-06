#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-ssl}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
ENV_EXAMPLE="$ROOT_DIR/.env.example"

log() {
  echo "[install-linux] $*"
}

fail() {
  echo "[install-linux] ERROR: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command '$1' not found."
}

get_env_value() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 || true)"
  line="${line#*=}"
  line="${line%\"}"
  line="${line#\"}"
  echo "$line"
}

is_missing_or_placeholder() {
  local value="$1"
  local key="$2"

  if [[ -z "$value" ]]; then
    return 0
  fi

  case "$key" in
    SETUP_SECRET)
      [[ "$value" == "change-this-setup-secret" || "$value" == "local-setup-secret" ]] && return 0
      ;;
    LICENSE_ACTIVATION_KEYS)
      [[ "$value" == "replace-with-your-activation-key" || "$value" == "LOCAL-DEV-KEY" ]] && return 0
      ;;
    POSTGRES_PASSWORD)
      [[ "$value" == "change-me-strong-password" || "$value" == "posdb_pass_2026" || "$value" == "your_password_here" ]] && return 0
      ;;
    APP_DOMAIN)
      [[ "$value" == "pos.example.com" || "$value" == "example.com" || "$value" == *"example.com" ]] && return 0
      ;;
    LETSENCRYPT_EMAIL)
      [[ "$value" == "admin@example.com" || "$value" != *"@"* ]] && return 0
      ;;
  esac

  return 1
}

validate_key() {
  local key="$1"
  local value
  value="$(get_env_value "$key")"

  if is_missing_or_placeholder "$value" "$key"; then
    fail "Please set a real value for $key in .env before continuing."
  fi
}

case "$MODE" in
  http|ssl)
    ;;
  *)
    fail "Invalid mode '$MODE'. Use: http or ssl"
    ;;
esac

require_command docker

docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin is required (docker compose)."

if [[ ! -f "$ENV_FILE" ]]; then
  [[ -f "$ENV_EXAMPLE" ]] || fail "Missing .env.example"
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  log "Created .env from .env.example"
fi

validate_key SETUP_SECRET
validate_key LICENSE_ACTIVATION_KEYS
validate_key POSTGRES_PASSWORD

if [[ "$MODE" == "ssl" ]]; then
  validate_key APP_DOMAIN
  validate_key LETSENCRYPT_EMAIL
  COMPOSE_FILE="$ROOT_DIR/deploy/docker-compose.vps.ssl.yml"
else
  COMPOSE_FILE="$ROOT_DIR/deploy/docker-compose.vps.yml"
fi

log "Starting deployment in '$MODE' mode..."
docker compose -f "$COMPOSE_FILE" up -d --build

if [[ "$MODE" == "ssl" ]]; then
  DOMAIN="$(get_env_value APP_DOMAIN)"
  log "Deployment complete. Open: https://$DOMAIN/setup"
else
  log "Deployment complete. Open: http://<VPS-IP>:3000/setup"
fi
