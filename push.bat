@echo off
title Push to GitHub - Waitlist App
echo ==============================================
echo   Pushing code to https://github.com/Roshini1505/Waitlist-app
echo ==============================================
echo.
cd /d "%~dp0"
echo Current working directory: %CD%
echo.
git status
echo.
echo Pushing commit to GitHub (origin main)...
git push origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ==============================================
    echo   SUCCESSFULLY PUSHED TO GITHUB!
    echo ==============================================
) else (
    echo.
    echo If GitHub authentication failed, sign in when the browser window prompts.
)
pause
