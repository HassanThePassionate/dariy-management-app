@echo off
title Milk Shop - Web Preview
cd /d "%~dp0"
echo Starting Vite Dev Server...
call npm run dev:vite
pause
