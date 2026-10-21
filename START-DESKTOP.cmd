@echo off
cd /d "%~dp0desktop"
where node >nul 2>nul || (echo Please install Node.js 24 LTS first. & pause & exit /b 1)
if not exist node_modules\electron call npm ci
if errorlevel 1 (pause & exit /b 1)
call npm start
pause
