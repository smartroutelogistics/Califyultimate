# Deploy Now - Quick Deployment Guide

## Prerequisites
- Twilio account (get free trial at twilio.com)
- GitHub account (optional but recommended)
- Railway account (railway.app) - free tier available
- Vercel account (vercel.com) - free tier available

---

## Step 1: Deploy Backend to Railway (5 minutes)

### Option A: Using Railway Web Dashboard (Easiest)

1. **Go to Railway.app**
   ```
   https://railway.app
   ```
   - Sign up with GitHub (recommended)

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub account
   - Push this code to GitHub first, then select the repository

   **OR** select "Empty Project" if not using GitHub

3. **Add PostgreSQL Database**
   - Click "+ New"
   - Select "Database"
   - Choose "PostgreSQL"
   - Wait for provisioning (30 seconds)

4. **Add Redis**
   - Click "+ New"
   - Select "Database"
   - Choose "Redis"
   - Wait for provisioning (30 seconds)

5. **Deploy Backend Service**
   - Click "+ New"
   - Select "Empty Service" or "GitHub Repo"
   - If using Empty Service, Railway will provide deployment instructions

6. **Set Environment Variables**

   In your service settings → Variables tab, add:

   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxx
   TWILIO_NUMBER=+1xxxxxxxxxxxxx

   NODE_ENV=production
   PORT=3000

   JWT_SECRET=<generate-random-string>
   JWT_EXPIRES_IN=24h

   MAX_CONCURRENT_CALLS=10
   CALL_RETRY_MAX_ATTEMPTS=3
   CALL_RETRY_DELAY_MINUTES=60
   AMD_TIMEOUT=30
   ```

   Railway will automatically provide:
   - `DATABASE_URL` (from PostgreSQL)
   - `REDIS_HOST`, `REDIS_PORT` (from Redis)

7. **Get Your Deployment URL**
   - After deployment completes, click on your service
   - Click "Settings" → "Domains"
   - Click "Generate Domain"
   - Copy the URL (e.g., `https://autocall-production.up.railway.app`)

8. **Add Webhook URL**

   Go back to Variables and add:
   ```
   WEBHOOK_BASE_URL=https://your-app.up.railway.app
   BASE_URL=https://your-app.up.railway.app
   ```

9. **Redeploy**
   - Click on the deployment
   - Click "Redeploy"

---

### Option B: Using Railway CLI (Faster)

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize Project**
   ```bash
   railway init
   ```
   - Choose "Create new project"
   - Name it "auto-calling-system"

4. **Add PostgreSQL**
   ```bash
   railway add --database postgres
   ```

5. **Add Redis**
   ```bash
   railway add --database redis
   ```

6. **Set Environment Variables**
   ```bash
   # Twilio
   railway variables set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
   railway variables set TWILIO_AUTH_TOKEN=xxxxxxxxxxxxx
   railway variables set TWILIO_NUMBER=+1xxxxxxxxxxxxx

   # Server
   railway variables set NODE_ENV=production
   railway variables set PORT=3000

   # JWT Secret (generate random string)
   railway variables set JWT_SECRET=$(openssl rand -base64 32)
   railway variables set JWT_EXPIRES_IN=24h

   # App Settings
   railway variables set MAX_CONCURRENT_CALLS=10
   railway variables set CALL_RETRY_MAX_ATTEMPTS=3
   railway variables set CALL_RETRY_DELAY_MINUTES=60
   railway variables set AMD_TIMEOUT=30
   ```

7. **Deploy**
   ```bash
   railway up
   ```

8. **Get Domain**
   ```bash
   railway domain
   ```
   - This will generate a domain for you
   - Copy the URL

9. **Set Webhook URL**
   ```bash
   railway variables set WEBHOOK_BASE_URL=https://your-app.up.railway.app
   railway variables set BASE_URL=https://your-app.up.railway.app
   ```

10. **Redeploy**
    ```bash
    railway up
    ```

---

## Step 2: Run Database Migration (2 minutes)

After deployment, you need to create the database tables.

### Using Railway CLI:

```bash
# Connect to your Railway database
railway run node src/database/migrate.js
```

### OR Using Railway Shell:

1. Go to Railway dashboard
2. Click on your service
3. Click "Open Shell"
4. Run:
   ```bash
   node src/database/migrate.js
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

## Step 3: Deploy Frontend to Vercel (3 minutes)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Navigate to Frontend**
   ```bash
   cd frontend
   ```

3. **Create `.env.production`**
   ```bash
   # Create production environment file
   echo "VITE_API_URL=https://your-railway-app.up.railway.app/api" > .env.production
   echo "VITE_WS_URL=https://your-railway-app.up.railway.app" >> .env.production
   ```

   Replace `your-railway-app.up.railway.app` with your actual Railway URL

4. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

   Follow the prompts:
   - Setup and deploy? **Y**
   - Which scope? Choose your account
   - Link to existing project? **N**
   - Project name? `auto-calling-frontend` (or your choice)
   - Directory? `.` (current directory)
   - Override settings? **N**

5. **Set Environment Variables in Vercel**

   If the build fails, set env vars in Vercel dashboard:
   - Go to vercel.com
   - Select your project
   - Go to Settings → Environment Variables
   - Add:
     ```
     VITE_API_URL=https://your-railway-app.up.railway.app/api
     VITE_WS_URL=https://your-railway-app.up.railway.app
     ```
   - Redeploy from Deployments tab

6. **Get Your Frontend URL**
   - Vercel will show your deployment URL
   - Example: `https://auto-calling-frontend.vercel.app`

