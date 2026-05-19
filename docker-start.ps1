# Docker Compose Quick Start Script
# This script sets up and starts all Docker services

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Docker Compose Quick Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker status..." -ForegroundColor Yellow
docker info 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] Docker is not running. Start Docker Desktop and wait until it shows 'Running', then run this script again." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Docker is running" -ForegroundColor Green

Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file from .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "[OK] .env file created" -ForegroundColor Green
        Write-Host ""
        Write-Host "[!] IMPORTANT: Please review .env file and update:" -ForegroundColor Yellow
        Write-Host "  - JWT_SECRET" -ForegroundColor White
        Write-Host "  - JWT_REFRESH_SECRET" -ForegroundColor White
        Write-Host "  - POSTGRES_PASSWORD" -ForegroundColor White
        Write-Host "  - API keys (optional for development)" -ForegroundColor White
        Write-Host ""
        Write-Host "Press Enter to continue or Ctrl+C to exit and edit .env first..." -ForegroundColor Cyan
        Read-Host
    } else {
        Write-Host "[X] .env.example not found" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[OK] .env file found" -ForegroundColor Green
}

Write-Host ""

# Stop any existing services
Write-Host "Stopping any existing services..." -ForegroundColor Yellow
docker-compose down 2>$null | Out-Null
Write-Host "[OK] Existing services stopped" -ForegroundColor Green

Write-Host ""

# Build and start services
Write-Host "Building and starting Docker services..." -ForegroundColor Yellow
Write-Host "This may take a few minutes on first run..." -ForegroundColor White
Write-Host ""

docker-compose up -d --build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] Services started successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Waiting for services to be healthy (30 seconds)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Docker Compose Setup Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Service URLs:" -ForegroundColor Cyan
    Write-Host "  Frontend:        http://localhost:3000" -ForegroundColor White
    Write-Host "  Backend API:     http://localhost:4000" -ForegroundColor White
    Write-Host "  API Docs:        http://localhost:4000/api/docs" -ForegroundColor White
    Write-Host "  Health Check:    http://localhost:4000/health" -ForegroundColor White
    Write-Host ""
    Write-Host "Database Connections:" -ForegroundColor Cyan
    Write-Host "  PostgreSQL:      localhost:5432" -ForegroundColor White
    Write-Host "  Redis:           localhost:6379" -ForegroundColor White
    Write-Host ""
    Write-Host "Useful Commands:" -ForegroundColor Cyan
    Write-Host "  View logs:       docker-compose logs -f" -ForegroundColor White
    Write-Host "  Stop services:   docker-compose stop" -ForegroundColor White
    Write-Host "  Restart:         docker-compose restart" -ForegroundColor White
    Write-Host "  Remove all:      docker-compose down -v" -ForegroundColor White
    Write-Host "  Verify health:   .\docker-verify.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Opening frontend in browser..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:3000"
} else {
    Write-Host ""
    Write-Host "[X] Failed to start services" -ForegroundColor Red
    Write-Host ""
    Write-Host "To view error logs, run:" -ForegroundColor Yellow
    Write-Host "  docker-compose logs" -ForegroundColor White
    exit 1
}

Write-Host ""
