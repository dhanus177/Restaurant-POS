param(
  [ValidateSet('http', 'ssl')]
  [string]$Mode = 'ssl'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RootDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$EnvFile = Join-Path $RootDir '.env'
$EnvTemplate = Join-Path $RootDir '.env.production'

function Write-Log {
  param([string]$Message)
  Write-Host "[install-windows] $Message"
}

function Fail {
  param([string]$Message)
  throw "[install-windows] ERROR: $Message"
}

function Get-EnvValue {
  param([string]$Key)

  if (!(Test-Path $EnvFile)) { return '' }

  $line = Select-String -Path $EnvFile -Pattern "^$Key=" | Select-Object -Last 1
  if ($null -eq $line) { return '' }

  $value = $line.Line.Substring($line.Line.IndexOf('=') + 1).Trim()
  $value = $value.Trim('"')
  return $value
}

function Test-MissingOrPlaceholder {
  param(
    [string]$Key,
    [string]$Value
  )

  if ([string]::IsNullOrWhiteSpace($Value)) { return $true }

  switch ($Key) {
    'SETUP_SECRET' { return @('change-this-setup-secret', 'local-setup-secret') -contains $Value }
    'LICENSE_ACTIVATION_KEYS' { return @('replace-with-your-activation-key', 'LOCAL-DEV-KEY') -contains $Value }
    'POSTGRES_PASSWORD' { return @('change-me-strong-password', 'posdb_pass_2026', 'your_password_here') -contains $Value }
    'APP_DOMAIN' { return $Value -eq 'pos.example.com' -or $Value -eq 'example.com' -or $Value.EndsWith('example.com') }
    'LETSENCRYPT_EMAIL' { return $Value -eq 'admin@example.com' -or -not $Value.Contains('@') }
    default { return $false }
  }
}

function Validate-Key {
  param([string]$Key)

  $value = Get-EnvValue -Key $Key
  if (Test-MissingOrPlaceholder -Key $Key -Value $value) {
    Fail "Please set a real value for $Key in .env before continuing."
  }
}

if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
  Fail "Docker not found. Install Docker Desktop/Engine first."
}

docker compose version | Out-Null

if (!(Test-Path $EnvFile)) {
  if (!(Test-Path $EnvTemplate)) {
    Fail 'Missing .env.production'
  }

  Copy-Item $EnvTemplate $EnvFile
  Write-Log 'Created .env from .env.production'
}

Validate-Key -Key 'SETUP_SECRET'
Validate-Key -Key 'LICENSE_ACTIVATION_KEYS'
Validate-Key -Key 'POSTGRES_PASSWORD'

if ($Mode -eq 'ssl') {
  Validate-Key -Key 'APP_DOMAIN'
  Validate-Key -Key 'LETSENCRYPT_EMAIL'
  $composeFile = Join-Path $RootDir 'deploy/docker-compose.vps.ssl.yml'
} else {
  $composeFile = Join-Path $RootDir 'deploy/docker-compose.vps.yml'
}

Write-Log "Starting deployment in '$Mode' mode..."
docker compose -f $composeFile up -d --build

if ($Mode -eq 'ssl') {
  $domain = Get-EnvValue -Key 'APP_DOMAIN'
  Write-Log "Deployment complete. Open: https://$domain/setup"
} else {
  Write-Log 'Deployment complete. Open: http://<VPS-IP>:3000/setup'
}
