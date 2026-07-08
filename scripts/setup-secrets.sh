#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_LOCAL="$ROOT_DIR/.env.local"
ENV_FILE="$ROOT_DIR/.env"

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 32 | tr -d '\n'
  elif command -v node >/dev/null 2>&1; then
    node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  else
    echo "Error: install openssl or node." >&2
    exit 1
  fi
}

upsert_key() {
  local file="$1"
  local key="$2"
  local value="$3"

  touch "$file"
  if grep -qE "^${key}=" "$file"; then
    sed -i.bak -E "s|^${key}=.*|${key}=${value}|" "$file" && rm -f "${file}.bak"
  else
    printf "%s=%s\n" "$key" "$value" >> "$file"
  fi
}

NEXTAUTH_SECRET="$(generate_secret)"
JWT_SECRET="$(generate_secret)"

upsert_key "$ENV_LOCAL" "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET"
upsert_key "$ENV_FILE" "JWT_SECRET" "$JWT_SECRET"

echo "Done."
echo "Updated:"
echo " - $ENV_LOCAL (NEXTAUTH_SECRET)"
echo " - $ENV_FILE (JWT_SECRET)"
echo ""
echo "To activate in current shell:"
echo "  set -a; source .env.local; source .env; set +a"
