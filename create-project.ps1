$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Create frontend directory
New-Item -ItemType Directory -Force -Path "frontend"
Set-Location "frontend"

# Initialize npm project
npm.cmd init -y

# Install Next.js and dependencies
npm.cmd config set strict-ssl false
npm.cmd install next@14 react@latest react-dom@latest
npm.cmd install --save-dev typescript @types/react @types/node @types/react-dom
npm.cmd install --save-dev tailwindcss postcss autoprefixer
npm.cmd install --save-dev eslint eslint-config-next
npm.cmd config set strict-ssl true

Set-Location ..
