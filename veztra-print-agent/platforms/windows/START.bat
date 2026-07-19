@echo off
REM Veztra Print Agent - Quick Start Launcher

setlocal enabledelayedexpansion

REM Check if Node.js is installed
node --version >nul 2>&1
if errorLevel 1 (
    echo.
    echo [ERROR] Node.js is not installed
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

REM Start the service
echo.
echo ============================================================
echo   Veztra Print Agent - Starting Service
echo ============================================================
echo.

set APP_PATH=C:\Program Files\VeztraPrintAgent\dist\index.js

if not exist "%APP_PATH%" (
    echo [ERROR] Application not found at: %APP_PATH%
    echo.
    echo Please run INSTALL.bat first to install the application.
    pause
    exit /b 1
)

echo Starting service...
echo Service URL: http://localhost:5050
echo Press Ctrl+C to stop the service
echo.

node "%APP_PATH%"

if errorLevel 1 (
    echo.
    echo [ERROR] Service failed to start
    pause
    exit /b 1
)

exit /b 0
