@echo off
title Lobby Platform Server
echo ==============================================
echo   Starting Lobby Platform Server
echo ==============================================
echo.
cd /d "%~dp0backend" 2>nul || cd /d "%~dp0" 2>nul
echo Running from: %CD%
echo Opening http://localhost:5000 in browser...
start http://localhost:5000
echo.
echo Server active on port 5000. Press Ctrl+C to terminate.
echo.
node server.js
pause
