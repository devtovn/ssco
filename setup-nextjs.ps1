$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
npm.cmd config set strict-ssl false
echo "y" | npx.cmd create-next-app@14 frontend --typescript --tailwind --app --no-src-dir --import-alias "@/*" --use-npm
npm.cmd config set strict-ssl true
