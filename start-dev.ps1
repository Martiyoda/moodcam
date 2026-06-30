# Script to start the local development environment.
# Starts the backend and frontend directly, without Docker.

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting local development environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get project paths
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backPath = Join-Path $projectRoot "back"
$frontPath = $projectRoot
$venvDir = Join-Path $backPath "venv"
$venvPath = Join-Path $venvDir "Scripts\Activate.ps1"
$pythonPath = Join-Path $venvDir "Scripts\python.exe"
$requirementsPath = Join-Path $backPath "requirements.txt"

# Create the backend virtual environment if it does not exist yet
if (-not (Test-Path $venvPath)) {
    Write-Host "Virtual environment not found. Creating it..." -ForegroundColor Yellow
    Push-Location $backPath
    try {
        py -3 -m venv venv
    } finally {
        Pop-Location
    }
}

if (-not (Test-Path $pythonPath)) {
    Write-Host "ERROR: Could not find the virtual environment Python at: $pythonPath" -ForegroundColor Red
    exit 1
}

# Install backend dependencies if they are missing or outdated.
if (-not (Test-Path $requirementsPath)) {
    Write-Host "ERROR: requirements.txt not found at: $requirementsPath" -ForegroundColor Red
    exit 1
}

Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
& $pythonPath -m pip install --upgrade pip
& $pythonPath -m pip install -r $requirementsPath

# Ensure the frontend dependencies exist.
$nodeModulesPath = Join-Path $frontPath "node_modules"
if (-not (Test-Path $nodeModulesPath)) {
    Write-Host "Frontend dependencies not found. Running npm install..." -ForegroundColor Yellow
    npm install
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
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "If dependencies are missing, install them manually with:" -ForegroundColor Gray
Write-Host "  back\\venv\\Scripts\\python.exe -m pip install -r back\\requirements.txt" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C in the PowerShell windows to stop the services." -ForegroundColor Gray
