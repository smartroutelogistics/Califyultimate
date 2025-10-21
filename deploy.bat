@echo off
echo ========================================
echo AUTO-CALLING SYSTEM DEPLOYMENT
echo ========================================
echo.

echo This script will help you deploy your auto-calling system.
echo You'll need:
echo   - Twilio Account (free trial works)
echo   - Railway account (free tier available)
echo   - Vercel account (free tier available)
echo.

echo Press any key to start deployment...
pause > nul

echo.
echo ========================================
echo STEP 1: Railway Login
echo ========================================
echo Opening browser for Railway login...
railway login

echo.
echo ========================================
echo STEP 2: Initialize Project
echo ========================================
railway init

echo.
echo ========================================
echo STEP 3: Add PostgreSQL
echo ========================================
echo Adding PostgreSQL database...
railway add

echo.
echo ========================================
echo STEP 4: Add Redis
echo ========================================
echo Adding Redis...
railway add

echo.
echo ========================================
echo STEP 5: Configure Environment Variables
echo ========================================
echo.
echo ** IMPORTANT: You need your Twilio credentials **
echo.
echo Get them from: https://console.twilio.com
echo.
set /p TWILIO_SID="Enter your Twilio Account SID (starts with AC): "
set /p TWILIO_TOKEN="Enter your Twilio Auth Token: "
set /p TWILIO_NUMBER="Enter your Twilio Phone Number (format: +1XXXXXXXXXX): "

echo.
echo Setting environment variables...
railway variables set TWILIO_ACCOUNT_SID=%TWILIO_SID%
railway variables set TWILIO_AUTH_TOKEN=%TWILIO_TOKEN%
railway variables set TWILIO_NUMBER=%TWILIO_NUMBER%
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set JWT_SECRET=CHANGE_THIS_TO_RANDOM_STRING_LATER
railway variables set JWT_EXPIRES_IN=24h
railway variables set MAX_CONCURRENT_CALLS=10
railway variables set CALL_RETRY_MAX_ATTEMPTS=3
railway variables set CALL_RETRY_DELAY_MINUTES=60
railway variables set AMD_TIMEOUT=30

echo.
echo ========================================
echo STEP 6: Deploy Backend
echo ========================================
echo Deploying to Railway...
railway up

echo.
echo ========================================
echo STEP 7: Generate Domain
echo ========================================
railway domain

echo.
echo ** COPY THE URL ABOVE **
echo.
set /p RAILWAY_URL="Paste your Railway URL (without https://): "

echo.
echo Setting webhook URLs...
railway variables set WEBHOOK_BASE_URL=https://%RAILWAY_URL%
railway variables set BASE_URL=https://%RAILWAY_URL%

echo.
echo Redeploying with webhook URLs...
railway up

echo.
echo ========================================
echo STEP 8: Run Database Migration
echo ========================================
echo Creating database tables...
railway run node src/database/migrate.js

echo.
echo ========================================
echo STEP 9: Test Backend
echo ========================================
echo Opening health check in browser...
start https://%RAILWAY_URL%/health

echo.
echo Check that the browser shows: {"status": "healthy"}
echo.
pause

echo.
echo ========================================
echo NEXT STEPS
echo ========================================
echo.
echo 1. Deploy Frontend:
echo    cd frontend
echo    npm install -g vercel
echo    vercel --prod
echo.
echo 2. Configure Twilio webhooks at:
echo    https://console.twilio.com
echo.
echo    Answer URL: https://%RAILWAY_URL%/webhooks/twilio/answer
echo    Status URL: https://%RAILWAY_URL%/webhooks/twilio/status
echo.
echo 3. Your backend is live at: https://%RAILWAY_URL%
echo.
echo See DEPLOY_INSTRUCTIONS.md for complete details.
echo.
echo ========================================
echo DEPLOYMENT COMPLETE!
echo ========================================
pause
