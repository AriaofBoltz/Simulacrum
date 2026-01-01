@echo off
:: Simple Messaging System - Enhanced Start Script
:: Version: 2.0.0
:: Description: Automatically installs dependencies, checks for updates, validates environment, and starts the server

:: Enable delayed expansion for variables in blocks
setlocal enabledelayedexpansion

:: Set default configuration
set DEFAULT_PORT=3000
set LOG_LEVEL=info
set CLEAN_LOGS=false
set OPEN_BROWSER=false

:: Parse command line arguments
:parse_args
if "%~1" == "" goto args_parsed
if "%~1" == "--port" (
    set DEFAULT_PORT=%~2
    shift
    shift
    goto parse_args
)
if "%~1" == "--clean" (
    set CLEAN_LOGS=true
    shift
    goto parse_args
)
if "%~1" == "--browser" (
    set OPEN_BROWSER=true
    shift
    goto parse_args
)
if "%~1" == "--help" (
    call :show_help
    exit /b 0
)
echo ❌ Unknown argument: %~1
call :show_help
exit /b 1

:args_parsed

:: Set title for the command prompt window
title Simple Messaging System - Server (Port: %DEFAULT_PORT%)

:: Display welcome message
echo ============================================
echo Simple Messaging System - Enhanced Start
echo Version: 2.0.0
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
        if %ERRORLEVEL% neq 0 (
            echo ⚠️  Warning: Failed to pull updates. Continuing with local version
        ) else (
            echo ✅ Updates applied successfully
        )
    ) else (
        echo ✅ No updates available. Running latest version
    )
    echo.
)

:: Always check for dependency updates
if exist package-lock.json (
    :: Check if node_modules is up to date by comparing timestamps
    for %%F in (package-lock.json) do set "lock_time=%%~tF"
    if exist node_modules (
        for /f "delims=" %%D in ('dir /ad /tw node_modules ^| find "node_modules"') do set "modules_time=%%D"
        :: If node_modules is older than package-lock.json, reinstall
        if "!modules_time!" lss "!lock_time!" (
            echo 📦 Dependencies outdated. Updating...
            npm install
            if !ERRORLEVEL! neq 0 (
                echo ❌ Error: Failed to update dependencies
                echo Please check your internet connection and try again
                pause
                exit /b 1
            )
            echo ✅ Dependencies updated successfully
            echo.
        ) else (
            echo 📦 Dependencies up to date
            echo.
        )
    ) else (
        echo 📦 Installing dependencies (this may take a few minutes)...
        npm install
        if !ERRORLEVEL! neq 0 (
            echo ❌ Error: Failed to install dependencies
            echo Please check your internet connection and try again
            pause
            exit /b 1
        )
        echo ✅ Dependencies installed successfully
        echo.
    )
) else (
    echo ❌ Error: package-lock.json not found
    echo Please run 'npm install' first to set up the project
    pause
    exit /b 1
)

