# 🚀 Deploy Auto-Calling System via GitHub

## Your Configuration

- **GitHub Repo:** https://github.com/smartroutelogistics/Califyultimate.git
- **Twilio Account SID:** YOUR_ACCOUNT_SID
- **Twilio Auth Token:** YOUR_AUTH_TOKEN
- **Twilio Phone:** YOUR_TWILIO_NUMBER

---

## ⚡ QUICK START - Copy These Commands

### STEP 1: Push Code to GitHub

Open PowerShell and run:

```powershell
cd C:\Users\hp\Desktop\Calling

# Push to your GitHub repository
git push -u origin main
```

**If this asks for credentials:**
- Username: Your GitHub username
- Password: Use a Personal Access Token (not your password)

**Don't have a token? Create one:**
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select "repo" scope
4. Click "Generate token"
5. Copy the token and use it as password

---

### STEP 2: Deploy to Railway from GitHub

#### 2a. Login to Railway

```powershell
railway login
```

Browser opens → Click "Sign in with GitHub" → Authorize → Close browser

#### 2b. Create Project from GitHub Repo

**Option A: Using Railway Dashboard (Easier)**

1. Go to: https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select repository: `smartroutelogistics/Califyultimate`
4. Click "Deploy Now"
5. Railway will automatically start deploying

**Option B: Using CLI**

```powershell
railway init
```
- Choose "Empty Project"
- Name it: `auto-calling-system`

Then link to GitHub repo in Railway dashboard.

---

### STEP 3: Add Databases

In Railway Dashboard:

1. Click your project
2. Click "+ New" → "Database" → "PostgreSQL"
3. Wait 30 seconds
4. Click "+ New" → "Database" → "Redis"
5. Wait 30 seconds

**OR via CLI:**

```powershell
railway add
```
Select PostgreSQL, then run again and select Redis.

---

### STEP 4: Set Environment Variables

**In Railway Dashboard:**

1. Click on your service (not the databases)
2. Click "Variables" tab
3. Click "Add Variable"
4. Add these one by one:

```
TWILIO_ACCOUNT_SID=YOUR_ACCOUNT_SID
TWILIO_AUTH_TOKEN=YOUR_AUTH_TOKEN
TWILIO_NUMBER=YOUR_TWILIO_NUMBER

NODE_ENV=production
PORT=3000
JWT_SECRET=VolticaiCoding2024SecureKey
JWT_EXPIRES_IN=24h
MAX_CONCURRENT_CALLS=10
CALL_RETRY_MAX_ATTEMPTS=3
CALL_RETRY_DELAY_MINUTES=60
AMD_TIMEOUT=30
```

**OR via CLI:**

```powershell
railway variables set TWILIO_ACCOUNT_SID=YOUR_ACCOUNT_SID
railway variables set TWILIO_AUTH_TOKEN=YOUR_AUTH_TOKEN
railway variables set TWILIO_NUMBER=YOUR_TWILIO_NUMBER
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set JWT_SECRET=VolticaiCoding2024SecureKey
railway variables set JWT_EXPIRES_IN=24h
railway variables set MAX_CONCURRENT_CALLS=10
railway variables set CALL_RETRY_MAX_ATTEMPTS=3
railway variables set CALL_RETRY_DELAY_MINUTES=60
railway variables set AMD_TIMEOUT=30
```

---

### STEP 5: Generate Domain

**In Railway Dashboard:**

