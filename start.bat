@echo off
:: Simple Messaging System - Auto Start Script
:: Version: 1.0.0
:: Description: Automatically installs dependencies, checks for updates, and starts the server

:: Set title for the command prompt window
title Simple Messaging System - Server

:: Display welcome message
echo ============================================
echo Simple Messaging System - Auto Start
echo Version: 1.0.0
echo ============================================
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if npm is installed
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Error: npm is not installed or not in PATH
    echo Please install Node.js which includes npm
    pause
    exit /b 1
)

:: Display Node.js and npm versions
echo Node.js version: 
node --version
echo npm version:
npm --version
echo.

:: Check if package.json exists
if not exist package.json (
    echo ❌ Error: package.json not found
    echo Please run this script from the project root directory
    pause
    exit /b 1
)

:: Check for updates (git pull if .git directory exists)
if exist .git (
    echo 🔄 Checking for updates...
    git fetch --quiet
    
    :: Check if there are updates available
    for /f "delims=" %%i in ('git rev-parse HEAD') do set "local_commit=%%i"
    for /f "delims=" %%i in ('git rev-parse @{u}') do set "remote_commit=%%i"
    
    if not "%local_commit%" == "%remote_commit%" (
        echo 📥 Updates available. Pulling latest changes...
        git pull
        echo ✅ Updates applied successfully
    ) else (
        echo ✅ No updates available. Running latest version
    )
    echo.
)

:: Check if node_modules directory exists
if not exist node_modules (
    echo 📦 Installing dependencies (this may take a few minutes)...
    npm install
    
    if %ERRORLEVEL% neq 0 (
        echo ❌ Error: Failed to install dependencies
        echo Please check your internet connection and try again
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed successfully
    echo.
) else (
    echo 📦 Dependencies already installed
    echo.
)

:: Create required directories if they don't exist
if not exist database (
    mkdir database
    echo 📁 Created database directory
)

if not exist uploads (
    mkdir uploads
    echo 📁 Created uploads directory
)

if not exist logs (
    mkdir logs
    echo 📁 Created logs directory
)

:: Copy .env.example to .env if .env doesn't exist
if not exist .env (
    copy .env.example .env >nul
    echo 📄 Created .env file from .env.example
    echo Please edit the .env file to configure your settings
    echo.
)

:: Display server information
echo ============================================
echo Starting Simple Messaging System Server
echo ============================================
echo.
echo 🌐 Server will be available at: http://localhost:3000
echo 📝 Press Ctrl+C to stop the server
echo.

:: Start the server
npm start

:: If server exits, show message
if %ERRORLEVEL% neq 0 (
    echo ❌ Server stopped with errors
) else (
    echo ✅ Server stopped gracefully
)

pause