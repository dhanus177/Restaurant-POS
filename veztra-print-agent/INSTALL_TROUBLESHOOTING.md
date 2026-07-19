# Veztra Print Agent - Installation Troubleshooting

## Batch File Not Running

### Issue 1: "Administrator privileges required"
**Problem:** The script says you're not running as Administrator

**Solution:**
1. Close the batch file
2. Right-click INSTALL.bat (not left-click)
3. Select "Run as Administrator" (not "Run")
4. Click "Yes" when prompted

### Issue 2: Batch file closes immediately
**Problem:** Window closes too fast to see errors

**Solution:**
1. Hold down SHIFT and right-click in the folder
2. Select "Open PowerShell window here" or "Command Prompt here"
3. Type: `INSTALL.bat`
4. Press Enter

Or double-click INSTALL_SIMPLE.bat which doesn't close automatically

### Issue 3: "Node.js not found"
**Problem:** Script can't find Node.js even though it's installed

**Solution:**
```batch
REM Test in Command Prompt:
node --version

REM If that doesn't work, Node.js is not in PATH
REM Restart your computer after installing Node.js
REM Or add it to PATH manually:
REM 1. Search for "Environment Variables"
REM 2. Click "Edit the system environment variables"
REM 3. Click "Environment Variables"
REM 4. Find "Path" in System variables
REM 5. Click "Edit" and add: C:\Program Files\nodejs\
REM 6. Restart Command Prompt and try again
```

### Issue 4: Source files not found
**Problem:** "Source files not found in veztra-print-agent folder"

**Solution:**
- Make sure you're in the correct folder
- The folder should contain: `src/`, `package.json`, `tsconfig.json`
- Navigate in Command Prompt:
  ```batch
  cd C:\path\to\veztra-print-agent
  dir src
  dir package.json
  ```

### Issue 5: npm install fails
**Problem:** "npm install failed" error

**Solution:**

Option 1: Retry manually
```batch
cd C:\Program Files\VeztraPrintAgent
npm install --production
```

Option 2: Clear npm cache and retry
```batch
npm cache clean --force
npm install --production
```

Option 3: Check npm version
```batch
npm --version
node --version
```

Make sure Node.js is 18+

### Issue 6: Build fails
**Problem:** "Build failed" during TypeScript compilation

**Solution:**
```batch
cd C:\Program Files\VeztraPrintAgent
npm run build
```

If it shows specific errors, you may have a file issue. Try:
```batch
rmdir dist /s /q
npm run build
```

---

## Manual Installation Steps

If the batch file isn't working, do it manually:

### Step 1: Open Command Prompt as Administrator
1. Press `Win + R`
2. Type `cmd`
3. Press `Ctrl + Shift + Enter` (opens as Administrator)

### Step 2: Copy Source Files
```batch
mkdir "C:\Program Files\VeztraPrintAgent"
cd C:\path\to\veztra-print-agent

xcopy src "C:\Program Files\VeztraPrintAgent\src" /E /I /Y
copy package.json "C:\Program Files\VeztraPrintAgent\"
copy tsconfig.json "C:\Program Files\VeztraPrintAgent\"
```

### Step 3: Install Dependencies
```batch
cd C:\Program Files\VeztraPrintAgent
npm install --production
```

### Step 4: Build
```batch
npm run build
```

### Step 5: Create Folders
```batch
mkdir "%APPDATA%\VeztraPrintAgent"
mkdir "%APPDATA%\VeztraPrintAgent\logs"
```

### Step 6: Registry (for autostart)
```batch
REM Find where node.exe is:
where node.exe

REM Then run this (replace C:\...\node.exe with actual path):
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "VeztraPrintAgent" /d "\"C:\Program Files\nodejs\node.exe\" \"C:\Program Files\VeztraPrintAgent\dist\index.js\"" /f
```

### Step 7: Test
```batch
node "C:\Program Files\VeztraPrintAgent\dist\index.js"
```

---

## Common Error Messages

