# Veztra Print Agent - Windows Installation Guide

Complete step-by-step guide to install Veztra Print Agent on Windows.

## Prerequisites

- **Windows 10, 11, or Server 2019+**
- **Node.js 18.0.0 or higher** (LTS version recommended)
- **Administrator privileges** on your computer
- **USB or Network thermal printer** (optional, for testing)

## Quick Installation (5 Minutes)

### Step 1: Install Node.js

1. Download Node.js LTS from https://nodejs.org/
2. Run the installer
3. Accept default settings
4. Restart your computer (optional but recommended)
5. Verify installation:
   ```
   node --version
   npm --version
   ```

### Step 2: Download Veztra Print Agent

Download or clone the Veztra Print Agent project:
- Extract to any location (e.g., `C:\Veztra` or `%USERPROFILE%\Downloads\veztra-print-agent`)

### Step 3: Run the Installer

**Option A: Easy Way (Recommended)**
1. Navigate to: `platforms\windows\`
2. Right-click `INSTALL.bat`
3. Select `Run as Administrator`
4. Wait for the script to complete
5. When done, press any key to close the window

**Option B: PowerShell Way**
1. Open PowerShell as Administrator
2. Navigate to the project folder:
   ```powershell
   cd C:\path\to\veztra-print-agent
   ```
3. Run the installer:
   ```powershell
   powershell -ExecutionPolicy Bypass -File platforms\windows\install.ps1
   ```
4. Wait for completion

### Step 4: Verify Installation

Open PowerShell or Command Prompt and run:
```powershell
curl http://localhost:5050/api/v1/health
```

You should see:
```json
{"status":"online","uptime":...,"version":"1.0.0"}
```

If this doesn't work immediately, wait 5 seconds and try again - the service needs time to start.

## Installation Details

### What the Installer Does

✓ Checks Node.js installation
✓ Creates directories:
  - `C:\Program Files\VeztraPrintAgent\` - Application files
  - `%APPDATA%\VeztraPrintAgent\` - Configuration and logs
✓ Copies source files
✓ Installs npm dependencies
✓ Compiles TypeScript to JavaScript
✓ Creates Desktop and Start Menu shortcuts
✓ Configures Windows Registry for autostart
✓ Sets service to automatically start on Windows boot

### Installation Locations

| Component | Location |
|-----------|----------|
| **Application Files** | `C:\Program Files\VeztraPrintAgent` |
| **Configuration** | `%APPDATA%\VeztraPrintAgent\config.json` |
| **Database** | `%APPDATA%\VeztraPrintAgent\veztra.db` |
| **Logs** | `%APPDATA%\VeztraPrintAgent\logs\service.log` |
| **Shortcuts** | Desktop & Start Menu |
| **Autostart** | Windows Registry |

### Autostart Registry Entry

The installer automatically creates this registry entry:
```
HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run
Name: VeztraPrintAgent
Value: node.exe "C:\Program Files\VeztraPrintAgent\dist\index.js"
```

This means the service will automatically start when you log in to Windows.

## Starting the Service

### Automatic (After Boot)
- Service starts automatically when you log in to Windows
- Check if it's running: `curl http://localhost:5050/api/v1/health`

### Manual Start
**From Desktop or Start Menu:**
1. Find "Veztra Print Agent" shortcut
2. Double-click to start

**From Command Line:**
```powershell
node "C:\Program Files\VeztraPrintAgent\dist\index.js"
```

**From Start Menu:**
1. Press Windows Key
2. Type "Veztra Print Agent"
3. Press Enter

## Stopping the Service

### Using Task Manager
1. Press `Ctrl + Shift + Esc` to open Task Manager
2. Find "node.exe" in the list
3. Right-click and select "End Task"

### Using Command Line
```powershell
taskkill /F /IM node.exe
```

### Disable Autostart
1. Press `Win + R`
2. Type `regedit`
3. Navigate to: `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`
4. Delete the entry named "VeztraPrintAgent"

## First Use: Adding Your First Printer

### Detect USB Printers

```powershell
curl http://localhost:5050/api/v1/printers/detect/usb
```

Output:
```json
{
  "success": true,
  "data": [
    {
      "name": "USB Printer",
      "vendorId": "0x0b3a",
      "productId": "0x0010",
      "serialNumber": "1234567890"
    }
  ]
}
```

### Add USB Printer

```powershell
$printer = @{
    name = "Receipt Printer"
    type = "receipt"
    brand = "xprinter"
    connectionType = "usb"
    vendorId = "0x0b3a"
    productId = "0x0010"
} | ConvertTo-Json

curl -X POST http://localhost:5050/api/v1/printers `
  -ContentType "application/json" `
  -Body $printer
```

### Add Network Printer

```powershell
$printer = @{
    name = "Kitchen Printer"
    type = "kitchen"
    brand = "epson"
    connectionType = "network"
    host = "192.168.1.100"
    port = 9100
} | ConvertTo-Json

curl -X POST http://localhost:5050/api/v1/printers `
  -ContentType "application/json" `
  -Body $printer
```

