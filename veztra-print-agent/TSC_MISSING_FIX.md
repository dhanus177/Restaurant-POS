# Fix: 'tsc' is not recognized

## Problem

When running the installer, you got:
```
'tsc' is not recognized as an internal or external command,
operable program or batch file.
```

## Root Cause

The batch installer was using `npm install --production` which **skips development dependencies** like TypeScript compiler (`tsc`). The `npm run build` command needs TypeScript to be installed.

## Solution

Both installers have been fixed to use `npm install` (without `--production`), which installs ALL dependencies including devDependencies.

### What Changed

**Before:**
```batch
call npm install --production
```

**After:**
```batch
call npm install
```

This ensures TypeScript and other build tools are installed.

## Files Fixed

- ✅ `platforms/windows/INSTALL.bat` - Main installer
- ✅ `platforms/windows/INSTALL_SIMPLE.bat` - Simple alternative

## What to Do Now

### Option 1: Run Updated Installer

1. **Download/copy the updated project**
2. **Right-click `platforms/windows/INSTALL.bat`**
3. **Select "Run as Administrator"**
4. **Wait for completion**

The updated installer will:
- Install TypeScript (in devDependencies)
- Compile the code successfully
- Complete without errors

### Option 2: Manual Fix (If Already Installed)

If you already have files installed in `C:\Program Files\VeztraPrintAgent`:

```powershell
cd C:\Program Files\VeztraPrintAgent

# Install dev dependencies (including TypeScript)
npm install

# Now build will work
npm run build
```

## Verification

After installation, verify TypeScript compiled successfully:

```powershell
# Check if compiled files exist
dir C:\Program Files\VeztraPrintAgent\dist\

# You should see:
# - index.js
# - core/ (folder)
# - drivers/ (folder)
# - services/ (folder)
# - routes/ (folder)
```

## Why This Happened

- `npm install --production` is for deploying already-built apps
- `npm install` (all dependencies) is for development and building
- We need TypeScript (`tsc`) to compile the code
- TypeScript is in `devDependencies` in `package.json`

## Prevention

For future builds:
- Always use full `npm install` when building from source
- Use `npm install --production` only if deploying pre-built files

## Now Ready!

The installers are fixed. Try again with the updated `INSTALL.bat` file.

**Status: ✅ Ready to Install**
