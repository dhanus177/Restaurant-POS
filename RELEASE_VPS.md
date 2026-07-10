## Veztra Soft POS release deployment (Linux + Windows VPS)

This project now ships with Docker-based production release paths that work on both Linux and Windows VPS:

- HTTP stack (single port): `deploy/docker-compose.vps.yml`
- HTTPS stack (recommended): `deploy/docker-compose.vps.ssl.yml` with Caddy auto TLS

### 1) Prerequisites

- Docker Engine 24+
- Docker Compose plugin (`docker compose`)
- For HTTP-only stack: open port `3000`
- For HTTPS stack: open ports `80` and `443`

### 2) Prepare environment

1. Copy `.env.production` to `.env`.
2. Set these values before first production run:
   - `LICENSE_ACTIVATION_KEYS`
   - `POSTGRES_PASSWORD`
  - (Optional for WhatsApp reports) `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `WHATSAPP_REPORTS_SCHEDULER_TOKEN`
3. For HTTPS stack also set:
  - `APP_DOMAIN` (public DNS name pointing to VPS)
  - `LETSENCRYPT_EMAIL`

> Note: the compose stack injects `DATABASE_URL` automatically to point at the internal `db` service.

### 2.1 One-command installers (recommended)

From repository root:

- Linux HTTPS (recommended):
  - `bash deploy/install-linux.sh ssl`
- Linux HTTP:
  - `bash deploy/install-linux.sh http`
- Windows HTTPS (recommended):
  - `powershell -ExecutionPolicy Bypass -File deploy/install-windows.ps1 -Mode ssl`
- Windows HTTP:
  - `powershell -ExecutionPolicy Bypass -File deploy/install-windows.ps1 -Mode http`

The installers will:

1. Verify Docker + Docker Compose availability.
2. Create `.env` from `.env.production` if missing.
3. Validate required production variables are not placeholders.
4. Build and start the selected stack.

You can also run through npm wrappers:

- `npm run release:install:linux`
- `npm run release:install:http:linux`
- `npm run release:install:windows`
- `npm run release:install:http:windows`

### 3. Build and start HTTP stack (Linux VPS)

```bash
cd /opt/Restaurant-POS
cp .env.production .env
# edit .env
npm run release:up
```

### 4. Build and start HTTP stack (Windows VPS PowerShell)

```powershell
Set-Location C:\apps\Restaurant-POS
Copy-Item .env.production .env
# edit .env
npm run release:up
```

### 5. Build and start HTTPS stack (recommended)

Before running, ensure DNS A record points `APP_DOMAIN` to VPS public IP, and ports `80/443` are open.

Linux:

```bash
cd /opt/Restaurant-POS
cp .env.production .env
# edit .env (APP_DOMAIN, LETSENCRYPT_EMAIL, LICENSE_ACTIVATION_KEYS)
npm run release:up:ssl
```

Windows PowerShell:

```powershell
Set-Location C:\apps\Restaurant-POS
Copy-Item .env.production .env
# edit .env (APP_DOMAIN, LETSENCRYPT_EMAIL, LICENSE_ACTIVATION_KEYS)
npm run release:up:ssl
```

After startup, open:

- `https://<APP_DOMAIN>/setup`

### 6. First-install setup + license

- Open:
  - HTTP stack: `http://<VPS-IP>:3000/setup`
  - HTTPS stack: `https://<APP_DOMAIN>/setup`
- On first install, setup is blocked unless a valid activation key is provided.
- Generate a key locally when needed:

```bash
npm run license:key
```

Use the generated value in server `.env` as `LICENSE_ACTIVATION_KEYS`.

### 7. Operations

- View logs: `npm run release:logs`
- Stop stack: `npm run release:down`
- View HTTPS proxy logs: `npm run release:logs:ssl`
- Stop HTTPS stack: `npm run release:down:ssl`
- Update after pulling new code:
  - HTTP stack: `npm run release:up`
  - HTTPS stack: `npm run release:up:ssl`

### 8. Backup and persistence

- PostgreSQL data persists in Docker volume: `pos-db-data`
- HTTPS certificates persist in Docker volume: `caddy-data`
- Include this volume in your VPS backup routine.

### 10. WhatsApp daily report scheduler (optional)

To auto-send breakfast/lunch/dinner reports, configure WhatsApp values in `.env` and call this endpoint every minute:

- `POST /api/whatsapp-reports/schedule`
- Header: `x-scheduler-token: <WHATSAPP_REPORTS_SCHEDULER_TOKEN>`

Example Linux cron (every minute):

```bash
* * * * * curl -sS -X POST "https://<APP_DOMAIN>/api/whatsapp-reports/schedule" -H "x-scheduler-token: <TOKEN>" > /dev/null 2>&1
```

Example Windows Task Scheduler action (PowerShell):

```powershell
Invoke-RestMethod -Method Post -Uri "https://<APP_DOMAIN>/api/whatsapp-reports/schedule" -Headers @{"x-scheduler-token"="<TOKEN>"}
```

### 9. Copy-paste `.env` for Ubuntu VPS

If your `.env` looks empty in the editor, paste this block into `.env` and save:

```dotenv
# PostgreSQL connection string
# Use localhost when running Prisma/Node directly on Ubuntu host.
# If running inside Docker app container, use host `db` instead.
DATABASE_URL="postgresql://posuser:yoshie123@localhost:5432/vr_pos"

# First-run activation
LICENSE_ACTIVATION_KEYS="replace-with-your-activation-key"

# App behavior
NEXT_PUBLIC_DEMO_MODE="false"

# Safety toggles
ALLOW_SEED_IN_PRODUCTION="false"
ALLOW_RESTORE_IN_PRODUCTION="false"
ALLOW_BACKUP_IN_PRODUCTION="true"

# Docker Compose DB settings
POSTGRES_DB="vr_pos"
POSTGRES_USER="posuser"
POSTGRES_PASSWORD="yoshie123"

# HTTPS settings (update for your real domain)
APP_DOMAIN="your-pos-domain.com"
LETSENCRYPT_EMAIL="ops@your-pos-domain.com"
```

After saving `.env`, run:

```bash
npx prisma db pull
```

If you run Prisma inside Docker app container, use:

```dotenv
DATABASE_URL="postgresql://posuser:yoshie123@db:5432/vr_pos"
```
