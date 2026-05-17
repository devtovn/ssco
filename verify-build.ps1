$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Set-Location "frontend"

Write-Host "Running TypeScript type check..."
npm.cmd run type-check

Write-Host "`nRunning ESLint..."
npm.cmd run lint

Write-Host "`nBuilding Next.js application..."
npm.cmd run build

Set-Location ..
