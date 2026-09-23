@echo off
setlocal
cd /d "%~dp0"
set PYTHONUTF8=1

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set PYCMD=python
) else if exist "%LOCALAPPDATA%\Programs\Python\Python314\python.exe" (
    set "PYCMD=%LOCALAPPDATA%\Programs\Python\Python314\python.exe"
) else if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set "PYCMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
) else (
    echo Python executable not found in PATH or standard AppData directories.
    pause
    exit /b 1
)

echo Starting ThermaBuild Engine Server...
start "" "http://localhost:8765/demo/index.html"
"%PYCMD%" scripts\server.py
pause
