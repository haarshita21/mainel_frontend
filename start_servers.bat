@echo off
echo ========================================================
echo   Starting UrbanTriage AI Engine and Frontend Web App
echo ========================================================
echo.

start "UrbanTriage AI Backend (Port 5000)" cmd /k "cd /d "%~dp0urbantriage\backend" && venv\Scripts\python.exe server.py"

timeout /t 3 /nobreak >nul

start "UrbanTriage Next.js App (Port 3000)" cmd /k "cd /d "%~dp0urbantriage" && npm run dev"

echo.
echo Both services launched!
echo - AI Threat & Environmental Backend: http://127.0.0.1:5000
echo - Frontend Dashboard: http://localhost:3000
echo.
pause
