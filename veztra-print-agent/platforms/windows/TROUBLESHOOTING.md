# Windows Installation Troubleshooting Guide

## Installation Issues

### Error: "This script must be run as Administrator"

**Problem:** Script exits with administrator error

**Solution:**
1. Right-click `INSTALL.bat`
2. Select `Run as Administrator`
3. Click `Yes` when prompted

Alternatively, for PowerShell:
1. Right-click `PowerShell`
2. Select `Run as Administrator`
3. Navigate to the project folder
4. Run: `powershell -ExecutionPolicy Bypass -File platforms\windows\install.ps1`

---

### Error: "Node.js is not installed"

**Problem:** Script can't find Node.js

**Solution:**
1. Download Node.js LTS from https://nodejs.org/
2. Run the installer
3. Select "Add to PATH" (default option)
4. Complete installation
5. Restart your computer
6. Verify installation:
   ```
   node --version
   npm --version
   ```
7. Run the installer again

---

### Error: "Could not read package.json"

**Problem:** `npm error code ENOENT` during installation

**Solution:**
1. Make sure you extracted the full project folder
2. Check the folder contains: `src/`, `package.json`, `tsconfig.json`
3. Delete `C:\Program Files\VeztraPrintAgent\` completely
4. Run `INSTALL.bat` again

If running from PowerShell:
1. Make sure you're in the project root directory
2. Run from the correct path:
   ```
   cd C:\path\to\veztra-print-agent
   powershell -ExecutionPolicy Bypass -File platforms\windows\install.ps1
   ```

---

### Error: "Failed to install dependencies"

**Problem:** npm install fails

**Solution:**
1. Check internet connection is working
2. Try installing again - npm sometimes has temporary issues
3. Clear npm cache:
   ```
   npm cache clean --force
   ```
4. Delete `node_modules` folder and try again:
   ```
   rmdir /s /q node_modules
   npm install
   ```

---

### Error: "Failed to build application" / "TypeScript compilation failed"

**Problem:** TypeScript compiler errors

**Solution:**
1. Check Node.js version is 18+:
   ```
   node --version
   ```
2. Install TypeScript tools:
   ```
   npm install -g typescript
   ```
3. Try building manually:
   ```
   cd C:\Program Files\VeztraPrintAgent
   npm run build
   ```
4. Check for error messages in output
5. If still failing, delete and reinstall:
   ```
   rmdir /s /q C:\Program Files\VeztraPrintAgent
   ```
   Then run `INSTALL.bat` again

---

## Runtime Issues

### Service Won't Start

**Problem:** Service starts but immediately stops, or won't start at all

**Diagnosis:**
```powershell
# Try to start manually
node "C:\Program Files\VeztraPrintAgent\dist\index.js"
```

**Check logs:**
```powershell
Get-Content -Path "$env:APPDATA\VeztraPrintAgent\logs\service.log" -Tail 30
```

**Common causes:**

1. **Port 5050 already in use**
   ```powershell
   # Find what's using port 5050
   netstat -ano | findstr :5050
   
   # Kill the process (replace 1234 with PID)
   taskkill /PID 1234 /F
   ```
   
   Or configure different port:
   ```json
   {
     "server": {
       "port": 5051
     }
   }
   ```

2. **Permission issues**
   - Run from elevated command prompt (Run as Administrator)
   - Ensure `%APPDATA%\VeztraPrintAgent\` is writable

3. **Node.js process not found**
   ```powershell
   # Check if node.exe is in PATH
   Get-Command node.exe
   
   # If not found, reinstall Node.js and make sure to "Add to PATH"
   ```

---

### Health Check Returns "offline"

**Problem:** `curl http://localhost:5050/api/v1/health` shows status: offline

**Solution:**
1. Service is running but unhealthy - check logs:
   ```powershell
   curl "http://localhost:5050/api/v1/logs?lines=50"
   ```

2. Check printer connections - if all printers disconnected, service might be offline

3. Restart the service:
   ```powershell
   taskkill /F /IM node.exe
   # Wait 2 seconds
   node "C:\Program Files\VeztraPrintAgent\dist\index.js"
   ```

---

### Can't Connect to Service (Connection Refused)

**Problem:** `curl http://localhost:5050/api/v1/health` returns "Connection refused"

**Solution:**

1. Check if service is running:
   ```powershell
   Get-Process node -ErrorAction SilentlyContinue
   ```

2. If not running, start it manually:
   ```powershell
   node "C:\Program Files\VeztraPrintAgent\dist\index.js"
   ```

3. If error appears, check logs:
   ```powershell
   Get-Content "$env:APPDATA\VeztraPrintAgent\logs\service.log"
   ```

