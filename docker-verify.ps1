# Docker Compose Verification Script
# This script verifies that all Docker services are running correctly

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Docker Compose Verification Script" -ForegroundColor Cyan
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

# Check if docker-compose.yml exists
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "✗ docker-compose.yml not found in current directory" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] docker-compose.yml found" -ForegroundColor Green

Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "[!] .env file not found. Creating from .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "[OK] .env file created. Please review and update values." -ForegroundColor Green
    } else {
        Write-Host "✗ .env.example not found. Cannot create .env file." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[OK] .env file found" -ForegroundColor Green
}

Write-Host ""

# Check if services are running
Write-Host "Checking Docker Compose services..." -ForegroundColor Yellow
$services = docker-compose ps --services 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] No services are currently running" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Would you like to start the services? (Y/N)" -ForegroundColor Cyan
    $response = Read-Host
    if ($response -eq "Y" -or $response -eq "y") {
        Write-Host ""
        Write-Host "Starting Docker Compose services..." -ForegroundColor Yellow
        docker-compose up -d
        Write-Host ""
        Write-Host "Waiting for services to be healthy (30 seconds)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
    } else {
        Write-Host "Exiting without starting services." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""

# Check individual service status
Write-Host "Verifying service health..." -ForegroundColor Yellow
Write-Host ""

$allHealthy = $true

# Check PostgreSQL
Write-Host "PostgreSQL:" -NoNewline
$pgStatus = docker-compose ps postgres --format json 2>$null | ConvertFrom-Json
if ($pgStatus.State -eq "running") {
    $pgHealth = docker-compose exec -T postgres pg_isready -U pricecompare 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host " [OK] Running and healthy" -ForegroundColor Green
    } else {
        Write-Host " [!] Running but not healthy" -ForegroundColor Yellow
        $allHealthy = $false
    }
} else {
    Write-Host " ✗ Not running" -ForegroundColor Red
    $allHealthy = $false
}

# Check Redis
Write-Host "Redis:" -NoNewline
$redisStatus = docker-compose ps redis --format json 2>$null | ConvertFrom-Json
if ($redisStatus.State -eq "running") {
    $redisHealth = docker-compose exec -T redis redis-cli ping 2>$null
    if ($redisHealth -match "PONG") {
        Write-Host " [OK] Running and healthy" -ForegroundColor Green
    } else {
        Write-Host " [!] Running but not healthy" -ForegroundColor Yellow
        $allHealthy = $false
    }
} else {
    Write-Host " ✗ Not running" -ForegroundColor Red
    $allHealthy = $false
}

# Check Backend
Write-Host "Backend:" -NoNewline
$backendStatus = docker-compose ps backend --format json 2>$null | ConvertFrom-Json
if ($backendStatus.State -eq "running") {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host " [OK] Running and healthy" -ForegroundColor Green
        } else {
            Write-Host " [!] Running but health check failed" -ForegroundColor Yellow
            $allHealthy = $false
        }
    } catch {
        Write-Host " [!] Running but not responding" -ForegroundColor Yellow
        $allHealthy = $false
    }
} else {
    Write-Host " ✗ Not running" -ForegroundColor Red
    $allHealthy = $false
}

# Check Frontend
Write-Host "Frontend:" -NoNewline
$frontendStatus = docker-compose ps frontend --format json 2>$null | ConvertFrom-Json
if ($frontendStatus.State -eq "running") {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host " [OK] Running and healthy" -ForegroundColor Green
        } else {
            Write-Host " [!] Running but health check failed" -ForegroundColor Yellow
            $allHealthy = $false
        }
    } catch {
        Write-Host " [!] Running but not responding" -ForegroundColor Yellow
        $allHealthy = $false
    }
} else {
    Write-Host " ✗ Not running" -ForegroundColor Red
    $allHealthy = $false
}

Write-Host ""

# Display service URLs
if ($allHealthy) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "All services are healthy!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Service URLs:" -ForegroundColor Cyan
    Write-Host "  Frontend:        http://localhost:3000" -ForegroundColor White
    Write-Host "  Backend API:     http://localhost:4000" -ForegroundColor White
    Write-Host "  API Docs:        http://localhost:4000/api/docs" -ForegroundColor White
    Write-Host "  PostgreSQL:      localhost:5432" -ForegroundColor White
    Write-Host "  Redis:           localhost:6379" -ForegroundColor White
    Write-Host ""
    Write-Host "To view logs: docker-compose logs -f" -ForegroundColor Yellow
    Write-Host "To stop services: docker-compose down" -ForegroundColor Yellow
} else {
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "Some services are not healthy" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To view logs: docker-compose logs -f" -ForegroundColor Yellow
    Write-Host "To restart services: docker-compose restart" -ForegroundColor Yellow
    Write-Host "To rebuild services: docker-compose up -d --build" -ForegroundColor Yellow
}

Write-Host ""
