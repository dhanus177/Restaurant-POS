# Veztra Print Agent - Windows Installation Files

This folder contains all the Windows-specific installation and startup scripts.

## Files Overview

### Installation

- **INSTALL.bat** - Main installer (recommended - easiest way)
  - Right-click and select "Run as Administrator"
  - Automatically checks prerequisites
  - Installs everything in one go
  - Creates shortcuts and configures autostart

- **install.ps1** - PowerShell installer (alternative)
  - Run from PowerShell as Administrator
  - More detailed output
  - Command: `powershell -ExecutionPolicy Bypass -File install.ps1`

### Runtime

- **START.bat** - Quick start launcher
  - Manually start the service
  - Useful for testing or if autostart is disabled
  - Shows the running service logs

### Configuration

- **veztra-print-agent.service** - (Linux only, not used on Windows)

## Installation Steps (TL;DR)

### Step 1: Prerequisites
```
✓ Windows 10, 11, or Server 2019+
✓ Node.js 18+ (from https://nodejs.org/)
✓ Administrator access
```

### Step 2: Install Application
```
Right-click INSTALL.bat → Run as Administrator
```

### Step 3: Verify
```
curl http://localhost:5050/api/v1/health
```

### Step 4: Add Printer & Print
```
See: WINDOWS_INSTALL.md (in parent directory)
```

## What Gets Installed

**Application Directory:**
```
C:\Program Files\VeztraPrintAgent\
  ├── dist/                    (compiled JavaScript)
  ├── src/                     (TypeScript source)
  ├── node_modules/            (dependencies)
  ├── package.json
  └── tsconfig.json
```

**User Configuration:**
```
%APPDATA%\VeztraPrintAgent\
  ├── config.json              (printer configuration)
  ├── veztra.db                (print queue database)
  └── logs/
      └── service.log          (application logs)
```

**Windows Registry:**
```
HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run
  → VeztraPrintAgent: node.exe "C:\Program Files\VeztraPrintAgent\dist\index.js"
```

**Shortcuts:**
```
Desktop:          Veztra Print Agent.lnk
Start Menu:       Veztra Print Agent.lnk
```

## Common Tasks

### Start Service Manually
```
Double-click: START.bat
Or run:       node "C:\Program Files\VeztraPrintAgent\dist\index.js"
```

### Stop Service
```
Press Ctrl+C if running from command line
Or: taskkill /F /IM node.exe
```

### View Logs
```
PowerShell:   Get-Content "$env:APPDATA\VeztraPrintAgent\logs\service.log" -Tail 50
Web API:      curl "http://localhost:5050/api/v1/logs?lines=50"
```

### View Configuration
```
PowerShell:   cat "$env:APPDATA\VeztraPrintAgent\config.json"
Notepad:      Open %APPDATA%\VeztraPrintAgent\config.json
```

### Uninstall
```
PowerShell (as Administrator):
  taskkill /F /IM node.exe
  Remove-Item "C:\Program Files\VeztraPrintAgent" -Recurse -Force
  Remove-Item "$env:APPDATA\VeztraPrintAgent" -Recurse -Force
  Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "VeztraPrintAgent"
```

## Troubleshooting

### "Run as Administrator" Error
- Right-click INSTALL.bat
- Select "Run as Administrator"
- If that doesn't work, open PowerShell as Administrator first

### Node.js Not Found
- Download from https://nodejs.org/
- Install (accept default settings)
- Restart your computer
- Run INSTALL.bat again

### Port 5050 Already in Use
Edit `%APPDATA%\VeztraPrintAgent\config.json`:
```json
{
  "server": {
    "port": 5051
  }
}
```

### Service Won't Start
1. Check Node.js is installed: `node --version`
2. Check logs: `Get-Content "$env:APPDATA\VeztraPrintAgent\logs\service.log" -Tail 20`
3. Run manually: `node "C:\Program Files\VeztraPrintAgent\dist\index.js"`

## Support

Full documentation:
- **WINDOWS_INSTALL.md** - Detailed Windows installation guide
- **../README.md** - Main project README
- **../API.md** - Complete API reference
- **../TROUBLESHOOTING.md** - Troubleshooting guide

## Quick API Test

```powershell
# Health check
curl http://localhost:5050/api/v1/health

# Detect USB printers
curl http://localhost:5050/api/v1/printers/detect/usb

# List all printers
curl http://localhost:5050/api/v1/printers

# Queue status
curl http://localhost:5050/api/v1/queue/stats

# View logs
curl "http://localhost:5050/api/v1/logs?lines=20"
```

## Important Notes

- Service runs in the background automatically after installation
- Configuration is stored in `%APPDATA%\VeztraPrintAgent\`
- Database (print queue) is stored in `veztra.db`
- Logs are rotated automatically (10MB max, 10 files kept)
- Service auto-starts on Windows login (can be disabled in Registry)

---

**Ready to install?** → Run `INSTALL.bat` as Administrator

**Ready to start?** → Run `START.bat` or double-click the Desktop shortcut
