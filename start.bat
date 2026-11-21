@echo off
title Milk Shop - Daily Management App
cd /d "%~dp0"
color 0A
cls
echo ================================================================
echo           QARI ZAFAR MILK SHOP - MANAGEMENT SYSTEM
echo ================================================================
echo   [+] Shopper Bags & Packing Stock (Inward/Outward/Sizes)   : OK
echo   [+] Desi Ghee Stock & Profit (Cash/Udhaar/Profit)         : OK
echo   [+] Daily Expenses & Fleet Management (Shop/Home/Vehicles): OK
echo   [+] System Settings, Bill Print & Real-Time DB Backup     : OK
echo   [+] Monthly Khatta Grid (31 Days + Scroll + Summary After): OK
echo   [+] Daily Quick Cash Sales (Presets, Edit/Delete, Simple) : OK
echo   [+] All Records (Bill Slip Print & WhatsApp Integration)  : OK
echo   [+] Cloud Backend & Neon DB Backup (start-backend.bat)   : READY
echo ================================================================
echo.
echo [1/3] Cleaning up old processes on port 5173 and electron...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING 2^>nul') do (
  taskkill /F /PID %%a >nul 2>&1
)
taskkill /F /IM electron.exe >nul 2>&1

echo [2/3] Compiling latest Electron Main & Preload scripts...
call node build-electron.js
if %ERRORLEVEL% NEQ 0 (
  echo [!] Error compiling Electron main files.
  pause
  exit /b %ERRORLEVEL%
)

echo [3/3] Starting Milk Shop Desktop Application...
echo.
set ELECTRON_RUN_AS_NODE=
call npm run dev
pause