### Test Print

```powershell
curl -X POST http://localhost:5050/api/v1/print `
  -ContentType "application/json" `
  -Body '{
    "printerId": "your-printer-id",
    "data": "Test Print\n---\nIf you see this, it works!\n[CUT]"
  }'
```

## Troubleshooting

### Installation Failed - npm install Error

**Problem:** `npm error code ENOENT`

**Solution:**
1. Make sure you're running as Administrator
2. Check Node.js is installed: `node --version`
3. Delete `C:\Program Files\VeztraPrintAgent\` 
4. Run installer again

### Service Won't Start

**Problem:** `curl http://localhost:5050/api/v1/health` times out

**Solution:**
1. Check if the service is running:
   ```powershell
   Get-Process node -ErrorAction SilentlyContinue
   ```
2. If not running, start it manually:
   ```powershell
   node "C:\Program Files\VeztraPrintAgent\dist\index.js"
   ```
3. Check for errors in logs:
   ```powershell
   Get-Content -Path "$env:APPDATA\VeztraPrintAgent\logs\service.log" -Tail 20
   ```

### Port 5050 Already in Use

**Problem:** `EADDRINUSE: address already in use :::5050`

**Solution:**
1. Find which process is using port 5050:
   ```powershell
   netstat -ano | findstr :5050
   ```
2. Kill the process (replace 1234 with the PID):
   ```powershell
   taskkill /PID 1234 /F
   ```
3. Or configure different port in `%APPDATA%\VeztraPrintAgent\config.json`:
   ```json
   {
     "server": {
       "port": 5051
     }
   }
   ```

### Can't Find Printer

**Problem:** `curl http://localhost:5050/api/v1/printers/detect/usb` returns empty list

**Solution:**
1. Make sure printer is connected via USB
2. Check Windows Device Manager:
   - Right-click Start Menu → Device Manager
   - Look for "USB Printing Support" or similar
3. Get vendor ID and product ID:
   - Device Manager → right-click printer → Properties
   - Details tab → Hardware ID
4. Manually add printer with correct vendor/product ID

### View Logs

All errors are logged to:
```
%APPDATA%\VeztraPrintAgent\logs\service.log
```

View in PowerShell:
```powershell
# Last 50 lines
Get-Content -Path "$env:APPDATA\VeztraPrintAgent\logs\service.log" -Tail 50

# Or use curl
curl "http://localhost:5050/api/v1/logs?lines=50"
```

### Uninstall

1. Stop the service:
   ```powershell
   taskkill /F /IM node.exe
   ```
2. Delete application folder:
   ```powershell
   Remove-Item "C:\Program Files\VeztraPrintAgent" -Recurse -Force
   ```
3. Remove from autostart:
   ```powershell
   Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "VeztraPrintAgent"
   ```
4. Delete config and logs:
   ```powershell
   Remove-Item "$env:APPDATA\VeztraPrintAgent" -Recurse -Force
   ```

## Integration with POS System

### From Your Next.js POS

```javascript
// Submit print job
async function submitPrintJob(printerId, receiptData) {
  const response = await fetch('http://localhost:5050/api/v1/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      printerId: printerId,
      data: receiptData
    })
  });

  if (!response.ok) {
    throw new Error(`Print job failed: ${response.statusText}`);
  }

  const job = await response.json();
  return job.data.id; // Returns job ID for tracking
}

// Check job status
async function getJobStatus(jobId) {
  const response = await fetch(`http://localhost:5050/api/v1/print/${jobId}`);
  const data = await response.json();
  return data.data.status; // 'pending', 'printing', 'success', or 'failed'
}
```

### API Endpoints Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/health` | GET | Service health check |
| `/api/v1/printers` | GET | List all printers |
| `/api/v1/printers` | POST | Add new printer |
| `/api/v1/printers/:id` | DELETE | Remove printer |
| `/api/v1/printers/:id/test` | POST | Test printer |
| `/api/v1/printers/detect/usb` | GET | Find USB printers |
| `/api/v1/print` | POST | Submit print job |
| `/api/v1/print/:jobId` | GET | Get job status |
| `/api/v1/queue/stats` | GET | Queue statistics |
| `/api/v1/logs` | GET | View application logs |

## Next Steps

1. **Configure your POS system** to send print requests to `http://localhost:5050/api/v1/print`
2. **Add your printers** using the API or check `WINDOWS_INSTALL.md` for detailed instructions
3. **Monitor** using the health endpoint or log file
4. **Integrate** with your application for automatic printing

## Support

For detailed API documentation, see: `API.md`
For more help, see: `README.md` and `TROUBLESHOOTING.md`

For more details about the service, check:
- `API.md` - Complete REST API reference
- `TROUBLESHOOTING.md` - Common problems and solutions
- `DEVELOPMENT.md` - For developers extending the service
