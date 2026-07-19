# Veztra Print Agent - Windows Installation Script
# Run with: powershell -ExecutionPolicy Bypass -File install.ps1

param(
    [string]$Version = "1.0.0",
    [string]$TargetPath = "C:\Program Files\VeztraPrintAgent"
)

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")
if (-not $isAdmin) {
    Write-Host "This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n=== Veztra Print Agent - Windows Installation ===" -ForegroundColor Green
Write-Host "Target Path: $TargetPath`n" -ForegroundColor Cyan

# Check if Node.js is installed FIRST
Write-Host "Step 1/6: Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  ✓ Found Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js is not installed" -ForegroundColor Red
    Write-Host "  Download and install Node.js 18+ from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Create directories
Write-Host "`nStep 2/6: Creating directories..." -ForegroundColor Yellow
try {
    New-Item -ItemType Directory -Force -Path $TargetPath | Out-Null
    New-Item -ItemType Directory -Force -Path "$env:APPDATA\VeztraPrintAgent" | Out-Null
    New-Item -ItemType Directory -Force -Path "$env:APPDATA\VeztraPrintAgent\logs" | Out-Null
    Write-Host "  ✓ Directories created" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Failed to create directories: $_" -ForegroundColor Red
    exit 1
}

# Get the source directory (where this script is running from)
$sourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent $sourceDir)

Write-Host "`nStep 3/6: Copying source files..." -ForegroundColor Yellow
if (-not (Test-Path "$projectRoot\package.json")) {
    Write-Host "  ✗ Could not find source files in: $projectRoot" -ForegroundColor Red
    Write-Host "  Make sure you're running this script from the veztra-print-agent folder" -ForegroundColor Yellow
    exit 1
}

try {
    # Copy all source files
    Copy-Item "$projectRoot\src" -Destination "$TargetPath\src" -Recurse -Force
    Copy-Item "$projectRoot\package.json" -Destination "$TargetPath\package.json" -Force
    Copy-Item "$projectRoot\tsconfig.json" -Destination "$TargetPath\tsconfig.json" -Force
    
    # Create empty dist folder
    New-Item -ItemType Directory -Force -Path "$TargetPath\dist" | Out-Null
    
    Write-Host "  ✓ Source files copied" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Failed to copy source files: $_" -ForegroundColor Red
    exit 1
}

# Install npm dependencies
Write-Host "`nStep 4/6: Installing npm dependencies..." -ForegroundColor Yellow
try {
    Push-Location $TargetPath
    Write-Host "  Installing packages..." -ForegroundColor Gray
    npm install --production 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ Failed to install dependencies" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
    Pop-Location
} catch {
    Write-Host "  ✗ Error during npm install: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Build TypeScript
Write-Host "`nStep 5/6: Compiling TypeScript..." -ForegroundColor Yellow
try {
    Push-Location $TargetPath
    Write-Host "  Compiling..." -ForegroundColor Gray
    npm run build 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ Failed to build application" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Write-Host "  ✓ TypeScript compiled successfully" -ForegroundColor Green
    Pop-Location
} catch {
    Write-Host "  ✗ Error during build: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Configure autostart and create shortcuts
Write-Host "`nStep 6/6: Configuring autostart and shortcuts..." -ForegroundColor Yellow
try {
    # Find Node.js executable path
    $nodeExePath = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
    if (-not $nodeExePath) {
        Write-Host "  Warning: Could not find node.exe in PATH, using 'node'" -ForegroundColor Yellow
        $nodeExePath = "node"
    }

    # Create registry entries for autostart
    $regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
    $regValue = "VeztraPrintAgent"
    $exePath = "$TargetPath\dist\index.js"
    $regCommand = """$nodeExePath"" ""$exePath"""
    
    Set-ItemProperty -Path $regPath -Name $regValue -Value $regCommand -ErrorAction Stop
    Write-Host "  ✓ Autostart configured" -ForegroundColor Green

    # Create start menu shortcut
    $startMenuPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
    New-Item -ItemType Directory -Force -Path $startMenuPath | Out-Null
    
    $WshShell = New-Object -ComObject WScript.Shell
    $shortcut = $WshShell.CreateShortcut("$startMenuPath\Veztra Print Agent.lnk")
    $shortcut.TargetPath = $nodeExePath
    $shortcut.Arguments = """$exePath"""
    $shortcut.WorkingDirectory = $TargetPath
    $shortcut.Description = "Veztra Print Agent - Background Printing Service"
    $shortcut.Save()
    Write-Host "  ✓ Start Menu shortcut created" -ForegroundColor Green

    # Create desktop shortcut
    $desktopPath = "$env:USERPROFILE\Desktop"
    if (Test-Path $desktopPath) {
        $shortcut = $WshShell.CreateShortcut("$desktopPath\Veztra Print Agent.lnk")
        $shortcut.TargetPath = $nodeExePath
        $shortcut.Arguments = """$exePath"""
        $shortcut.WorkingDirectory = $TargetPath
        $shortcut.Description = "Veztra Print Agent - Background Printing Service"
        $shortcut.Save()
        Write-Host "  ✓ Desktop shortcut created" -ForegroundColor Green
    }

} catch {
    Write-Host "  ✗ Error configuring autostart: $_" -ForegroundColor Red
    exit 1
}

# Success message
Write-Host "`n" + ("="*60) -ForegroundColor Green
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host ("="*60) -ForegroundColor Green
Write-Host "`nService Configuration:" -ForegroundColor Cyan
Write-Host "  URL: http://localhost:5050" -ForegroundColor White
Write-Host "  Config: $env:APPDATA\VeztraPrintAgent\config.json" -ForegroundColor White
Write-Host "  Logs: $env:APPDATA\VeztraPrintAgent\logs\service.log" -ForegroundColor White
Write-Host "  Database: $env:APPDATA\VeztraPrintAgent\veztra.db" -ForegroundColor White

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "  1. Start the service:" -ForegroundColor White
Write-Host "     & '$TargetPath\dist\index.js'" -ForegroundColor Gray
Write-Host "  2. Verify it's running:" -ForegroundColor White
Write-Host "     curl http://localhost:5050/api/v1/health" -ForegroundColor Gray
Write-Host "  3. Add your first printer:" -ForegroundColor White
Write-Host "     curl http://localhost:5050/api/v1/printers/detect/usb" -ForegroundColor Gray

Write-Host "`nAutostart:" -ForegroundColor Cyan
Write-Host "  ✓ Enabled - Service will start automatically on Windows boot" -ForegroundColor Green
Write-Host "  ✓ Find 'Veztra Print Agent' in Start Menu to run manually" -ForegroundColor Green

Write-Host "`n" + ("="*60) + "`n" -ForegroundColor Green