:: Clean up old log files if requested
if "%CLEAN_LOGS%" == "true" (
    if exist logs (
        echo 🧹 Cleaning up old log files...
        forfiles /p logs /m *.log /d -7 /c "cmd /c del @path"
        echo ✅ Old log files cleaned up
        echo.
    )
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

:: Initialize database if it doesn't exist or is empty
if not exist database\chat.db (
    echo 🗃️ Database not found. Initializing database...
    node database/init_db.js
    if %ERRORLEVEL% neq 0 (
        echo ❌ Error: Database initialization failed
        echo Please check the error message above
        pause
        exit /b 1
    )
    echo ✅ Database initialized successfully
    echo.
) else (
    echo 🗃️ Database already exists
    echo.
)

:: Copy .env.example to .env if .env doesn't exist
if not exist .env (
    copy .env.example .env >nul
    echo 📄 Created .env file from .env.example
    echo Please edit the .env file to configure your settings
    echo.
)

:: Validate environment variables
echo 🔍 Validating environment variables...
set VALID_ENV=true

:: Check required environment variables
for /f "usebackq tokens=1,2 delims==" %%a in (`.env`) do (
    set var_name=%%a
    set var_value=%%b
    
    :: Remove spaces from var_name
    set var_name=!var_name: =!
    
    :: Check if it's a required variable
    if "!var_name!" == "JWT_SECRET" (
        if "!var_value!" == "your-very-secure-secret-key-change-this-in-production" (
            echo ⚠️  Warning: JWT_SECRET is using default value. Please change it for production!
        )
    )
)

echo ✅ Environment validation complete

:: Check if port is available
netstat -ano | findstr ":%DEFAULT_PORT%" | findstr "LISTENING" >nul
if %ERRORLEVEL% equ 0 (
    echo ❌ Error: Port %DEFAULT_PORT% is already in use
    echo Please choose a different port using --port flag or stop the process using the port
    pause
    exit /b 1
)

:: Display server information
echo ============================================
echo Starting Simple Messaging System Server
echo ============================================
echo.
echo 🌐 Server will be available at: http://localhost:%DEFAULT_PORT%
echo 📝 Press Ctrl+C to stop the server
echo.

:: Start the server in the background
echo 🚀 Starting server...
start "Simple Messaging System Server" /B npm start

:: Wait a moment for the server to start
timeout /t 3 /nobreak >nul

:: Check if the server is running
set SERVER_RUNNING=false
for /l %%i in (1,1,10) do (
    tasklist /FI "WINDOWTITLE eq Simple Messaging System Server" | find /I "node.exe" >nul
    if !ERRORLEVEL! equ 0 (
        set SERVER_RUNNING=true
        goto server_check_done
    )
    timeout /t 1 /nobreak >nul
)

:server_check_done
if "%SERVER_RUNNING%" == "true" (
    echo ✅ Server started successfully
    echo 🌐 Server is running at: http://localhost:%DEFAULT_PORT%
    
    :: Optionally open browser
    if "%OPEN_BROWSER%" == "true" (
        echo 🌍 Opening browser...
        start "" "http://localhost:%DEFAULT_PORT%"
    )
    
    :: Perform health check
    echo 🏥 Performing health check...
    timeout /t 2 /nobreak >nul
    
    :: Simple health check using curl (if available)
    where curl >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        curl -s -o nul -w "%%{http_code}" http://localhost:%DEFAULT_PORT% | findstr "200" >nul
        if %ERRORLEVEL% equ 0 (
            echo ✅ Health check passed - Server is responding
        ) else (
            echo ⚠️  Health check warning - Server may not be fully ready
        )
    ) else (
        echo ℹ️  Health check skipped - curl not available
    )
) else (
    echo ❌ Server failed to start
    echo Checking for errors...
    
    :: Display last few lines of log if available
    if exist logs\app.log (
        echo Last log entries:
        for /f "skip=1000000000" %%i in (logs\app.log) do echo %%i
    )
    
    echo.
    echo Troubleshooting tips:
    echo 1. Check if another process is using port %DEFAULT_PORT%
    echo 2. Verify Node.js and npm are properly installed
    echo 3. Check logs\app.log for detailed error information
    echo 4. Try running 'npm install' manually
)

:: Display server monitoring instructions
echo.
echo ============================================
echo Server Monitoring
echo ============================================
echo.
echo 📊 View logs: tail -f logs\app.log
echo 🔄 Restart server: Ctrl+C then run start.bat again
echo 📝 Edit configuration: .env file
echo 🛠️  Troubleshooting: Check RELEASE_CHECKLIST.md
echo.

endlocal

pause

:show_help
echo.
echo Simple Messaging System - Start Script Help
echo.
echo Usage: start.bat [options]
echo.
echo Options:
echo   --port PORT      Specify custom port (default: 3000)
echo   --clean          Clean up old log files before starting
echo   --browser        Open browser automatically after startup
echo   --help           Show this help message
echo.
echo Examples:
echo   start.bat                        # Start with default settings
echo   start.bat --port 8080           # Start on port 8080
echo   start.bat --clean --browser    # Clean logs and open browser
echo.
goto :eof