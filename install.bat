@echo off
:: Simple Messaging System - Dependency Installer
:: Version: 1.0.0
:: Description: Installs all required dependencies for the project

:: Set title for the command prompt window
title Simple Messaging System - Dependency Installer

:: Display welcome message
echo ============================================
echo Simple Messaging System - Dependency Installer
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

:: Install dependencies
echo 📦 Installing dependencies (this may take a few minutes)...
npm install

if %ERRORLEVEL% neq 0 (
    echo ❌ Error: Failed to install dependencies
    echo Please check your internet connection and try again
    echo.
    echo Troubleshooting tips:
    echo 1. Make sure you have a stable internet connection
    echo 2. Try clearing npm cache: npm cache clean --force
    echo 3. Delete node_modules and package-lock.json, then try again
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

:: Create required directories
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
)

echo.
echo ============================================
echo Installation Complete!
echo ============================================
echo.
echo You can now start the server by:
if exist start.bat (
    echo 1. Double-clicking start.bat (recommended)
)
echo 2. Running: npm start

echo.
pause