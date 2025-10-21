# Quick Start Guide

Get the Auto-Calling System running in 10 minutes.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Twilio account (free trial works)
- ngrok (for local testing)

## 1. Clone & Install

```bash
# Backend
npm install

# Frontend
cd frontend
npm install
cd ..
```

## 2. Configure Environment

```bash
# Copy environment files
cp .env.example .env
cd frontend && cp .env.example .env && cd ..
```

Edit `.env`:
```env
# Get these from twilio.com/console
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_NUMBER=+1xxxxx

# Database
DATABASE_URL=postgres://postgres:password@localhost:5432/autocall_db

# JWT
JWT_SECRET=change-this-to-random-string

# Leave these for now (update after ngrok)
WEBHOOK_BASE_URL=http://localhost:3000
```

## 3. Setup Database

```bash
# Create database
createdb autocall_db

# Run migration
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

## 4. Start Redis

```bash
# macOS
brew services start redis

# Ubuntu
sudo service redis-server start

# Docker
docker run -d -p 6379:6379 redis:alpine
```

## 5. Start ngrok

```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

Update `.env`:
```env
WEBHOOK_BASE_URL=https://abc123.ngrok.io
```

## 6. Start Application

**Terminal 1 (Backend):**
```bash
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

## 7. Login & Test

1. Open http://localhost:5173
2. Login:
   - Email: `admin@test.com`
   - Password: `password123`

3. Create Campaign:
   - Name: "Test Campaign"
   - Caller ID: Your Twilio number
   - Enable AMD

4. Upload Leads:
   - Use `sample_leads.csv`
   - Or create your own CSV

5. Start Campaign & Make Test Call

## 8. Configure Twilio Webhooks (Optional)

For production, configure in Twilio Console:

1. Go to Phone Numbers → Manage → Active Numbers
2. Click your number
3. Under Voice Configuration:
   - Configure With: Webhooks/TwiML Bins
   - A Call Comes In: Webhook
   - URL: `https://your-domain.com/webhooks/twilio/answer`
   - HTTP: POST

## Test Numbers

Use Twilio's test number for free testing:
- `+15005550006` - Simulates human answer

## Troubleshooting

**"Cannot connect to database"**
```bash
# Check PostgreSQL is running
psql -l

# Verify DATABASE_URL in .env
```

**"Webhooks not working"**
```bash
# Check ngrok is running
curl https://YOUR_NGROK_URL.ngrok.io/health

# Verify WEBHOOK_BASE_URL in .env matches ngrok URL
```

**"Redis connection failed"**
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG
```

## Next Steps

- Read [README.md](README.md) for full documentation
- Check [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production deployment
- Review [docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md) for API details

## Need Help?

- Check application logs for errors
- Verify all environment variables are set
- Ensure all services (PostgreSQL, Redis, ngrok) are running
- Review [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) troubleshooting section
