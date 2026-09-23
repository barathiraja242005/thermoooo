$ErrorActionPreference = "Stop"
$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $PSScriptRoot

$env:PYTHONUTF8 = "1"

$pyCmd = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pyCmd = "python"
} elseif (Test-Path "$env:LOCALAPPDATA\Programs\Python\Python314\python.exe") {
    $pyCmd = "$env:LOCALAPPDATA\Programs\Python\Python314\python.exe"
} elseif (Test-Path "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe") {
    $pyCmd = "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe"
} else {
    Write-Error "Python executable not found in PATH or standard AppData directories."
}

Write-Host "Starting ThermaBuild Engine Server on http://localhost:8765/demo/index.html" -ForegroundColor Cyan
Start-Process "http://localhost:8765/demo/index.html"
& $pyCmd scripts/server.py
