@echo off
REM Veztra Print Agent - Windows Installer
REM Right-click this file and select "Run as Administrator"

setlocal enabledelayedexpansion
cd /d "%~dp0"

cls
echo.
echo ============================================================
echo   Veztra Print Agent - Windows Installation
echo ============================================================
echo.

REM Check if running as Administrator
whoami /groups | find "S-1-16-12288" >nul
if errorLevel 1 (
    echo [ERROR] Administrator privileges required
    echo.
    echo Please:
    echo   1. Right-click INSTALL.bat
    echo   2. Select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

REM Get paths
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..\..
set TARGET_PATH=C:\Program Files\VeztraPrintAgent
set APPDATA_PATH=%APPDATA%\VeztraPrintAgent

REM Check if Node.js is installed
echo Step 1/6: Checking Node.js installation...
node --version >nul 2>&1
if errorLevel 1 (
    echo   [ERROR] Node.js not found
    echo.
    echo   Download from: https://nodejs.org/
    echo   Then run this installer again.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo   [OK] Found Node.js: %NODE_VERSION%
echo.

REM Create directories
echo Step 2/6: Creating directories...
if not exist "%TARGET_PATH%" mkdir "%TARGET_PATH%"
if not exist "%APPDATA_PATH%" mkdir "%APPDATA_PATH%"
if not exist "%APPDATA_PATH%\logs" mkdir "%APPDATA_PATH%\logs"
echo   [OK] Directories created
echo.

REM Copy source files
echo Step 3/6: Copying source files...
if not exist "%PROJECT_ROOT%\package.json" (
    echo   [ERROR] Source files not found
    echo   Make sure you're in the veztra-print-agent folder
    echo.
    pause
    exit /b 1
)

xcopy "%PROJECT_ROOT%\src" "%TARGET_PATH%\src" /E /I /Y >nul 2>&1
xcopy "%PROJECT_ROOT%\package.json" "%TARGET_PATH%\" /Y >nul 2>&1
xcopy "%PROJECT_ROOT%\tsconfig.json" "%TARGET_PATH%\" /Y >nul 2>&1
if not exist "%TARGET_PATH%\dist" mkdir "%TARGET_PATH%\dist"
echo   [OK] Source files copied
echo.

REM Install dependencies (including dev dependencies for TypeScript)
echo Step 4/6: Installing npm dependencies...
cd /d "%TARGET_PATH%"
call npm install >nul 2>&1
if errorLevel 1 (
    echo   [ERROR] npm install failed
    echo.
    echo   Try running manually:
    echo   cd "%TARGET_PATH%"
    echo   npm install
    echo.
    pause
    exit /b 1
)
echo   [OK] Dependencies installed
echo.

REM Build TypeScript
echo Step 5/6: Compiling TypeScript...
call npm run build >nul 2>&1
if errorLevel 1 (
    echo   [ERROR] Build failed
    echo.
    echo   Try running manually:
    echo   cd "%TARGET_PATH%"
    echo   npm run build
    echo.
    pause
    exit /b 1
)
echo   [OK] TypeScript compiled
echo.

REM Configure Windows registry
echo Step 6/6: Configuring autostart...
set NODE_PATH=
for /f "tokens=*" %%i in ('where node.exe') do set NODE_PATH=%%i

if not defined NODE_PATH (
    set NODE_PATH=node.exe
)

set REG_PATH=HKCU\Software\Microsoft\Windows\CurrentVersion\Run
set REG_VALUE=VeztraPrintAgent
set REG_CMD="%NODE_PATH%" "%TARGET_PATH%\dist\index.js"

reg add "%REG_PATH%" /v "%REG_VALUE%" /d "%REG_CMD%" /f >nul 2>&1
if errorLevel 1 (
    echo   [WARNING] Could not set autostart - continuing anyway
) else (
    echo   [OK] Autostart configured
)

REM Create shortcuts
set DESKTOP=%USERPROFILE%\Desktop
if exist "%DESKTOP%" (
    powershell -NoProfile -Command "^
        $WshShell = New-Object -ComObject WScript.Shell; ^
        $shortcut = $WshShell.CreateShortcut('%DESKTOP%\Veztra Print Agent.lnk'); ^
        $shortcut.TargetPath = '%NODE_PATH%'; ^
        $shortcut.Arguments = '%TARGET_PATH%\dist\index.js'; ^
        $shortcut.WorkingDirectory = '%TARGET_PATH%'; ^
        $shortcut.Description = 'Veztra Print Agent'; ^
        $shortcut.Save(); ^
    " 2>nul
)

echo.
echo ============================================================
echo   Installation Complete!
echo ============================================================
echo.
echo Service Configuration:
echo   URL:    http://localhost:5050
echo   Path:   %TARGET_PATH%
echo   Config: %APPDATA_PATH%\config.json
echo   Logs:   %APPDATA_PATH%\logs\service.log
echo.
echo Next Steps:
echo   1. Start the service:
echo      Double-click "Veztra Print Agent" on Desktop
echo      OR
echo      node "%TARGET_PATH%\dist\index.js"
echo.
echo   2. Verify it's running:
echo      curl http://localhost:5050/api/v1/health
echo.
echo   3. Add your printer:
echo      curl http://localhost:5050/api/v1/printers/detect/usb
echo.
echo Service will auto-start on Windows login.
echo.
pause
exit /b 0
