@echo off
setlocal enabledelayedexpansion
title Qari Zafar Milk Shop - Installer
color 0A
cls

echo ================================================================
echo         QARI ZAFAR MILK SHOP - MANAGEMENT SYSTEM
echo                     INSTALLER / SETUP
echo ================================================================
echo.

REM ---- Step 1: Check Node.js ----
echo [1/4] Checking Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [!] Node.js NOT found on your system!
    echo.
    echo     Please download and install Node.js from:
    echo     https://nodejs.org/en/download
    echo     (Download the LTS version)
    echo.
    echo     After installing Node.js, run this installer again.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo     [OK] Node.js %NODE_VER% found.
echo.

REM ---- Step 2: Check/Install pnpm ----
echo [2/4] Checking pnpm...
pnpm --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo     pnpm not found. Installing pnpm...
    npm install -g pnpm
    if !ERRORLEVEL! NEQ 0 (
        color 0C
        echo [!] Failed to install pnpm. Please run:
        echo     npm install -g pnpm
        pause
        exit /b 1
    )
)
for /f "tokens=*" %%v in ('pnpm --version') do set PNPM_VER=%%v
echo     [OK] pnpm %PNPM_VER% found.
echo.

REM ---- Step 3: Install dependencies ----
echo [3/4] Installing project dependencies...
echo     (This may take a few minutes on first run)
echo.
cd /d "%~dp0"

REM Use --ignore-scripts because better-sqlite3 ships prebuilt binaries
REM No Visual Studio / build tools needed!
pnpm install --ignore-scripts --config.minimum-release-age=0
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo [!] pnpm install failed! Please check your internet connection.
    pause
    exit /b 1
)

REM Verify better-sqlite3 prebuilt binary works
node -e "require('better-sqlite3'); process.exit(0);" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo [!] better-sqlite3 binary check failed!
    echo     Please report this issue.
    pause
    exit /b 1
)
echo.
echo     [OK] All dependencies installed successfully!
echo     [OK] SQLite (better-sqlite3) working perfectly!
echo.

REM ---- Step 4: Build Electron main files ----
echo [4/4] Compiling Electron main process...
node build-electron.js
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [!] Electron build compilation failed.
    pause
    exit /b 1
)
echo     [OK] Electron compiled successfully!
echo.

REM ---- Done ----
color 0A
echo ================================================================
echo   [OK] INSTALLATION COMPLETE!
echo ================================================================
echo.
echo   You can now launch the app by:
echo   - Double-clicking  start.bat
echo   - OR running:  pnpm run dev
echo.
echo   Press any key to launch the app now...
pause >nul

cls
echo Launching Qari Zafar Milk Shop...
echo.
call start.bat