### "npm error code ENOENT"
**Cause:** package.json not in the right folder
**Fix:** Make sure files are copied to `C:\Program Files\VeztraPrintAgent\`

### "npm ERR! Cannot find module"
**Cause:** npm install incomplete
**Fix:** Run again:
```batch
cd C:\Program Files\VeztraPrintAgent
npm install --production
```

### "error TS2318: Cannot find global type 'NodeJS'"
**Cause:** TypeScript missing type definitions
**Fix:** Run:
```batch
npm install --save-dev @types/node
npm run build
```

### "The specified module could not be found"
**Cause:** Missing compiled files
**Fix:** 
```batch
cd C:\Program Files\VeztraPrintAgent
npm run build
```

### "Address already in use :::5050"
**Cause:** Something else is using port 5050
**Fix:**
```batch
REM Find what's using port 5050:
netstat -ano | findstr :5050

REM Kill it (replace PID with the number shown):
taskkill /PID <PID> /F
```

---

## Verification Steps

After installation, verify each step:

### 1. Node.js installed
```batch
node --version
npm --version
```

### 2. Files copied
```batch
dir "C:\Program Files\VeztraPrintAgent\src"
dir "C:\Program Files\VeztraPrintAgent\package.json"
```

### 3. Dependencies installed
```batch
dir "C:\Program Files\VeztraPrintAgent\node_modules"
```

### 4. Built successfully
```batch
dir "C:\Program Files\VeztraPrintAgent\dist"
```

### 5. Service runs
```batch
node "C:\Program Files\VeztraPrintAgent\dist\index.js"

REM In another Command Prompt:
curl http://localhost:5050/api/v1/health
```

### 6. Autostart configured
```batch
REM Check registry:
reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" | findstr VeztraPrintAgent
```

---

## Getting More Help

### View detailed logs
```batch
type "%APPDATA%\VeztraPrintAgent\logs\service.log"
```

### Check what's in the installation folder
```batch
dir "C:\Program Files\VeztraPrintAgent" /s
```

### See what's running on port 5050
```batch
netstat -ano | findstr :5050
```

### Check for Node.js in PATH
```batch
echo %PATH%
```

### List all environment variables
```batch
set
```

---

## Reinstall (Clean Start)

If installation keeps failing, do a clean reinstall:

```batch
REM 1. Stop the service if running
taskkill /F /IM node.exe

REM 2. Remove old installation
rmdir "C:\Program Files\VeztraPrintAgent" /s /q

REM 3. Remove from registry
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "VeztraPrintAgent" /f

REM 4. Run installer again
REM Double-click INSTALL.bat and run as Administrator
```

---

## Still Not Working?

### Option 1: Use INSTALL_SIMPLE.bat instead
This is a simpler alternative that shows all output

### Option 2: Manual installation
Follow the "Manual Installation Steps" section above

### Option 3: Run from source (development mode)
```batch
cd C:\path\to\veztra-print-agent
npm install
npm run dev
```

This runs directly without building - good for testing

### Option 4: Check system requirements
- Windows 10, 11, or Server 2019+
- Node.js 18.0.0 or higher
- Administrator access for installation
- 500MB free disk space

---

## Last Resort: Detailed Logging

If you can't figure it out, capture the output:

```batch
REM Run this to save all output to a file:
INSTALL.bat > install-output.txt 2>&1

REM Then send install-output.txt to support
```

Or run step-by-step:
```batch
cd /d "%~dp0"
cd ..\..
node --version > check.txt 2>&1
type check.txt
```

This saves the output so you can see what went wrong.

---

## Quick Reference

| Problem | Command to Run |
|---------|---|
| Check Node.js | `node --version` |
| Check npm | `npm --version` |
| See if service running | `netstat -ano \| findstr :5050` |
| View logs | `type "%APPDATA%\VeztraPrintAgent\logs\service.log"` |
| Stop service | `taskkill /F /IM node.exe` |
| Start service manually | `node "C:\Program Files\VeztraPrintAgent\dist\index.js"` |
| Test API | `curl http://localhost:5050/api/v1/health` |
| Clean npm cache | `npm cache clean --force` |
| List registry autostart | `reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Run"` |

---

Email log output from `install-output.txt` if you need help!
