@echo off
title Qari Zafar Milk Shop - Cloud Backend
color 0B
cls
echo ================================================================
echo           QARI ZAFAR MILK SHOP - CLOUD BACKEND
echo     Neon PostgreSQL + Drizzle ORM + Backups + Sync (Port 3001)
echo ================================================================
echo.
cd /d "%~dp0cloud-backend"
echo Starting Cloud Backend on http://localhost:3001 ...
call npm run dev
pause
