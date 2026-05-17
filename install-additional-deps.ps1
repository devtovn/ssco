$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Set-Location "frontend"

# Install additional dependencies
npm.cmd config set strict-ssl false
npm.cmd install zustand @headlessui/react @heroicons/react
npm.cmd install --save-dev @next/bundle-analyzer prettier eslint-config-prettier
npm.cmd install next-pwa
npm.cmd config set strict-ssl true

Set-Location ..
