# ==============================
# Veztra Soft POS - Production
# ==============================
# Replace ALL placeholder values before deploying.

# PostgreSQL connection string (required)
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
# If using managed DB (Neon/Supabase), include sslmode=require when needed.
DATABASE_URL="postgresql://postgres:REPLACE_WITH_STRONG_PASSWORD@db:5432/pos_db"

# One-time activation key(s), comma-separated if multiple are allowed.
LICENSE_ACTIVATION_KEYS="REPLACE_WITH_LICENSE_KEY"

# App behavior
NEXT_PUBLIC_DEMO_MODE="false"

# Production safety toggles
ALLOW_SEED_IN_PRODUCTION="false"
ALLOW_RESTORE_IN_PRODUCTION="false"
ALLOW_BACKUP_IN_PRODUCTION="true"

# Docker Compose DB variables (used by deploy/*.yml)
POSTGRES_DB="pos_db"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="REPLACE_WITH_STRONG_DB_PASSWORD"

# HTTPS reverse proxy (Caddy) variables (required for SSL mode)
APP_DOMAIN="your-pos-domain.com"
LETSENCRYPT_EMAIL="ops@your-pos-domain.com"

# WhatsApp daily reports provider
# WHATSAPP_PROVIDER: auto | meta | twilio
# - auto (default): prefer Meta Cloud API, fallback to Twilio if configured
# - meta: use Meta WhatsApp Cloud API only
# - twilio: use Twilio WhatsApp only
WHATSAPP_PROVIDER="meta"

# Meta WhatsApp Cloud API (recommended if you don't want Twilio)
WHATSAPP_ACCESS_TOKEN="REPLACE_WITH_META_WHATSAPP_ACCESS_TOKEN"
WHATSAPP_PHONE_NUMBER_ID="REPLACE_WITH_META_PHONE_NUMBER_ID"

# Twilio WhatsApp (optional fallback)
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_WHATSAPP_FROM=""

# Scheduler token for unattended cron calls to /api/whatsapp-reports/schedule
WHATSAPP_REPORTS_SCHEDULER_TOKEN="REPLACE_WITH_LONG_RANDOM_TOKEN"