1. Click your service
2. Go to "Settings" tab
3. Scroll to "Networking"
4. Click "Generate Domain"
5. Copy the URL (example: https://califyultimate-production.up.railway.app)

**OR via CLI:**

```powershell
railway domain
```

**WRITE DOWN THIS URL:**
```
My Railway URL: _______________________________________________
```

---

### STEP 6: Set Webhook URLs

Replace `YOUR_RAILWAY_URL` with the URL from Step 5:

**Via Dashboard:**
- Add variable: `WEBHOOK_BASE_URL` = `https://YOUR_RAILWAY_URL.up.railway.app`
- Add variable: `BASE_URL` = `https://YOUR_RAILWAY_URL.up.railway.app`

**Via CLI:**

```powershell
railway variables set WEBHOOK_BASE_URL=https://califyultimate-production.up.railway.app
railway variables set BASE_URL=https://califyultimate-production.up.railway.app
```

(Replace with YOUR actual URL)

**Redeploy:**

Click "Redeploy" in dashboard OR run:
```powershell
railway up
```

---

### STEP 7: Run Database Migration

**Via CLI:**

```powershell
railway run node src/database/migrate.js
```

**You should see:**
```
✓ Schema created successfully
✓ Sample tenant created
✓ Sample admin user created
  Email: admin@test.com
  Password: password123
```

✅ **BACKEND IS LIVE!**

---

### STEP 8: Test Backend

Open browser:
```
https://YOUR_RAILWAY_URL.up.railway.app/health
```

Should show:
```json
{
  "status": "healthy",
  "service": "auto-calling-system",
  "database": "connected"
}
```

✅ **BACKEND WORKING!**

---

### STEP 9: Deploy Frontend to Vercel

#### 9a. Install Vercel CLI

```powershell
npm install -g vercel
```

#### 9b. Navigate to Frontend

```powershell
cd frontend
```

#### 9c. Create Environment Config

Replace `YOUR_RAILWAY_URL` with your actual URL:

```powershell
echo VITE_API_URL=https://YOUR_RAILWAY_URL.up.railway.app/api > .env.production
echo VITE_WS_URL=https://YOUR_RAILWAY_URL.up.railway.app >> .env.production
```

Example:
```powershell
echo VITE_API_URL=https://califyultimate-production.up.railway.app/api > .env.production
echo VITE_WS_URL=https://califyultimate-production.up.railway.app >> .env.production
```

#### 9d. Deploy

```powershell
vercel --prod
```

Follow prompts:
- Set up? → Yes (Enter)
- Link to existing? → No (N)
- Project name? → `califyultimate-frontend` (Enter)
- Directory? → `.` (Enter)
- Override? → No (N)

Wait 2-3 minutes.

**COPY YOUR VERCEL URL:**
```
My Vercel URL: ________________________________________________
```

---

### STEP 10: Update Backend CORS

Go back to main folder:

```powershell
cd ..
```

Set frontend URL (replace with YOUR Vercel URL):

```powershell
railway variables set FRONTEND_URL=https://YOUR_VERCEL_URL.vercel.app
```

Example:
```powershell
railway variables set FRONTEND_URL=https://califyultimate-frontend.vercel.app
```

---

### STEP 11: Configure Twilio Webhooks

1. Go to: https://console.twilio.com
2. Login with your credentials
3. Click: **Phone Numbers** → **Manage** → **Active Numbers**
4. Click your Twilio phone number
5. Scroll to "Voice Configuration"

**Set these webhooks:**

**A Call Comes In:**
- Webhook: `https://YOUR_RAILWAY_URL.up.railway.app/webhooks/twilio/answer`
- Method: HTTP POST

**Status Callback URL:**
- URL: `https://YOUR_RAILWAY_URL.up.railway.app/webhooks/twilio/status`

Replace `YOUR_RAILWAY_URL` with your actual Railway URL.

Example URLs:
```
Answer: https://califyultimate-production.up.railway.app/webhooks/twilio/answer
Status: https://califyultimate-production.up.railway.app/webhooks/twilio/status
```

6. Click **SAVE**

---

### STEP 12: Test Complete System

Open browser:
```
https://YOUR_VERCEL_URL.vercel.app
```

**Login:**
- Email: `admin@test.com`
- Password: `password123`

✅ **YOU SHOULD SEE THE DASHBOARD!**

---

## 🎉 DEPLOYMENT COMPLETE!

### Your Live URLs:

**Backend API:**
```
https://______________.up.railway.app
```

**Frontend Dashboard:**
```
https://______________.vercel.app
```

**GitHub Repository:**
```
https://github.com/smartroutelogistics/Califyultimate
```

---

## 📋 Next Steps

1. ✅ **Change Admin Password**
   - Login to dashboard
   - Go to Settings
   - Change password

2. ✅ **Create Your First Campaign**
   - Dashboard → Campaigns → Create
   - Name: "Test Campaign"
   - Caller ID: YOUR_TWILIO_NUMBER
   - Save

3. ✅ **Upload Test Leads**
   - Dashboard → Upload Leads
   - Select campaign
   - Upload: `sample_leads.csv`

4. ✅ **Make Test Calls**
   - Start campaign
   - Monitor in Reports tab
   - Check Twilio Console → Monitor → Logs

---

## 🔄 Future Deployments

When you make code changes:

```powershell
# 1. Commit changes
git add .
git commit -m "Your commit message"

# 2. Push to GitHub
git push origin main

# 3. Railway auto-deploys from GitHub!
# (No need to redeploy manually)
```

---

## 🐛 Troubleshooting

**Push to GitHub failed:**
```
Solution: Use Personal Access Token instead of password
Create at: https://github.com/settings/tokens
```

**Railway deployment failed:**
```
Check logs: railway logs
Or in dashboard: Click service → Deployments → View logs
```

**Frontend can't connect to backend:**
```
1. Verify FRONTEND_URL is set in Railway
2. Check CORS in browser console
3. Verify API URL in frontend/.env.production
```

**Twilio webhooks not working:**
```
1. Check Twilio Console → Monitor → Debugger
2. Verify webhook URLs are correct
3. Check Railway logs for errors
```

---

## 🎊 You're All Set!

Your auto-calling system is:
- ✅ Deployed on Railway (backend)
- ✅ Deployed on Vercel (frontend)
- ✅ Code on GitHub (smartroutelogistics/Califyultimate)
- ✅ Twilio integrated
- ✅ Ready for production use!

**Start making calls!** 🚀
