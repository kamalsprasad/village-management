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

:: Refresh session PATH from registry in case dependencies were installed
for /f "tokens=2*" %%A in ('reg query "HKLM\System\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYS_PATH=%%B"
for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USER_PATH=%%B"
if defined SYS_PATH (
    call set "SYS_PATH=%SYS_PATH%"
)
if defined USER_PATH (
    call set "USER_PATH=%USER_PATH%"
)
if defined SYS_PATH (
    if defined USER_PATH (
        set "PATH=%SYS_PATH%;%USER_PATH%"
    ) else (
        set "PATH=%SYS_PATH%"
    )
)

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

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo  [INFO] The setup wizard requires Administrator privileges to install dependencies.
    echo  Requesting elevation...
    if "%~1" == "" (
        powershell -Command "Start-Process -FilePath cmd.exe -ArgumentList '/c \"%~f0\"' -Verb RunAs -WorkingDirectory '%~dp0'"
    ) else (
        powershell -Command "Start-Process -FilePath cmd.exe -ArgumentList '/c \"%~f0\" %*' -Verb RunAs -WorkingDirectory '%~dp0'"
    )
    exit
)

if not exist "%~dp0scripts\setup\setup.ps1" (
    echo  [ERROR] Setup script not found: scripts\setup\setup.ps1
    echo  Please ensure the repository was cloned completely.
    pause
    exit /b 1
)

powershell -ExecutionPolicy Bypass -File "%~dp0scripts\setup\setup.ps1"

if errorlevel 1 (
    echo.
    echo  [ERROR] Setup failed. Please check the output above.
    pause
    exit /b 1
)

:: After setup completes, setup.ps1 starts the dev server itself.
exit /b 0

:launch
echo  Environment already configured. Pushing Appwrite functions...
cd server
call appwrite push functions
cd ..
echo.
echo  Starting dev server...
echo  The app will be available at http://localhost:9100
echo  Press Ctrl+C to stop.
echo.

if exist "yarn.lock" (
    yarn quasar dev -m ssr
) else (
    npx quasar dev -m ssr
)

exit /b %ERRORLEVEL%
