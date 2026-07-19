@echo off
REM Veztra Print Agent - Simple Installer
REM Just copy and run step-by-step

setlocal enabledelayedexpansion
cd /d "%~dp0"

cls
echo.
echo ============================================================
echo   Veztra Print Agent - Simple Setup
echo ============================================================
echo.

REM Check admin
whoami /groups | find "S-1-16-12288" >nul
if errorLevel 1 (
    echo ERROR: Please right-click and select "Run as Administrator"
    pause
    exit /b 1
)

set PROJECT_ROOT=%~dp0..\..
set TARGET=C:\Program Files\VeztraPrintAgent

echo Checking Node.js...
node --version >nul 2>&1
if errorLevel 1 (
    echo ERROR: Node.js not installed
    echo Download from https://nodejs.org/
    pause
    exit /b 1
)

node --version
echo.
echo Creating folders...
if not exist "%TARGET%" mkdir "%TARGET%"
if not exist "%APPDATA%\VeztraPrintAgent\logs" mkdir "%APPDATA%\VeztraPrintAgent\logs"

echo Copying files...
xcopy "%PROJECT_ROOT%\src" "%TARGET%\src" /E /I /Y
xcopy "%PROJECT_ROOT%\package.json" "%TARGET%\" /Y
xcopy "%PROJECT_ROOT%\tsconfig.json" "%TARGET%\" /Y
if not exist "%TARGET%\dist" mkdir "%TARGET%\dist"

echo.
echo Installing packages (this takes ~1-2 minutes)...
cd /d "%TARGET%"
call npm install

echo.
echo Building application...
call npm run build

echo.
echo Setting up autostart in registry...
set NODE_EXE=
for /f "tokens=*" %%i in ('where node.exe') do set NODE_EXE=%%i
if not defined NODE_EXE set NODE_EXE=node.exe
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "VeztraPrintAgent" /d "\"%NODE_EXE%\" \"%TARGET%\dist\index.js\"" /f

echo.
echo ============================================================
echo   Setup Complete!
echo ============================================================
echo.
echo Start service:
echo   node "%TARGET%\dist\index.js"
echo.
echo Or search for "Veztra Print Agent" in Start Menu
echo.
echo Test: curl http://localhost:5050/api/v1/health
echo.
pause
