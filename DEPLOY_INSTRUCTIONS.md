# 🚀 DEPLOY NOW - Follow These Steps

Railway CLI is installed! Follow these steps to deploy:

---

## STEP 1: Login to Railway (Interactive)

Open a terminal in this folder and run:

```bash
railway login
```

This will open your browser. Sign up/login with GitHub (recommended).

---

## STEP 2: Initialize Project

After logging in, run:

```bash
railway init
```

When prompted:
- **Name:** `auto-calling-system` (or your choice)
- **Empty project:** Select YES

---

## STEP 3: Add PostgreSQL Database

```bash
railway add
```

Select: **PostgreSQL**

Wait ~30 seconds for provisioning.

---

## STEP 4: Add Redis

```bash
railway add
```

Select: **Redis**

Wait ~30 seconds for provisioning.

---

## STEP 5: Set Environment Variables

**IMPORTANT:** You need your Twilio credentials first!

### Get Twilio Credentials:

1. Go to https://console.twilio.com
2. Copy your **Account SID** (starts with AC...)
3. Copy your **Auth Token**
4. Get a phone number: Console → Phone Numbers → Buy a number ($1/month)

### Set Variables:

Replace the XXX values with your actual Twilio credentials:

```bash
railway variables set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
railway variables set TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
railway variables set TWILIO_NUMBER=+1xxxxxxxxxx
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set JWT_EXPIRES_IN=24h
railway variables set MAX_CONCURRENT_CALLS=10
railway variables set CALL_RETRY_MAX_ATTEMPTS=3
railway variables set CALL_RETRY_DELAY_MINUTES=60
railway variables set AMD_TIMEOUT=30
```

**Note:** If `openssl` command fails on Windows, just use any random 32-character string for JWT_SECRET

---

## STEP 6: Deploy Backend

```bash
railway up
```

This will:
- Upload your code
- Install dependencies
- Start the server

Wait for "✓ Deployment successful" message.

---

## STEP 7: Generate Domain

```bash
railway domain
```

This generates a public URL for your backend.

**COPY THIS URL!** It will look like:
```
https://auto-calling-production-xxxx.up.railway.app
```

---

## STEP 8: Set Webhook URLs

Replace `YOUR_URL` with the URL from step 7:

```bash
railway variables set WEBHOOK_BASE_URL=https://YOUR_URL.up.railway.app
railway variables set BASE_URL=https://YOUR_URL.up.railway.app
```

Then redeploy:

```bash
railway up
```

---

## STEP 9: Run Database Migration

```bash
railway run node src/database/migrate.js
```

You should see:
```
✓ Schema created successfully
✓ Sample tenant created
✓ Sample admin user created
  Email: admin@test.com
  Password: password123
```

---

## STEP 10: Test Backend

Open in browser (replace with your URL):
```
https://YOUR_URL.up.railway.app/health
```

Should show:
```json
{
  "status": "healthy",
  "service": "auto-calling-system",
  "database": "connected"
}
```

✅ **Backend deployed successfully!**

---

## STEP 11: Deploy Frontend

```bash
cd frontend
npm install -g vercel
```

Create production environment file (replace YOUR_URL):

```bash
echo VITE_API_URL=https://YOUR_URL.up.railway.app/api > .env.production
echo VITE_WS_URL=https://YOUR_URL.up.railway.app >> .env.production
```

Deploy:

```bash
vercel --prod
```

Follow prompts:
- Setup? **Y**
- Link to existing? **N**
- Project name? **auto-calling-frontend**
- Directory? **.** (press Enter)
- Override? **N**

**COPY YOUR VERCEL URL** when deployment completes!

---

## STEP 12: Update CORS

Go back to root folder:

```bash
cd ..
```

Set your frontend URL (replace with Vercel URL):

```bash
railway variables set FRONTEND_URL=https://YOUR_VERCEL_URL.vercel.app
```

---

## STEP 13: Configure Twilio Webhooks

1. Go to https://console.twilio.com
2. Phone Numbers → Manage → Active Numbers
3. Click your phone number
4. Under "Voice Configuration":
   - **A Call Comes In:**
     - Webhook: `https://YOUR_RAILWAY_URL.up.railway.app/webhooks/twilio/answer`
     - HTTP POST
   - **Status Callback:**
     - `https://YOUR_RAILWAY_URL.up.railway.app/webhooks/twilio/status`
5. **SAVE**

---

## STEP 14: Test Complete System

1. Open: `https://YOUR_VERCEL_URL.vercel.app`
2. Login:
   - Email: `admin@test.com`
   - Password: `password123`
3. You should see the dashboard!

---

## 🎉 DEPLOYMENT COMPLETE!

### Your URLs:

- **Backend:** https://________.up.railway.app
- **Frontend:** https://________.vercel.app
- **Health Check:** https://________.up.railway.app/health

### Default Login:

- **Email:** admin@test.com
- **Password:** password123

### Next Steps:

1. ✅ Change default password
2. ✅ Create a test campaign
3. ✅ Upload sample_leads.csv
4. ✅ Make your first test call!

---

## 🐛 Troubleshooting

### View Logs:
```bash
railway logs
```

### Check Variables:
```bash
railway variables
```

### Redeploy:
```bash
railway up
```

### Need Help?

Check [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for detailed troubleshooting.

---

## 📞 Need Twilio Trial Credits?

Twilio free trial includes:
- $15 credit
- Can make calls to verified numbers
- Enough to test the system thoroughly

**Start here:** https://www.twilio.com/try-twilio

---

**Ready? Start with STEP 1 above!** 🚀
