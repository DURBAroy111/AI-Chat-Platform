@echo off
echo.
echo ==========================================
echo   AI Chat Platform - Setup ^& Start
echo ==========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please download and install Node.js from: https://nodejs.org
    echo Choose the LTS version (e.g. 20.x)
    pause
    exit /b 1
)
echo [OK] Node.js found: 
node --version

REM ---- BACKEND ----
echo.
echo [1/4] Installing backend dependencies...
cd /d "%~dp0backend"

if not exist ".env" (
    copy ".env.example" ".env"
    echo.
    echo [ACTION REQUIRED] .env file created from template.
    echo Please edit backend\.env and set your FAL_KEY before continuing.
    echo.
    notepad .env
    pause
)

npm install
if %errorlevel% neq 0 (
    echo [ERROR] Backend npm install failed
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed

REM ---- FRONTEND ----
echo.
echo [2/4] Installing frontend dependencies...
cd /d "%~dp0frontend"
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Frontend npm install failed
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed

REM ---- START SERVERS ----
echo.
echo [3/4] Starting backend server (port 3001)...
cd /d "%~dp0backend"
start "AI Chat Backend" cmd /k "node server.js"

timeout /t 3 /nobreak >nul

echo [4/4] Starting frontend server (port 5173)...
cd /d "%~dp0frontend"
start "AI Chat Frontend" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo ==========================================
echo   Platform is starting up!
echo ==========================================
echo.
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3001
echo   Health:   http://localhost:3001/api/health
echo.
echo   Two terminal windows have opened.
echo   Keep them running while using the app.
echo.
start http://localhost:5173
pause
