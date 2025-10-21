# Deployment Checklist

Follow these steps in order to deploy your auto-calling system.

## ✅ Pre-Deployment Checklist

- [x] Code committed to git
- [ ] Twilio account created
- [ ] Railway account created
- [ ] Vercel account created (for frontend)

---

## 🚀 Deployment Steps

### Step 1: Get Twilio Credentials (2 minutes)

1. Go to https://www.twilio.com/try-twilio
2. Sign up for free trial
3. Get credentials from Console:
   - Account SID (starts with AC...)
   - Auth Token
4. Buy a phone number:
   - Console → Phone Numbers → Buy a number
   - Choose a number with Voice capabilities
   - Cost: $1/month

**Save these for later:**
```
TWILIO_ACCOUNT_SID=AC_____________________
TWILIO_AUTH_TOKEN=_______________________
TWILIO_NUMBER=+1_________________________
```

---

### Step 2: Deploy to Railway

#### Option A: Web Dashboard (Recommended for first-time)

1. **Go to https://railway.app** and sign up

2. **Create New Project**
   - Click "New Project"
   - Select "Empty Project"

3. **Add PostgreSQL**
   - Click "+ New" → "Database" → "PostgreSQL"
   - ✅ Wait for it to provision (~30 seconds)

4. **Add Redis**
   - Click "+ New" → "Database" → "Redis"
   - ✅ Wait for it to provision (~30 seconds)

5. **Create Backend Service**
   - Click "+ New" → "Empty Service"
   - Name it "backend"

6. **Connect to GitHub (Recommended)**

   **First, push your code to GitHub:**
   ```bash
   # Create a new repository on GitHub.com
   # Then run these commands:
   git remote add origin https://github.com/YOUR_USERNAME/auto-calling-system.git
   git branch -M main
   git push -u origin main
   ```

   **Then in Railway:**
   - Click on your backend service
   - Click "Settings" → "Service"
   - Under "Source", click "Connect Repo"
   - Select your GitHub repository
   - ✅ Deployment will start automatically

7. **Set Environment Variables**

   Click on backend service → "Variables" tab → "Add Variable"

   Add these **one by one**:
   ```
   TWILIO_ACCOUNT_SID=AC... (your Twilio SID)
   TWILIO_AUTH_TOKEN=... (your Twilio token)
   TWILIO_NUMBER=+1... (your Twilio number)

   NODE_ENV=production
   PORT=3000

   JWT_SECRET=change-this-to-a-random-32-character-string
   JWT_EXPIRES_IN=24h

   MAX_CONCURRENT_CALLS=10
   CALL_RETRY_MAX_ATTEMPTS=3
   CALL_RETRY_DELAY_MINUTES=60
   AMD_TIMEOUT=30
   ```

   **Note:** Railway automatically provides `DATABASE_URL`, `REDIS_HOST`, and `REDIS_PORT`

8. **Generate Domain**
   - Click on backend service
   - Go to "Settings" → "Networking"
   - Click "Generate Domain"
   - ✅ Copy your URL: `https://xxxxx.up.railway.app`

9. **Add Webhook URL**
   - Go back to "Variables"
   - Add these:
     ```
     WEBHOOK_BASE_URL=https://YOUR-APP.up.railway.app
     BASE_URL=https://YOUR-APP.up.railway.app
     ```
   - Replace with your actual Railway URL from step 8

10. **Wait for Deployment**
    - Watch the deployment logs
    - ✅ Should see "Server running on port 3000"

#### Option B: Using CLI (Faster)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize
railway init

# Add services
railway add --database postgres
railway add --database redis

# Set all variables at once
railway variables set TWILIO_ACCOUNT_SID=ACxxx
railway variables set TWILIO_AUTH_TOKEN=xxx
railway variables set TWILIO_NUMBER=+1xxx
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set JWT_EXPIRES_IN=24h
railway variables set MAX_CONCURRENT_CALLS=10
railway variables set CALL_RETRY_MAX_ATTEMPTS=3
railway variables set CALL_RETRY_DELAY_MINUTES=60
railway variables set AMD_TIMEOUT=30

