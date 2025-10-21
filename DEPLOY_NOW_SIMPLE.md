# 🚀 DEPLOY NOW - Simple Copy-Paste Guide

Follow these steps EXACTLY. Copy and paste each command.

---

## BEFORE YOU START

You need Twilio credentials. If you don't have them:

1. Open browser: https://www.twilio.com/try-twilio
2. Sign up (FREE - takes 3 minutes)
3. After signup, you'll see:
   - **Account SID** (starts with AC...)
   - **Auth Token** (click to reveal)
4. Buy a phone number: Console → Phone Numbers → Buy ($1/month)

**Write them down here:**
```
Account SID:  AC_________________________________
Auth Token:   ___________________________________
Phone Number: +1________________________________
```

---

## STEP-BY-STEP DEPLOYMENT

### STEP 1: Open PowerShell

1. Press `Windows + X`
2. Click "Windows PowerShell" or "Terminal"

---

### STEP 2: Navigate to Project

Copy and paste this, then press Enter:

```powershell
cd C:\Users\hp\Desktop\Calling
```

✅ You should see: `C:\Users\hp\Desktop\Calling>`

---

### STEP 3: Login to Railway

Copy and paste this:

```powershell
railway login
```

**What happens:**
- Browser opens automatically
- Click **"Sign in with GitHub"**
- Click "Authorize Railway"
- Browser shows: "✓ Logged in successfully"
- Close browser tab
- Go back to PowerShell

✅ PowerShell shows: `✓ Logged in as [your-name]`

---

### STEP 4: Check You're Logged In

```powershell
railway whoami
```

✅ Should show your username

---

### STEP 5: Initialize Project

```powershell
railway init
```

When asked:
- **Enter project name:** Type `auto-calling-system` and press Enter
- **Start with empty project?** Press Enter (Yes)

✅ Shows: `✓ Created project auto-calling-system`

---

### STEP 6: Add PostgreSQL Database

```powershell
railway add
```

**What to do:**
- Use arrow keys to select **"PostgreSQL"**
- Press Enter

✅ Shows: `✓ Created PostgreSQL`

Wait 30 seconds for it to provision.

---

### STEP 7: Add Redis

```powershell
railway add
```

**What to do:**
- Use arrow keys to select **"Redis"**
- Press Enter

✅ Shows: `✓ Created Redis`

Wait 30 seconds for it to provision.

---

### STEP 8: Set Twilio Variables

**IMPORTANT:** Replace the XXX with YOUR actual Twilio values!

Copy this ENTIRE block, replace XXX with your values, then paste:

```powershell
railway variables set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
railway variables set TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
railway variables set TWILIO_NUMBER=+1xxxxxxxxxx
```

**Example:**
```powershell
railway variables set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
railway variables set TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
railway variables set TWILIO_NUMBER=+1xxxxxxxxxx
```

---

### STEP 9: Set Other Variables

Copy and paste this ENTIRE block:

```powershell
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set JWT_SECRET=my-super-secret-key-change-this-later
railway variables set JWT_EXPIRES_IN=24h
railway variables set MAX_CONCURRENT_CALLS=10
railway variables set CALL_RETRY_MAX_ATTEMPTS=3
railway variables set CALL_RETRY_DELAY_MINUTES=60
railway variables set AMD_TIMEOUT=30
```

✅ Each line shows: `✓ Set variable [name]`

---

### STEP 10: Deploy Backend

```powershell
railway up
```

**What happens:**
- Uploads your code
- Installs dependencies (takes 2-3 minutes)
- Starts the server

✅ Shows: `✓ Deployment successful`

**Wait for this to complete!**

---

### STEP 11: Generate Public Domain

```powershell
railway domain
```

✅ Shows a URL like: `https://auto-calling-production-xyz.up.railway.app`

**COPY THIS URL! You'll need it.**

**Write it here:**
```
My Railway URL: https://________________________________.up.railway.app
```

---

### STEP 12: Set Webhook URLs

**Replace YOUR_URL with the URL from step 11:**

```powershell
railway variables set WEBHOOK_BASE_URL=https://YOUR_URL.up.railway.app
railway variables set BASE_URL=https://YOUR_URL.up.railway.app
```

**Example:**
```powershell
railway variables set WEBHOOK_BASE_URL=https://auto-calling-production-xyz.up.railway.app
railway variables set BASE_URL=https://auto-calling-production-xyz.up.railway.app
```

---

### STEP 13: Redeploy with New Variables

```powershell
railway up
```

Wait for deployment to complete (1-2 minutes).

---

### STEP 14: Run Database Migration

```powershell
railway run node src/database/migrate.js
```

✅ You should see:
```
✓ Schema created successfully
✓ Sample tenant created
✓ Sample admin user created
  Email: admin@test.com
  Password: password123
```

**If you see this, your backend is LIVE!** 🎉

---

### STEP 15: Test Backend

Open your browser and go to:

```
https://YOUR_URL.up.railway.app/health
```

Replace YOUR_URL with your actual Railway URL.

✅ Should show:
```json
{
  "status": "healthy",
  "service": "auto-calling-system",
  "database": "connected"
}
```

**If you see this, BACKEND IS WORKING!** ✅

