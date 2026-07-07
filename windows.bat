@echo off
setlocal EnableExtensions

:: Village Management System - Windows Launcher
::
:: Double-click or run: windows.bat
::
:: On first run (or if node_modules\.env are missing), this runs the full
:: setup wizard. On subsequent runs it starts the dev server directly.
::

title Village Management System

cd /d "%~dp0"

echo.
echo  ============================================================
echo   Village Management System  ^|  Windows
echo  ============================================================
echo.

:: Detect whether setup is needed
if not exist "node_modules\" goto :run_setup
if not exist ".env" goto :run_setup
if not exist "server\.env" goto :run_setup

goto :launch

:run_setup
echo  First-time setup detected. Running setup wizard...
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0scripts\setup\setup.ps1"

if errorlevel 1 (
    echo.
    echo  [ERROR] Setup failed. Please check the output above.
    pause
    exit /b 1
)

exit /b 0

:launch
echo  Environment already configured. Starting dev server...
echo  The app will open at http://localhost:9100
echo  Press Ctrl+C to stop.
echo.

if exist "yarn.lock" (
    yarn quasar dev -m ssr
) else (
    npx quasar dev -m ssr
)

exit /b %ERRORLEVEL%
