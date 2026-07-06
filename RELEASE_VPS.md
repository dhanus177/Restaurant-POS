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

1. Copy `.env.example` to `.env`.
2. Set these values before first production run:
   - `SETUP_SECRET`
   - `LICENSE_ACTIVATION_KEYS`
   - `POSTGRES_PASSWORD`
3. For HTTPS stack also set:
  - `APP_DOMAIN` (public DNS name pointing to VPS)
  - `LETSENCRYPT_EMAIL`

> Note: the compose stack injects `DATABASE_URL` automatically to point at the internal `db` service.

### 2.1) One-command installers (recommended)

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
2. Create `.env` from `.env.example` if missing.
3. Validate required production variables are not placeholders.
4. Build and start the selected stack.

You can also run through npm wrappers:

- `npm run release:install:linux`
- `npm run release:install:http:linux`
- `npm run release:install:windows`
- `npm run release:install:http:windows`

### 3) Build and start HTTP stack (Linux VPS)

```bash
cd /opt/Restaurant-POS
cp .env.example .env
# edit .env
npm run release:up
```

### 4) Build and start HTTP stack (Windows VPS PowerShell)

```powershell
Set-Location C:\apps\Restaurant-POS
Copy-Item .env.example .env
# edit .env
npm run release:up
```

### 5) Build and start HTTPS stack (recommended)

Before running, ensure DNS A record points `APP_DOMAIN` to VPS public IP, and ports `80/443` are open.

Linux:

```bash
cd /opt/Restaurant-POS
cp .env.example .env
# edit .env (APP_DOMAIN, LETSENCRYPT_EMAIL, SETUP_SECRET, LICENSE_ACTIVATION_KEYS)
npm run release:up:ssl
```

Windows PowerShell:

```powershell
Set-Location C:\apps\Restaurant-POS
Copy-Item .env.example .env
# edit .env (APP_DOMAIN, LETSENCRYPT_EMAIL, SETUP_SECRET, LICENSE_ACTIVATION_KEYS)
npm run release:up:ssl
```

After startup, open:

- `https://<APP_DOMAIN>/setup`

### 6) First-install setup + license

- Open:
  - HTTP stack: `http://<VPS-IP>:3000/setup`
  - HTTPS stack: `https://<APP_DOMAIN>/setup`
- On first install, setup is blocked unless a valid activation key is provided.
- Generate a key locally when needed:

```bash
npm run license:key
```

Use the generated value in server `.env` as `LICENSE_ACTIVATION_KEYS`.

### 7) Operations

- View logs: `npm run release:logs`
- Stop stack: `npm run release:down`
- View HTTPS proxy logs: `npm run release:logs:ssl`
- Stop HTTPS stack: `npm run release:down:ssl`
- Update after pulling new code:
  - HTTP stack: `npm run release:up`
  - HTTPS stack: `npm run release:up:ssl`

### 8) Backup and persistence

- PostgreSQL data persists in Docker volume: `pos-db-data`
- HTTPS certificates persist in Docker volume: `caddy-data`
- Include this volume in your VPS backup routine.
