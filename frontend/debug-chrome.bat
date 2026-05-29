@echo off
echo Closing existing Chrome instances...
taskkill /F /IM chrome.exe 2>nul
timeout /t 2 /nobreak >nul

echo Launching Chrome with remote debugging on port 9222...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222

timeout /t 2 /nobreak >nul
echo Verifying connection...
curl -s http://127.0.0.1:9222/json/version

echo.
echo Chrome is ready for Claude Code debugging.
echo Run "claude" then test with: list all open browser tabs