# Deploy
railway up

# Get domain
railway domain
# Copy the URL

# Set webhook URLs
railway variables set WEBHOOK_BASE_URL=https://your-url.up.railway.app
railway variables set BASE_URL=https://your-url.up.railway.app

# Redeploy
railway up
```

---

### Step 3: Run Database Migration

**After your backend is deployed:**

```bash
# Using Railway CLI
railway run node src/database/migrate.js
```

**OR in Railway Dashboard:**
1. Click on backend service
2. Click "..." menu → "Shell"
3. Run: `node src/database/migrate.js`

✅ **You should see:**
```
✓ Schema created successfully
✓ Sample tenant created
✓ Sample admin user created
  Email: admin@test.com
  Password: password123
```

---

### Step 4: Test Backend

Open in browser:
```
https://YOUR-APP.up.railway.app/health
```

✅ **Should return:**
```json
{
  "status": "healthy",
  "service": "auto-calling-system",
  "database": "connected"
}
```

---

### Step 5: Deploy Frontend to Vercel

1. **Navigate to frontend folder**
   ```bash
   cd frontend
   ```

2. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

3. **Create production env file**
   ```bash
   # Replace YOUR-APP with your Railway URL
   echo "VITE_API_URL=https://YOUR-APP.up.railway.app/api" > .env.production
   echo "VITE_WS_URL=https://YOUR-APP.up.railway.app" >> .env.production
   ```

4. **Deploy**
   ```bash
   vercel --prod
   ```

   Follow prompts:
   - Setup? **Y**
   - Link to existing? **N**
   - Project name? **auto-calling-frontend**
   - Directory? **.** (press Enter)
   - Override? **N**

5. **Or Push to GitHub and deploy via Vercel Dashboard**

   - Go to https://vercel.com
   - Click "Add New" → "Project"
   - Import your GitHub repository (frontend folder)
   - Set environment variables:
     ```
     VITE_API_URL=https://YOUR-APP.up.railway.app/api
     VITE_WS_URL=https://YOUR-APP.up.railway.app
     ```
   - Click "Deploy"

✅ **Copy your Vercel URL:** `https://xxxxx.vercel.app`

---

### Step 6: Update CORS (Important!)

Go back to Railway:
1. Click on backend service
2. Variables tab
3. Add:
   ```
   FRONTEND_URL=https://YOUR-VERCEL-URL.vercel.app
   ```

The backend's `cors()` configuration will use this to allow requests.

---

### Step 7: Configure Twilio Webhooks

1. **Go to Twilio Console**
   - https://console.twilio.com
   - Phone Numbers → Manage → Active Numbers
   - Click your phone number

2. **Configure Voice & Fax**

   Under "Voice Configuration":
   - **A Call Comes In:**
     - Webhook
     - `https://YOUR-RAILWAY-APP.up.railway.app/webhooks/twilio/answer`
     - HTTP POST

   - **Status Callback URL:**
     - `https://YOUR-RAILWAY-APP.up.railway.app/webhooks/twilio/status`

3. **Save**

✅ Twilio is now configured!

---

### Step 8: Test End-to-End

1. **Open Frontend**
   ```
   https://YOUR-VERCEL-URL.vercel.app
   ```

2. **Login**
   - Email: `admin@test.com`
   - Password: `password123`

3. **Create Test Campaign**
   - Go to "Campaigns"
   - Click "Create Campaign" (if button exists in UI)
   - Or use API directly for now:

   ```bash
   curl -X POST https://YOUR-RAILWAY-APP.up.railway.app/api/campaigns \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Campaign",
       "caller_id": "+1YOUR_TWILIO_NUMBER",
       "amd_enabled": true,
       "record_calls": true
     }'
   ```

4. **Upload Test Leads**
   - Go to "Upload Leads"
   - Select campaign
   - Upload `sample_leads.csv`

