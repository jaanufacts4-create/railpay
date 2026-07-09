@echo off
echo ============================================
echo   RailPay OBHS - Git Setup
echo ============================================
echo.

cd /d "%~dp0"

echo [1] Initializing git repository...
git init -b main
git config user.name "Prem"
git config user.email "jaanufacts4@gmail.com"

echo.
echo [2] Adding all files...
git add .

echo.
echo [3] Creating first commit...
git commit -m "Initial commit -- RailPay OBHS SaaS (Next.js + Supabase)"

echo.
echo ============================================
echo   Done! Git repo is ready.
echo.
echo   Next steps:
echo   1. Go to github.com/new and create a new repo named "railpay-obhs"
echo   2. Run these commands:
echo      git remote add origin https://github.com/YOUR_USERNAME/railpay-obhs.git
echo      git push -u origin main
echo ============================================
pause