---

## Step 4: Configure Twilio Webhooks (2 minutes)

1. **Go to Twilio Console**
   ```
   https://console.twilio.com
   ```

2. **Navigate to Phone Numbers**
   - Phone Numbers → Manage → Active Numbers
   - Click on your Twilio phone number

3. **Configure Voice Webhooks**

   Under "Voice Configuration":
   - **A Call Comes In:**
     - Webhook
     - URL: `https://your-railway-app.up.railway.app/webhooks/twilio/answer`
     - HTTP POST

   - **Status Callback URL:**
     - `https://your-railway-app.up.railway.app/webhooks/twilio/status`

4. **Save Configuration**

---

## Step 5: Test Your Deployment (5 minutes)

1. **Access Frontend**
   ```
   https://your-frontend.vercel.app
   ```

2. **Login**
   - Email: `admin@test.com`
   - Password: `password123`

3. **Create a Test Campaign**
   - Go to "Campaigns"
   - Click "Create Campaign"
   - Fill in:
     - Name: "Test Campaign"
     - Caller ID: Your Twilio number
     - Enable AMD: Yes

4. **Upload Test Leads**
   - Go to "Upload Leads"
   - Select your campaign
   - Upload `sample_leads.csv`
   - Verify upload was successful

5. **Start Campaign**
   - Go back to "Campaigns"
   - Click "Start" on your test campaign

6. **Monitor Calls**
   - Go to "Reports"
   - Watch for call activity
   - Check Twilio Console → Monitor → Logs for detailed call logs

7. **Check Backend Health**
   ```
   https://your-railway-app.up.railway.app/health
   ```

   Should return:
   ```json
   {
     "status": "healthy",
     "service": "auto-calling-system",
     "database": "connected"
   }
   ```

---

## Step 6: Update CORS (if needed)

If you get CORS errors, add your frontend URL to backend:

1. **In Railway Dashboard**
   - Go to your backend service
   - Variables tab
   - Add:
     ```
     FRONTEND_URL=https://your-frontend.vercel.app
     ```

2. **Redeploy**

---

## Deployment URLs Summary

After deployment, you'll have:

| Service | URL | Purpose |
|---------|-----|---------|
| Backend API | https://xxx.up.railway.app | REST API |
| Frontend | https://xxx.vercel.app | Web Dashboard |
| Health Check | https://xxx.up.railway.app/health | Status |
| Webhooks | https://xxx.up.railway.app/webhooks/twilio/* | Twilio callbacks |

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
railway logs

# Common issues:
# 1. Missing environment variables
# 2. Database connection failed
# 3. Port already in use (shouldn't happen on Railway)
```

### Database migration failed
```bash
# Verify DATABASE_URL is set
railway variables

# Manually connect and run migration
railway run psql $DATABASE_URL
# Then paste schema.sql contents
```

### Frontend can't connect to backend
- Verify `VITE_API_URL` is correct in Vercel environment variables
- Check CORS is allowing your frontend domain
- Verify backend is running: `https://your-backend.up.railway.app/health`

### Twilio webhooks not working
- Verify `WEBHOOK_BASE_URL` matches your Railway domain
- Check Twilio Console → Monitor → Debugger for webhook errors
- Ensure webhooks are configured in Twilio phone number settings

### "403 Forbidden" on webhooks
- Temporarily disable Twilio signature validation:
  ```bash
  railway variables set SKIP_TWILIO_VALIDATION=true
  ```
- This should only be used for testing

---

## Cost Monitoring

### Railway Free Tier:
- $5 free credits per month
- Enough for development/testing
- Upgrade to Hobby ($5/mo) or Pro ($20/mo) for production

### Vercel Free Tier:
- Unlimited personal projects
- 100GB bandwidth
- Sufficient for most use cases

### Twilio:
- Pay as you go
- ~$0.014/min for calls
- Monitor usage in Console → Usage

---

## Next Steps After Deployment

1. ✅ Change default admin password
2. ✅ Create your real campaigns
3. ✅ Upload production leads
4. ✅ Create agent accounts
5. ✅ Set up monitoring alerts
6. ✅ Review [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for advanced configuration

---

## Quick Commands Reference

```bash
# Railway
railway login                    # Login
railway logs                     # View logs
railway run <command>            # Run command in production
railway variables                # List variables
railway variables set KEY=VALUE  # Set variable
railway link                     # Link to existing project

# Vercel
vercel                          # Deploy to preview
vercel --prod                   # Deploy to production
vercel logs                     # View logs
vercel env pull                 # Pull environment variables

# Database
railway run psql $DATABASE_URL  # Connect to database
railway run node src/database/migrate.js  # Run migration
```

---

## Support

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Twilio Docs: https://www.twilio.com/docs/voice
- Project Docs: See [README.md](README.md) and [docs/](docs/)

---

**You're all set! 🚀**

Your auto-calling system is now deployed and ready for production use!
