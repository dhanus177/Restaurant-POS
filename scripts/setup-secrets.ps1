$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
$EnvLocal = Join-Path $RootDir ".env.local"
$EnvFile = Join-Path $RootDir ".env"

function New-Secret {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  [Convert]::ToBase64String($bytes)
}

function Upsert-Key {
  param(
    [string]$FilePath,
    [string]$Key,
    [string]$Value
  )

  if (!(Test-Path $FilePath)) {
    New-Item -ItemType File -Path $FilePath -Force | Out-Null
  }

  $content = Get-Content -Path $FilePath -Raw
  if ($content -match "(?m)^$Key=") {
    $content = [Regex]::Replace($content, "(?m)^$Key=.*$", "$Key=$Value")
  } else {
    if ($content.Length -gt 0 -and -not $content.EndsWith("`n")) { $content += "`r`n" }
    $content += "$Key=$Value`r`n"
  }
  Set-Content -Path $FilePath -Value $content -NoNewline
}

$nextAuthSecret = New-Secret
$jwtSecret = New-Secret

Upsert-Key -FilePath $EnvLocal -Key "NEXTAUTH_SECRET" -Value $nextAuthSecret
Upsert-Key -FilePath $EnvFile -Key "JWT_SECRET" -Value $jwtSecret

Write-Host "Done."
Write-Host "Updated:"
Write-Host " - $EnvLocal (NEXTAUTH_SECRET)"
Write-Host " - $EnvFile (JWT_SECRET)"
