# Script to start the full development environment
# Creates the backend venv if needed, installs dependencies, and starts backend + frontend.

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting development environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get project paths
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backPath = Join-Path $projectRoot "back"
$frontPath = Join-Path $projectRoot "front"
$venvDir = Join-Path $backPath "venv"
$venvPath = Join-Path $venvDir "Scripts\Activate.ps1"
$pythonPath = Join-Path $venvDir "Scripts\python.exe"
$requirementsPath = Join-Path $backPath "requirements.txt"

# Create the backend virtual environment if it does not exist yet
if (-not (Test-Path $venvPath)) {
    Write-Host "Virtual environment not found. Creating it..." -ForegroundColor Yellow
    Push-Location $backPath
    try {
        py -m venv venv
    } finally {
        Pop-Location
    }
}

if (-not (Test-Path $pythonPath)) {
    Write-Host "ERROR: Could not find the virtual environment Python at: $pythonPath" -ForegroundColor Red
    exit 1
}

Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
& $pythonPath -m pip install --upgrade pip
& $pythonPath -m pip install -r $requirementsPath

# Verify frontend directory exists
if (-not (Test-Path $frontPath)) {
    Write-Host "ERROR: Frontend directory not found at: $frontPath" -ForegroundColor Red
    exit 1
}

Write-Host "1. Backend ready..." -ForegroundColor Yellow
Write-Host "2. Starting backend..." -ForegroundColor Yellow
Write-Host "3. Starting frontend..." -ForegroundColor Yellow
Write-Host ""

# Start backend in a new PowerShell window
Write-Host "Starting backend in a new window..." -ForegroundColor Green
$backendScript = @"
cd '$backPath'; & '$pythonPath' main.py
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript

# Wait a bit for the backend to boot
Start-Sleep -Seconds 3

# Start frontend in a new PowerShell window
Write-Host "Starting frontend in a new window..." -ForegroundColor Green
$frontendScript = @"
cd '$frontPath'
npm run dev
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendScript

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Services started successfully" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend: http://localhost:8000" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C in the PowerShell windows to stop the services." -ForegroundColor Gray
