$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Set-Location "frontend"

# Install Next.js with compatible React versions
npm.cmd config set strict-ssl false
npm.cmd install next@14 react@^18.2.0 react-dom@^18.2.0 --legacy-peer-deps
npm.cmd config set strict-ssl true

Set-Location ..