5. **Start Campaign**
   - Go to "Campaigns"
   - Find your campaign
   - Click "Start"

6. **Monitor**
   - Go to "Reports"
   - Watch for call records
   - Check Twilio Console → Monitor → Logs

---

## ✅ Post-Deployment Checklist

- [ ] Backend health check passes
- [ ] Frontend loads without errors
- [ ] Can login to dashboard
- [ ] Database connection working
- [ ] Twilio webhooks configured
- [ ] Test campaign created
- [ ] Test leads uploaded
- [ ] First test call successful

---

## 🎯 Important URLs

| Service | URL | Notes |
|---------|-----|-------|
| Backend | `https://______.up.railway.app` | Fill in your Railway URL |
| Frontend | `https://______.vercel.app` | Fill in your Vercel URL |
| Health | `https://______.up.railway.app/health` | Test backend |
| API Docs | See `docs/API_SPECIFICATION.md` | - |

---

## 🐛 Troubleshooting

### Backend won't start
```bash
railway logs
# Check for missing environment variables or database errors
```

### Frontend can't reach backend
- Check CORS: Verify `FRONTEND_URL` is set in Railway
- Check network: Open browser DevTools → Network tab
- Verify API URL in Vercel environment variables

### Twilio webhooks fail
- Check Railway logs: `railway logs`
- Check Twilio debugger: Console → Monitor → Debugger
- Verify webhook URLs are correct
- Temporarily disable signature validation:
  ```bash
  railway variables set SKIP_TWILIO_VALIDATION=true
  ```

### Database issues
```bash
# Check connection
railway run psql $DATABASE_URL -c "SELECT 1"

# Re-run migration
railway run node src/database/migrate.js
```

---

## 📊 Monitoring

### Railway Dashboard
- View logs: Click service → "Logs" tab
- Monitor metrics: CPU, Memory, Network
- Check build status

### Twilio Console
- Monitor → Logs → Debugger
- Monitor → Usage → Voice
- Check call records and costs

### Vercel Dashboard
- View deployment logs
- Monitor analytics
- Check bandwidth usage

---

## 💰 Cost Tracking

### Current Usage
- Railway: Free tier ($5 credits/mo) or Hobby ($5/mo)
- Vercel: Free tier (sufficient for most cases)
- Twilio: Pay-as-you-go (~$0.014/min + $1/mo per number)

### Set Budget Alerts
1. **Railway:** Settings → Usage → Set spending limit
2. **Twilio:** Console → Usage → Alerts → Create alert

---

## 🔐 Security Checklist

- [ ] Change default admin password
- [ ] Enable JWT token expiration (already set to 24h)
- [ ] Twilio webhook signature validation enabled
- [ ] HTTPS enforced (automatic on Railway/Vercel)
- [ ] Environment variables secured (not in code)
- [ ] CORS configured correctly

---

## 📝 Next Steps

1. **Change Admin Password**
   - Login to frontend
   - Create new admin user
   - Delete default user

2. **Create Real Campaigns**
   - Plan your calling strategy
   - Set up retry policies
   - Configure calling hours

3. **Add Agents**
   - Create agent accounts
   - Set up agent groups
   - Train agents on console usage

4. **Upload Production Leads**
   - Prepare CSV with real contacts
   - Ensure DNC compliance
   - Validate phone numbers

5. **Monitor & Optimize**
   - Track AMD accuracy
   - Monitor costs
   - Adjust retry policies

---

## 🎉 You're Live!

Your auto-calling system is now deployed and ready for production use!

**Documentation:**
- [README.md](README.md) - Overview
- [QUICKSTART.md](QUICKSTART.md) - Quick setup
- [docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md) - API reference
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - Detailed deployment guide
- [docs/COSTS_AND_SCALE.md](docs/COSTS_AND_SCALE.md) - Cost analysis

**Support:**
- Railway: https://railway.app/help
- Vercel: https://vercel.com/support
- Twilio: https://www.twilio.com/docs

Need help? Check the [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) troubleshooting section!
