@echo off
setlocal enabledelayedexpansion
title Qari Zafar Milk Shop - Build Client Installer
color 0B
cls

echo ================================================================
echo         QARI ZAFAR MILK SHOP - BUILD CLIENT INSTALLER
echo         Yeh .exe file banayega jo client ko bhej sako
echo ================================================================
echo.

cd /d "%~dp0"

REM ---- Step 1: Check requirements ----
echo [1/5] Checking requirements...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [!] Node.js NOT found! Please install from https://nodejs.org
    pause & exit /b 1
)
pnpm --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo     Installing pnpm...
    npm install -g pnpm
)
for /f "tokens=*" %%v in ('node --version') do echo     [OK] Node.js %%v
for /f "tokens=*" %%v in ('pnpm --version') do echo     [OK] pnpm %%v
echo.

REM ---- Step 2: Install dependencies ----
echo [2/5] Installing dependencies (if needed)...
pnpm install --ignore-scripts --config.minimum-release-age=0
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [!] pnpm install failed! Check internet connection.
    pause & exit /b 1
)
echo     [OK] Dependencies ready!
echo.

REM ---- Step 3: Build Electron main ----
echo [3/5] Compiling Electron main process...
node build-electron.js
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [!] Electron compilation failed!
    pause & exit /b 1
)
echo     [OK] Electron main compiled!
echo.

REM ---- Step 4: Build React UI ----
echo [4/5] Building React app (UI)...
node node_modules\vite\bin\vite.js build
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [!] Vite build failed!
    pause & exit /b 1
)
echo     [OK] React UI built!
echo.

REM ---- Step 5: Create .exe installer ----
echo [5/5] Creating Windows .exe installer...
echo     (This may take 2-5 minutes - please wait...)
echo.
node node_modules\electron-builder\cli.js --win --x64
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo [!] electron-builder failed! Check error above.
    pause & exit /b 1
)

REM ---- Done ----
color 0A
cls
echo ================================================================
echo   [OK]  INSTALLER SUCCESSFULLY CREATED!
echo ================================================================
echo.
echo   Installer file location:
echo   %~dp0release\
echo.
echo   File:
for %%f in ("%~dp0release\*.exe") do (
    if not "%%~nxf"=="*.__uninstaller.exe" (
        echo   %%~nxf  [%%~zf bytes]
    )
)
echo.
echo   Ab yeh .exe file client ko bhej do!
echo   Client sirf double-click kare aur install ho jaye.
echo.
echo   Press any key to open the release folder...
pause >nul

explorer "%~dp0release"
