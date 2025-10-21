# 🚀 START HERE - Deploy Your Auto-Calling System

## What You Have

A complete, production-ready auto-calling system with:
- ✅ Backend API with Twilio integration
- ✅ React frontend dashboard
- ✅ Database schema ready
- ✅ All documentation
- ✅ Deployment scripts

**Total Files:** 43 files, ~9,000 lines of code

---

## Choose Your Deployment Method

### 🎯 **EASIEST: Automated Script (Recommended)**

**Windows:**
```bash
deploy.bat
```

**Mac/Linux:**
```bash
./deploy.sh
```

This script will:
1. Login to Railway
2. Create project
3. Add databases
4. Ask for your Twilio credentials
5. Deploy everything
6. Run database migration

**Time:** ~10 minutes

---

### 📋 **GUIDED: Step-by-Step Instructions**

Open this file and follow along:
```
DEPLOY_INSTRUCTIONS.md
```

Every command is provided with explanations.

**Time:** ~15 minutes

---

### ⚡ **MANUAL: Command Reference**

If you know what you're doing:
```
DEPLOY_COMMANDS.txt
```

Copy-paste all commands with your credentials.

**Time:** ~5 minutes

---

## Before You Start

### 1. Get Twilio Account (FREE)

Go to: https://www.twilio.com/try-twilio

- Sign up (free trial includes $15 credit)
- Get your Account SID
- Get your Auth Token
- Buy a phone number ($1/month)

### 2. Have These Ready

- [ ] Twilio Account SID (starts with AC...)
- [ ] Twilio Auth Token
- [ ] Twilio Phone Number (+1XXXXXXXXXX)

---

## Deployment Overview

```
┌─────────────┐
│  Railway    │  Backend (Node.js API)
│  (Free)     │  + PostgreSQL
│             │  + Redis
└─────────────┘
       │
       │ Connected to
       │
┌─────────────┐
│  Vercel     │  Frontend (React)
│  (Free)     │  Dashboard
└─────────────┘
       │
       │ Connected to
       │
┌─────────────┐
│  Twilio     │  Voice API
│  (Pay-as-go)│  ~$0.014/min
└─────────────┘
```

---

## Quick Deploy NOW

### Option 1: Use The Script

1. **Open terminal in this folder**

2. **Run:**
   ```bash
   # Windows
   deploy.bat

   # Mac/Linux
   ./deploy.sh
   ```

3. **Follow prompts**
   - Login to Railway (browser opens)
   - Enter Twilio credentials when asked
   - Wait for deployment

4. **Done!**

### Option 2: Manual Commands

1. **Login to Railway**
   ```bash
   railway login
   ```

2. **Initialize**
   ```bash
   railway init
   ```

3. **Add Databases**
   ```bash
   railway add  # Select PostgreSQL
   railway add  # Select Redis
   ```

4. **Set Variables** (use your real values)
   ```bash
   railway variables set TWILIO_ACCOUNT_SID=ACxxx
   railway variables set TWILIO_AUTH_TOKEN=xxx
   railway variables set TWILIO_NUMBER=+1xxx
   railway variables set NODE_ENV=production
   railway variables set PORT=3000
   railway variables set JWT_SECRET=$(openssl rand -base64 32)
   railway variables set JWT_EXPIRES_IN=24h
   ```

5. **Deploy**
   ```bash
   railway up
   ```

6. **Get URL**
   ```bash
   railway domain
   ```
   Copy this URL!

7. **Set Webhook URL**
   ```bash
   railway variables set WEBHOOK_BASE_URL=https://YOUR_URL.up.railway.app
   railway variables set BASE_URL=https://YOUR_URL.up.railway.app
   railway up
   ```

8. **Run Migration**
   ```bash
   railway run node src/database/migrate.js
   ```

9. **Test**
   ```bash
   curl https://YOUR_URL.up.railway.app/health
   ```

---

## After Backend is Deployed

### Deploy Frontend

```bash
cd frontend
npm install -g vercel
vercel --prod
```

Follow prompts, then set environment variables in Vercel dashboard.

---

## Test Your Deployment

1. **Backend Health Check**
   ```
   https://YOUR_RAILWAY_URL.up.railway.app/health
   ```
   Should return: `{"status": "healthy"}`

2. **Open Frontend**
   ```
   https://YOUR_VERCEL_URL.vercel.app
   ```

3. **Login**
   - Email: `admin@test.com`
   - Password: `password123`

4. **Configure Twilio**
   - Console → Phone Numbers → Your Number
   - Set webhook URLs (see DEPLOY_INSTRUCTIONS.md)

---

## Costs

### Free Tier Usage
- **Railway:** $5 free credits/month (enough for testing)
- **Vercel:** Free tier (unlimited)
- **Twilio:** $15 trial credit

### Production Costs
- **Small** (3K calls/month): ~$100/month
- **Medium** (30K calls/month): ~$900/month

See [docs/COSTS_AND_SCALE.md](docs/COSTS_AND_SCALE.md) for details.

---

## Documentation

| File | Purpose |
|------|---------|
| **DEPLOY_INSTRUCTIONS.md** | Detailed step-by-step guide |
| **DEPLOYMENT_CHECKLIST.md** | Checkbox format |
| **DEPLOY_COMMANDS.txt** | Command reference |
| **README.md** | System overview |
| **QUICKSTART.md** | Local development |
| **docs/** | Full documentation |

---

## Get Help

### Stuck?

1. Check [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) troubleshooting section
2. View Railway logs: `railway logs`
3. Check Twilio debugger: Console → Monitor → Debugger

### Resources

- Railway: https://docs.railway.app
- Vercel: https://vercel.com/docs
- Twilio: https://www.twilio.com/docs/voice

---

## Next Steps After Deployment

1. ✅ Change default admin password
2. ✅ Create your first campaign
3. ✅ Upload sample_leads.csv
4. ✅ Make test calls
5. ✅ Add real agents
6. ✅ Go to production!

---

## 🎉 Ready to Deploy?

**Choose one:**

- 🚀 **Quick:** Run `deploy.bat` (Windows) or `./deploy.sh` (Mac/Linux)
- 📖 **Guided:** Open [DEPLOY_INSTRUCTIONS.md](DEPLOY_INSTRUCTIONS.md)
- ⚡ **Fast:** Use [DEPLOY_COMMANDS.txt](DEPLOY_COMMANDS.txt)

**All code is ready. Just run the deployment!**

---

**Questions?** Check the [README.md](README.md) or [docs/](docs/) folder.

**Let's go! 🚀**