---

## ✅ BACKEND DEPLOYMENT COMPLETE!

Your backend is now live at:
```
https://YOUR_URL.up.railway.app
```

---

## NEXT: Deploy Frontend (5 minutes)

### STEP 16: Install Vercel CLI

```powershell
npm install -g vercel
```

---

### STEP 17: Go to Frontend Folder

```powershell
cd frontend
```

---

### STEP 18: Create Production Config

**Replace YOUR_RAILWAY_URL with your actual Railway URL:**

```powershell
echo VITE_API_URL=https://YOUR_RAILWAY_URL.up.railway.app/api > .env.production
echo VITE_WS_URL=https://YOUR_RAILWAY_URL.up.railway.app >> .env.production
```

**Example:**
```powershell
echo VITE_API_URL=https://auto-calling-production-xyz.up.railway.app/api > .env.production
echo VITE_WS_URL=https://auto-calling-production-xyz.up.railway.app >> .env.production
```

---

### STEP 19: Deploy to Vercel

```powershell
vercel --prod
```

**Follow the prompts:**
- **Set up and deploy?** Press Enter (Yes)
- **Which scope?** Press Enter (your account)
- **Link to existing?** Type `N` and press Enter
- **Project name?** Type `auto-calling-frontend` and press Enter
- **Directory?** Press Enter (current directory)
- **Override settings?** Type `N` and press Enter

Wait for deployment (2-3 minutes).

✅ Shows: `✓ Production: https://auto-calling-frontend-xxx.vercel.app`

**COPY THIS VERCEL URL!**

---

### STEP 20: Update Backend CORS

Go back to root folder:

```powershell
cd ..
```

Set your frontend URL (replace with YOUR Vercel URL):

```powershell
railway variables set FRONTEND_URL=https://YOUR_VERCEL_URL.vercel.app
```

**Example:**
```powershell
railway variables set FRONTEND_URL=https://auto-calling-frontend-xyz.vercel.app
```

---

## 🎉 DEPLOYMENT COMPLETE!

### Your Live URLs:

**Backend API:**
```
https://YOUR_RAILWAY_URL.up.railway.app
```

**Frontend Dashboard:**
```
https://YOUR_VERCEL_URL.vercel.app
```

---

## STEP 21: Configure Twilio Webhooks

1. Go to: https://console.twilio.com
2. Click: **Phone Numbers → Manage → Active Numbers**
3. Click your phone number
4. Under **Voice Configuration:**

   **A Call Comes In:**
   - Select "Webhook"
   - URL: `https://YOUR_RAILWAY_URL.up.railway.app/webhooks/twilio/answer`
   - Method: HTTP POST

   **Status Callback:**
   - URL: `https://YOUR_RAILWAY_URL.up.railway.app/webhooks/twilio/status`

5. Click **SAVE**

---

## STEP 22: Test Everything!

1. Open: `https://YOUR_VERCEL_URL.vercel.app`

2. Login:
   - Email: `admin@test.com`
   - Password: `password123`

3. You should see the dashboard! 🎉

---

## 🎊 YOU'RE LIVE!

Your auto-calling system is now fully deployed and operational!

### What You Built:
- ✅ Backend API (Railway)
- ✅ PostgreSQL Database
- ✅ Redis Cache
- ✅ Frontend Dashboard (Vercel)
- ✅ Twilio Integration

### Next Steps:
1. Change default admin password
2. Create your first campaign
3. Upload leads (use sample_leads.csv)
4. Make test calls!

---

## Need Help?

If anything fails:
- Check: `railway logs` for backend errors
- Check Twilio Console → Monitor → Debugger for call issues
- See DEPLOYMENT_CHECKLIST.md for troubleshooting

---

## Summary of All Commands

For quick reference, here are ALL commands in order:

```powershell
# Setup
cd C:\Users\hp\Desktop\Calling
railway login
railway init
railway add  # PostgreSQL
railway add  # Redis

# Set variables (replace XXX with your values)
railway variables set TWILIO_ACCOUNT_SID=ACxxx
railway variables set TWILIO_AUTH_TOKEN=xxx
railway variables set TWILIO_NUMBER=+1xxx
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set JWT_SECRET=my-secret-key
railway variables set JWT_EXPIRES_IN=24h
railway variables set MAX_CONCURRENT_CALLS=10
railway variables set CALL_RETRY_MAX_ATTEMPTS=3
railway variables set CALL_RETRY_DELAY_MINUTES=60
railway variables set AMD_TIMEOUT=30

# Deploy backend
railway up
railway domain  # Copy this URL!
railway variables set WEBHOOK_BASE_URL=https://YOUR_URL.up.railway.app
railway variables set BASE_URL=https://YOUR_URL.up.railway.app
railway up
railway run node src/database/migrate.js

# Deploy frontend
npm install -g vercel
cd frontend
echo VITE_API_URL=https://YOUR_URL.up.railway.app/api > .env.production
echo VITE_WS_URL=https://YOUR_URL.up.railway.app >> .env.production
vercel --prod
cd ..
railway variables set FRONTEND_URL=https://YOUR_VERCEL_URL.vercel.app
```

**START WITH STEP 1 ABOVE!** 🚀