4. Check firewall isn't blocking port 5050:
   - Windows Security → Firewall & Network Protection
   - Advanced Settings → Inbound Rules
   - Look for port 5050 rules

5. Check if port is available:
   ```powershell
   netstat -an | findstr :5050
   ```

---

## Printer Issues

### Can't Find Connected Printer

**Problem:** `curl http://localhost:5050/api/v1/printers/detect/usb` returns empty list

**Solution:**

1. **Check printer is connected**
   - Device Manager → Universal Serial Bus Controllers
   - Look for your printer name or "Unknown Device"

2. **Check printer drivers**
   - Device Manager → Printers
   - Right-click printer → Update driver
   - Select "Search automatically for drivers"

3. **Get printer details manually**
   - Device Manager → right-click printer → Properties
   - Details tab → Hardware IDs
   - Note the Vendor ID (VID) and Product ID (PID)
   - Example: `USB\VID_0B3A&PID_0010`
   - VID = 0x0B3A, PID = 0x0010

4. **Add printer manually with known IDs**
   ```powershell
   $printer = @{
       name = "My Printer"
       type = "receipt"
       brand = "generic"
       connectionType = "usb"
       vendorId = "0x0b3a"
       productId = "0x0010"
   } | ConvertTo-Json
   
   curl -X POST http://localhost:5050/api/v1/printers `
     -ContentType "application/json" `
     -Body $printer
   ```

---

### Can't Connect to Network Printer

**Problem:** Network printer added but can't print or test fails

**Solution:**

1. **Verify printer IP address**
   - Printer control panel or web interface
   - Or from your router's device list
   - Ping the printer: `ping 192.168.1.100`

2. **Verify connectivity**
   - Open browser: `http://192.168.1.100:9100` (or your printer's port)
   - Should reach printer

3. **Check firewall**
   - Port 9100 (typical ESC/POS port) might be blocked
   - Windows Security → Allow an app through firewall

4. **Verify port number**
   - Check printer's network configuration
   - Common ports: 9100 (ESC/POS), 515 (LPD), 631 (CUPS)

5. **Test manually**
   ```powershell
   # Test connectivity
   Test-NetConnection -ComputerName 192.168.1.100 -Port 9100 -InformationLevel "Detailed"
   ```

---

### Test Print Fails or Hangs

**Problem:** Test print doesn't work, times out, or fails silently

**Solution:**

1. **Check printer is online**
   ```powershell
   curl http://localhost:5050/api/v1/printers
   ```
   Look for printer with `"status": "online"`

2. **Check printer queue**
   ```powershell
   curl http://localhost:5050/api/v1/queue/stats
   ```

3. **Check logs for errors**
   ```powershell
   curl "http://localhost:5050/api/v1/logs?lines=50"
   ```

4. **Verify printer capabilities**
   - Make sure printer supports ESC/POS
   - Check if paper is loaded
   - Check for any error lights on printer

5. **Try simple test data**
   ```powershell
   $job = @{
       printerId = "your-printer-id"
       data = "TEST`n[CUT]"
   } | ConvertTo-Json
   
   curl -X POST http://localhost:5050/api/v1/print `
     -ContentType "application/json" `
     -Body $job
   ```

---

### Printer Keeps Going Offline

**Problem:** Printer shows online then offline intermittently

**Solution:**

1. **Check USB cable** (if USB printer)
   - Try different USB port
   - Try different USB cable

2. **Check network stability** (if network printer)
   - Check WiFi signal strength
   - Check Ethernet connection
   - Restart printer

3. **Reduce health check interval** in config.json:
   ```json
   {
     "services": {
       "healthCheckInterval": 30000
     }
   }
   ```

4. **Check printer logs**
   ```powershell
   curl "http://localhost:5050/api/v1/logs?lines=100" | findstr "error|offline"
   ```

---

## Configuration Issues

### Service Uses Wrong Configuration

**Problem:** Changes to config.json aren't taking effect

**Solution:**

1. **Restart service** - configuration is loaded at startup:
   ```powershell
   taskkill /F /IM node.exe
   # Wait 2 seconds
   node "C:\Program Files\VeztraPrintAgent\dist\index.js"
   ```

2. **Check config file syntax** - invalid JSON will be ignored:
   - Use JSON validator: https://jsonlint.com/
   - Or view in VS Code with JSON validation

3. **Verify config file location**
   ```powershell
   dir "$env:APPDATA\VeztraPrintAgent\config.json"
   ```

4. **Check config was saved properly**
   ```powershell
   Get-Content "$env:APPDATA\VeztraPrintAgent\config.json" | ConvertFrom-Json
   ```

---

### Can't Edit Configuration

**Problem:** `config.json` is locked or read-only

**Solution:**

1. **Make sure service is stopped**
   ```powershell
   taskkill /F /IM node.exe
   ```

