@echo off
setlocal
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed. Check your Node.js/npm installation and internet connection.
    pause
    exit /b 1
  )
)
echo Starting MeteorInk at http://localhost:3000/
call npm start
pause
