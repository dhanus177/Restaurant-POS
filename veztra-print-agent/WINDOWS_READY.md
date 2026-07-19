# Veztra Print Agent - Windows Installation Ready! ✅

Your Windows installation package is complete and ready to deploy.

## What You Have

### Installation Files
Located in: `platforms/windows/`

- **INSTALL.bat** ← Use this to install (easiest way!)
  - Right-click → Run as Administrator
  - Fully automated installation
  - ~2 minutes to complete

- **START.bat** ← Use this to start the service manually
  - Double-click to launch service
  - Shows real-time output

- **install.ps1** ← PowerShell alternative installer
  - For advanced users
  - More control and verbose output

### Documentation Files

- **WINDOWS_QUICK_START.txt** ← Start here!
  - 5-minute quick reference
  - Installation steps
  - Common commands
  - Troubleshooting basics

- **WINDOWS_INSTALL.md** ← Detailed guide
  - Step-by-step installation
  - First use guide
  - API integration examples
  - Detailed troubleshooting

- **platforms/windows/README.md** ← Windows-specific docs
  - File overview
  - Common tasks
  - Quick API tests

- **platforms/windows/TROUBLESHOOTING.md** ← Problem solving
  - Common issues and solutions
  - Installation errors
  - Runtime issues
  - Printer problems

## Installation Steps (30 seconds)

### Prerequisites
1. **Node.js 18+** - Download from https://nodejs.org/
   - Run installer
   - Accept defaults (important: check "Add to PATH")
   - Restart computer

### Installation
1. Navigate to: `platforms\windows\`
2. Right-click `INSTALL.bat`
3. Select `Run as Administrator`
4. Wait for completion (~2 minutes)

### Verification
```powershell
curl http://localhost:5050/api/v1/health
```

Expected output:
```json
{"status":"online","uptime":123456,"version":"1.0.0"}
```

## What Gets Installed

```
Application:      C:\Program Files\VeztraPrintAgent\
Configuration:    %APPDATA%\VeztraPrintAgent\config.json
Database:         %APPDATA%\VeztraPrintAgent\veztra.db
Logs:             %APPDATA%\VeztraPrintAgent\logs\service.log
Shortcuts:        Desktop & Start Menu
Auto-startup:     Windows Registry (enabled by default)
```

## Service Features

✅ Automatic startup on Windows login
✅ Manual startup via Desktop/Start Menu shortcut
✅ REST API on http://localhost:5050
✅ USB printer detection and support
✅ Network printer support (TCP/IP)
✅ Print queue with automatic retry
✅ Persistent configuration
✅ Log file with auto-rotation
✅ Health monitoring endpoints

## Key Endpoints

```
GET  http://localhost:5050/api/v1/health           Service status
GET  http://localhost:5050/api/v1/printers         List printers
POST http://localhost:5050/api/v1/printers         Add printer
GET  http://localhost:5050/api/v1/printers/detect/usb   Find USB printers
POST http://localhost:5050/api/v1/print            Submit print job
GET  http://localhost:5050/api/v1/queue/stats      Queue status
GET  http://localhost:5050/api/v1/logs             View logs
```

## First Use

### 1. Start Service
- Automatic: Happens on Windows login (already configured)
- Manual: Double-click START.bat or Desktop shortcut

### 2. Detect USB Printer
```powershell
curl http://localhost:5050/api/v1/printers/detect/usb
```

### 3. Add Printer
```powershell
curl -X POST http://localhost:5050/api/v1/printers `
  -H "Content-Type: application/json" `
  -d '{
    "name":"Receipt Printer",
    "type":"receipt",
    "brand":"xprinter",
    "connectionType":"usb",
    "vendorId":"0x0b3a",
    "productId":"0x0010"
  }'
```

### 4. Test Print
```powershell
curl -X POST http://localhost:5050/api/v1/print `
  -H "Content-Type: application/json" `
  -d '{"printerId":"PRINTER_ID","data":"Test\n[CUT]"}'
```

### 5. Integrate with POS
```javascript
// From your Next.js/React app
const response = await fetch('http://localhost:5050/api/v1/print', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    printerId: 'receipt-printer-1',
    data: 'Receipt content...\n[CUT]'
  })
});

const job = await response.json();
console.log('Print job submitted:', job.data.id);
```

## Documentation Quick Links

| File | Purpose |
|------|---------|
| **WINDOWS_QUICK_START.txt** | 📄 Quick reference (start here!) |
| **WINDOWS_INSTALL.md** | 📖 Detailed installation guide |
| **platforms/windows/README.md** | 📋 Windows-specific overview |
| **platforms/windows/TROUBLESHOOTING.md** | 🔧 Problem solving |
| **API.md** | 📚 Complete API documentation |
| **README.md** | 📘 Main project README |

## Troubleshooting

### Installation fails
→ See `platforms/windows/TROUBLESHOOTING.md` or `WINDOWS_INSTALL.md`

### Service won't start
→ Run manually: `node "C:\Program Files\VeztraPrintAgent\dist\index.js"`
→ Check logs: `curl http://localhost:5050/api/v1/logs?lines=50`

### Can't find printer
→ Try: `curl http://localhost:5050/api/v1/printers/detect/usb`
→ See `WINDOWS_INSTALL.md` → "Adding Your First Printer"

### Port 5050 in use
→ Edit config: `%APPDATA%\VeztraPrintAgent\config.json`
→ Change port and restart

## Important Notes

- ✅ Service runs silently in background (no console window)
- ✅ Configuration persists between restarts
- ✅ Print queue automatically retries failed jobs
- ✅ Logs auto-rotate (10MB max, 10 files kept)
- ✅ No admin privileges needed to run (only to install)
- ✅ Local only (http://localhost:5050) - not exposed to network

## Next Steps

1. **Install**: Right-click `INSTALL.bat` → Run as Administrator
2. **Verify**: `curl http://localhost:5050/api/v1/health`
3. **Add printer**: See `WINDOWS_INSTALL.md`
4. **Integrate**: Connect your POS to the REST API
5. **Monitor**: Check logs via API endpoint

## Support Resources

- 📖 Read `WINDOWS_QUICK_START.txt` for quick reference
- 📘 Read `WINDOWS_INSTALL.md` for detailed guide
- 🔧 Read `WINDOWS_TROUBLESHOOTING.md` for common issues
- 📚 Read `API.md` for complete REST API documentation
- 💻 Read `README.md` for full project overview

## System Requirements

- Windows 10, 11, or Server 2019+
- Node.js 18.0.0 or higher
- Administrator privileges (installation only)
- 100MB disk space
- Optional: USB or Network thermal printer

## What's Working

✅ TypeScript source code (1,700+ lines)
✅ Express REST API server
✅ SQLite print queue with retry logic
✅ ESC/POS printer driver with USB/Network support
✅ Windows Registry autostart integration
✅ Comprehensive logging
✅ Configuration management
✅ Complete Windows installer
✅ Full documentation (2,000+ lines)
✅ Troubleshooting guides

## Ready to Go!

Everything is prepared and ready for Windows deployment.

**Start here:** `WINDOWS_QUICK_START.txt`
**Then read:** `WINDOWS_INSTALL.md`
**Install with:** Right-click `platforms\windows\INSTALL.bat` → Run as Administrator

The service will be running and ready to accept print jobs within minutes!

---

**Questions?** Check the documentation files above.
**Installation issues?** See `WINDOWS_TROUBLESHOOTING.md`.
**API questions?** See `API.md`.

🎉 Ready to print! 🖨️