2. **Remove read-only flag**
   ```powershell
   $file = "$env:APPDATA\VeztraPrintAgent\config.json"
   (Get-Item $file).Attributes = 'Normal'
   ```

3. **Edit with admin privileges**
   - Right-click file
   - Open with Notepad (Run as Administrator)

4. **Restart service after changes**

---

## Autostart Issues

### Service Doesn't Auto-Start on Boot

**Problem:** Service doesn't start when Windows boots

**Solution:**

1. **Check registry entry**
   ```powershell
   Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "VeztraPrintAgent"
   ```

2. **If missing, re-add it**
   ```powershell
   $regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
   $nodeExePath = (Get-Command node.exe).Source
   Set-ItemProperty -Path $regPath -Name "VeztraPrintAgent" `
     -Value """$nodeExePath"" ""C:\Program Files\VeztraPrintAgent\dist\index.js"""
   ```

3. **Disable and re-enable**
   ```powershell
   # Remove
   Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "VeztraPrintAgent"
   
   # Re-add by running installer again
   powershell -ExecutionPolicy Bypass -File platforms\windows\install.ps1
   ```

---

### Want to Disable Autostart?

```powershell
Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "VeztraPrintAgent"
```

### Want to Re-Enable Autostart?

```powershell
powershell -ExecutionPolicy Bypass -File platforms\windows\install.ps1
```

---

## Performance Issues

### Service Uses High CPU

**Problem:** Service consuming 50%+ CPU

**Solution:**

1. **Check health check interval** - if too frequent:
   ```json
   {
     "services": {
       "healthCheckInterval": 60000
     }
   }
   ```

2. **Check print queue** - if too many jobs:
   ```powershell
   curl http://localhost:5050/api/v1/queue/stats
   ```
   Clear failed jobs:
   ```powershell
   curl -X DELETE http://localhost:5050/api/v1/queue/cleanup
   ```

3. **Check for runaway processes**
   ```powershell
   Get-Process node | Sort-Object CPU -Descending | Format-Table Name, CPU, Memory
   ```

---

### Service Uses High Memory

**Problem:** Service memory usage growing over time (memory leak)

**Solution:**

1. **Restart service periodically**
   ```powershell
   taskkill /F /IM node.exe
   # Wait 2 seconds
   node "C:\Program Files\VeztraPrintAgent\dist\index.js"
   ```

2. **Clean up old completed jobs**
   ```powershell
   curl -X DELETE http://localhost:5050/api/v1/queue/cleanup
   ```

3. **Check database size**
   ```powershell
   dir "$env:APPDATA\VeztraPrintAgent\veztra.db"
   ```

---

## Getting Help

### View All Logs

```powershell
Get-Content "$env:APPDATA\VeztraPrintAgent\logs\service.log"
```

### View Recent Logs

```powershell
Get-Content "$env:APPDATA\VeztraPrintAgent\logs\service.log" -Tail 50
```

### Search Logs for Errors

```powershell
Select-String -Path "$env:APPDATA\VeztraPrintAgent\logs\service.log" -Pattern "error|ERROR|Error|failed|FAILED"
```

### View System Information

```powershell
curl http://localhost:5050/api/v1/system/info | ConvertFrom-Json
```

### Create Log File for Support

```powershell
Get-Content "$env:APPDATA\VeztraPrintAgent\logs\service.log" | Out-File -FilePath "C:\Users\YourUsername\Desktop\veztra-logs.txt"
```

---

## Quick Fix Commands

```powershell
# Restart service
taskkill /F /IM node.exe

# Clear config (will reset to defaults)
Remove-Item "$env:APPDATA\VeztraPrintAgent\config.json"

# Clear database (WARNING: deletes print queue!)
Remove-Item "$env:APPDATA\VeztraPrintAgent\veztra.db"

# Clear logs
Remove-Item "$env:APPDATA\VeztraPrintAgent\logs\*"

# Uninstall completely
taskkill /F /IM node.exe
Remove-Item "C:\Program Files\VeztraPrintAgent" -Recurse -Force
Remove-Item "$env:APPDATA\VeztraPrintAgent" -Recurse -Force
Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "VeztraPrintAgent"
```

---

## Still Not Working?

1. Check all the guides:
   - `WINDOWS_INSTALL.md` - Installation guide
   - `README.md` - Main documentation
   - `API.md` - API reference

2. Check service logs:
   ```powershell
   curl "http://localhost:5050/api/v1/logs?lines=100"
   ```

3. Run service manually to see errors:
   ```powershell
   node "C:\Program Files\VeztraPrintAgent\dist\index.js"
   ```

4. Check Windows Event Viewer for system errors
5. Verify Node.js version: `node --version` (should be 18+)
