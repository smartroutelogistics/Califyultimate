# Deployment & Testing Guide

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Testing Guide](#testing-guide)
3. [Production Deployment](#production-deployment)
4. [Cost Analysis](#cost-analysis)
5. [QA Checklist](#qa-checklist)

---

## Local Development Setup

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+ (for Bull queue)
- Twilio account
- ngrok (for webhook testing)

### Step-by-Step Setup

#### 1. Install Dependencies

```bash
# Backend
cd auto-calling-system
npm install

# Frontend
cd frontend
npm install
```

#### 2. Database Setup

```bash
# Create database
createdb autocall_db

# Run schema
psql -d autocall_db -f src/database/schema.sql

# Verify tables created
psql -d autocall_db -c "\dt"
```

Expected output:
```
 Schema |     Name      | Type  |  Owner
--------+---------------+-------+----------
 public | agents        | table | postgres
 public | call_queue    | table | postgres
 public | calls         | table | postgres
 public | campaigns     | table | postgres
 public | dnc_list      | table | postgres
 public | leads         | table | postgres
 public | tenants       | table | postgres
 public | users         | table | postgres
```

#### 3. Configure Environment

```bash
# Backend
cp .env.example .env
```

Edit `.env`:

```env
# Twilio (Get from twilio.com/console)
TWILIO_ACCOUNT_SID=AC... # Your Account SID
TWILIO_AUTH_TOKEN=...    # Your Auth Token
TWILIO_NUMBER=+1...      # Your Twilio phone number

# Server
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000

# Database
DATABASE_URL=postgres://postgres:password@localhost:5432/autocall_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES_IN=24h

# Webhook URL (set after ngrok starts)
WEBHOOK_BASE_URL=https://your-ngrok-id.ngrok.io
```

Frontend:
```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000
```

#### 4. Start Redis

```bash
# macOS with Homebrew
brew services start redis

# Ubuntu
sudo service redis-server start

# Or with Docker
docker run -d -p 6379:6379 redis:alpine
```

#### 5. Start ngrok for Webhooks

```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`) and update `.env`:
```env
WEBHOOK_BASE_URL=https://abc123.ngrok.io
```

#### 6. Start Application

Terminal 1 (Backend):
```bash
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

#### 7. Create Test User

```bash
# Using psql
psql -d autocall_db

# Insert tenant
INSERT INTO tenants (id, name, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Tenant', 'test@example.com');

# Insert user (password: 'password123')
INSERT INTO users (email, password_hash, role, tenant_id, first_name, last_name)
VALUES (
  'admin@test.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'admin',
  '00000000-0000-0000-0000-000000000001',
  'Admin',
  'User'
);
```

#### 8. Access Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Login: admin@test.com / password123

---

## Testing Guide

### 1. Unit Testing

```bash
# Run backend tests
npm test

# Run with coverage
npm run test:coverage
```

### 2. Manual Testing Workflow

#### A. Campaign Creation

1. Log in to frontend
2. Navigate to Campaigns
3. Click "Create Campaign"
4. Fill in:
   - Name: "Test Campaign"
   - Caller ID: Your Twilio number
   - Schedule: Now → 1 hour from now
   - Enable AMD
5. Create campaign

#### B. Lead Upload

1. Navigate to "Upload Leads"
2. Select campaign
3. Upload `sample_leads.csv` (or create custom CSV)
4. Verify upload results:
   - Check valid/invalid counts
   - Review any errors

Sample CSV for testing:
```csv
first_name,last_name,phone,country,type,priority,do_not_call,notes
Test,User,+15005550006,US,broker,high,false,"Twilio test number - human"
VM,Test,YOUR_VOICEMAIL,US,carrier,normal,false,"Your voicemail for testing"
```

#### C. Start Campaign

1. Go to Campaigns
2. Find your campaign
3. Click "Start"
4. Verify leads moved to "queued" status

#### D. Test Call Flow

**Test 1: Human Answer (Twilio Test Number)**

```bash
# Twilio test number: +15005550006
# This simulates a human answering
```

Expected flow:
1. Call initiated
2. AMD detects "human"
3. Lead placed in conference
4. Agent phone rings
5. Agent hears whisper
6. Agent presses key
7. Agent joins conference
8. Call recorded

**Test 2: Voicemail Detection**

Use your own voicemail number:

Expected flow:
1. Call initiated
2. AMD detects "machine_end_beep"
3. Voicemail message played
4. Call logged as "voicemail"
5. Retry scheduled (if enabled)

#### E. Agent Console Testing

1. Create agent in database:
```sql
INSERT INTO agents (tenant_id, name, phone, email, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test Agent',
  '+1YOUR_PHONE',
  'agent@test.com',
  'available'
);
```

2. Navigate to Agent Console
3. Set status to "Available"
4. Trigger a call to a human-answered lead
5. Verify:
   - Incoming call notification appears
   - Accept/Decline buttons work
   - Call connects properly

### 3. Twilio Test Numbers

Twilio provides special test numbers in development:

| Number | Behavior |
|--------|----------|
| +15005550001 | Invalid |
| +15005550004 | Blocked by Twilio |
| +15005550006 | Valid (simulates human answer) |
| +15005550009 | Valid |

Use these for testing without incurring costs.

### 4. Webhook Testing

#### Test Answer Webhook

```bash
curl -X POST http://localhost:3000/webhooks/twilio/answer?leadId=LEAD_ID&callId=CALL_ID \
  -d "AnsweredBy=human" \
  -d "CallSid=CA123test" \
  -d "CallStatus=in-progress"
```

Set header if validation enabled:
```bash
-H "X-Twilio-Signature: YOUR_SIGNATURE"
```

To skip validation for testing:
```env
SKIP_TWILIO_VALIDATION=true
```

#### Test AMD Callback

```bash
curl -X POST http://localhost:3000/webhooks/twilio/amd?callId=CALL_ID \
  -d "AnsweredBy=machine_end_beep" \
  -d "CallSid=CA123test"
```

### 5. CSV Processing Tests

Create test CSVs to verify validation:

**Valid CSV:**
```csv
first_name,last_name,phone,country,type,priority,do_not_call,notes
John,Doe,+14155551234,US,broker,high,false,"Test"
```

**Invalid Phone:**
```csv
first_name,last_name,phone,country,type,priority,do_not_call,notes
Bad,Phone,invalid,US,broker,normal,false,"Should fail"
```

**Duplicate:**
```csv
first_name,last_name,phone,country,type,priority,do_not_call,notes
Dup,One,+14155551111,US,broker,normal,false,"First"
Dup,Two,+14155551111,US,broker,normal,false,"Duplicate"
```

Upload and verify error messages are clear.

---

## Production Deployment

### Option 1: Railway

#### Setup

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init

# Link to existing project (optional)
railway link
```

#### Add Services

```bash
# PostgreSQL
railway add postgresql

# Redis
railway add redis
```

#### Set Environment Variables

```bash
# Twilio
railway variables set TWILIO_ACCOUNT_SID=AC...
railway variables set TWILIO_AUTH_TOKEN=...
railway variables set TWILIO_NUMBER=+1...

# Server
railway variables set NODE_ENV=production
railway variables set PORT=3000

# JWT
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set JWT_EXPIRES_IN=24h

# Database (auto-set by Railway)
# DATABASE_URL is automatically provided

# Redis (auto-set by Railway)
# REDIS_HOST, REDIS_PORT auto-provided

# Get your Railway domain first, then:
railway variables set WEBHOOK_BASE_URL=https://your-app.railway.app
railway variables set BASE_URL=https://your-app.railway.app
```

#### Deploy

```bash
# Deploy backend
railway up

# Get the deployment URL
railway domain

# Configure Twilio webhooks in Twilio Console:
# Answer URL: https://your-app.railway.app/webhooks/twilio/answer
# Status Callback: https://your-app.railway.app/webhooks/twilio/status
```

#### Database Migration

```bash
# Connect to Railway PostgreSQL
railway run psql $DATABASE_URL

# Run schema
\i src/database/schema.sql
```

#### Deploy Frontend

For frontend, deploy to Vercel/Netlify:

```bash
cd frontend

# Build
npm run build

# Deploy to Vercel
npx vercel --prod

# Set environment variables in Vercel dashboard:
VITE_API_URL=https://your-app.railway.app/api
VITE_WS_URL=https://your-app.railway.app
```

### Option 2: Render

#### Backend Deployment

1. Go to render.com → New Web Service
2. Connect GitHub repository
3. Configure:
   - **Name:** autocall-backend
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Starter ($7/mo)

4. Add Environment Variables (same as Railway above)

5. Add PostgreSQL:
   - New → PostgreSQL
   - Connect to web service

6. Add Redis:
   - New → Redis
   - Connect to web service

7. Deploy

#### Frontend Deployment

1. New Static Site
2. Connect repository (frontend folder)
3. Configure:
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
4. Add environment variables
5. Deploy

### Option 3: AWS (Advanced)

#### Architecture

```
┌─────────────┐
│   Route53   │ (DNS)
└──────┬──────┘
       │
┌──────▼──────┐
│     ALB     │ (Load Balancer)
└──────┬──────┘
       │
┌──────▼──────┐
│     ECS     │ (Docker containers)
│  Fargate    │
└──────┬──────┘
       │
   ┌───┴────┐
   │        │
┌──▼──┐  ┌─▼──┐
│ RDS │  │ElastiCache
│PostgreSQL  │Redis│
└─────┘  └────┘
```

#### Steps

1. **Containerize Application**

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

2. **Push to ECR**

```bash
aws ecr create-repository --repository-name autocall

docker build -t autocall .
docker tag autocall:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/autocall:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/autocall:latest
```

3. **Create RDS PostgreSQL**
4. **Create ElastiCache Redis**
5. **Create ECS Cluster & Service**
6. **Configure ALB**
7. **Set up Auto Scaling**

---

## Cost Analysis

### Small Scale (3,000 calls/month, 2 min average)

**Twilio:**
- Voice: 6,000 min × $0.0140/min = $84.00
- Phone number: 1 × $1.00/mo = $1.00
- Recording storage: ~$0.50/mo
- **Subtotal: $85.50/mo**

**Infrastructure (Railway Starter):**
- Web service: $5/mo
- PostgreSQL: $5/mo
- Redis: $3/mo
- **Subtotal: $13/mo**

**Total: ~$98-100/month**

### Medium Scale (30,000 calls/month, 2 min average)

**Twilio:**
- Voice: 60,000 min × $0.0140/min = $840.00
- Phone numbers: 5 × $1.00/mo = $5.00
- Recording storage: ~$5/mo
- **Subtotal: $850/mo**

**Infrastructure (Railway Pro):**
- Web service: $20/mo
- PostgreSQL: $25/mo
- Redis: $10/mo
- **Subtotal: $55/mo**

**Total: ~$900-950/month**

### Large Scale (300,000 calls/month, 2 min average)

**Twilio (with volume discount):**
- Voice: 600,000 min × $0.0125/min = $7,500.00
- Phone numbers: 20 × $1.00/mo = $20.00
- Recording storage: ~$50/mo
- **Subtotal: $7,570/mo**

**Infrastructure (AWS):**
- ECS Fargate: $100/mo
- RDS (db.t3.medium): $60/mo
- ElastiCache (cache.t3.micro): $15/mo
- ALB: $16/mo
- Data transfer: $50/mo
- **Subtotal: $241/mo**

**Total: ~$7,800-8,000/month**

### Cost Optimization Tips

1. **Retry Policy:**
   - Avoid retrying voicemails
   - Limit max attempts to 2-3
   - **Savings: 10-15%**

2. **Recording Toggles:**
   - Only record successful human connections
   - **Savings: 5-10%**

3. **Regional Numbers:**
   - Use local area codes
   - **Savings: Variable**

4. **Batching:**
   - Spread calls during off-peak hours
   - **Savings: Operational efficiency**

5. **AMD Timeout:**
   - Set to 30s instead of default
   - **Savings: Reduces wasted minutes**

---

## QA Checklist

### Pre-Production Checklist

- [ ] **Database**
  - [ ] Schema applied
  - [ ] Indexes created
  - [ ] Backup configured
  - [ ] Connection pool sized appropriately

- [ ] **Environment Variables**
  - [ ] All required vars set
  - [ ] Secrets are strong (JWT_SECRET)
  - [ ] WEBHOOK_BASE_URL is correct
  - [ ] NODE_ENV=production

- [ ] **Twilio Configuration**
  - [ ] Account SID/Token correct
  - [ ] Phone number verified
  - [ ] Webhook URLs configured
  - [ ] Signature validation enabled

- [ ] **Security**
  - [ ] HTTPS enforced
  - [ ] CORS configured correctly
  - [ ] Rate limiting enabled
  - [ ] No secrets in code

### Functional Testing (10 Test Calls)

#### Test Scenario 1: Human Answered Call

- [ ] Call initiates successfully
- [ ] AMD detects human correctly
- [ ] Lead placed in conference
- [ ] Hold music plays
- [ ] Agent receives call
- [ ] Whisper message plays
- [ ] Agent accepts call
- [ ] Both parties connected
- [ ] Call duration < 15s from answer to agent join
- [ ] Call recorded (if enabled)
- [ ] Disposition logged as "answered"

#### Test Scenario 2: Voicemail Detection

- [ ] Call initiates successfully
- [ ] AMD detects voicemail
- [ ] Voicemail message plays
- [ ] Call logged as "voicemail"
- [ ] Retry scheduled (if policy allows)

#### Test Scenario 3: No Answer

- [ ] Call rings for 30s
- [ ] Logged as "no_answer"
- [ ] Retry scheduled

#### Test Scenario 4: Busy Signal

- [ ] Busy detected immediately
- [ ] Logged as "busy"
- [ ] Retry scheduled

#### Test Scenario 5: Failed Call

- [ ] Invalid number detected
- [ ] Logged as "failed"
- [ ] Not retried

#### Test Scenario 6: DNC List

- [ ] Upload CSV with DNC number
- [ ] Number blocked from calling
- [ ] Logged in errors

#### Test Scenario 7: Duplicate Detection

- [ ] Upload CSV with duplicate
- [ ] Only first instance imported
- [ ] Error logged for duplicate

#### Test Scenario 8: Campaign Start/Pause

- [ ] Campaign starts
- [ ] Leads queued
- [ ] Calls begin
- [ ] Campaign pauses
- [ ] Calls stop

#### Test Scenario 9: Agent Status

- [ ] Agent sets status to Available
- [ ] Receives calls
- [ ] Sets status to Break
- [ ] Stops receiving calls

#### Test Scenario 10: Multi-Tenant Isolation

- [ ] Create 2 tenants
- [ ] Upload leads to each
- [ ] Verify Tenant A can't see Tenant B's data

### Performance Testing

- [ ] API response time < 200ms (p95)
- [ ] Webhook processing < 100ms
- [ ] Database queries < 50ms
- [ ] No memory leaks after 1000 calls
- [ ] Concurrent calls: 10+ without issues

### Monitoring & Alerts

- [ ] Application logs visible
- [ ] Error tracking configured
- [ ] Uptime monitoring enabled
- [ ] Alert for high error rate
- [ ] Alert for database issues

---

## Troubleshooting

### Common Issues

**Issue:** Webhooks not receiving requests

**Solution:**
1. Verify WEBHOOK_BASE_URL is public
2. Check Twilio Console → Debugger for errors
3. Temporarily disable signature validation
4. Verify ngrok is running (local dev)

**Issue:** AMD accuracy low

**Solution:**
1. Use DetectMessageEnd (more accurate)
2. Increase timeout to 30s
3. Review AMD logs in Twilio Console
4. Test with known numbers

**Issue:** Agents not receiving calls

**Solution:**
1. Check agent status is "available"
2. Verify WebSocket connection in browser console
3. Check agent phone number is correct
4. Verify agent_group_id matches campaign

**Issue:** Database connection errors

**Solution:**
1. Verify DATABASE_URL is correct
2. Check connection pool size
3. Monitor active connections
4. Restart application

---

## Support & Maintenance

### Log Locations

- Application: stdout (captured by platform)
- Twilio: Console → Monitor → Logs → Debugger
- Database: Platform-specific

### Monitoring Commands

```bash
# Check app status
railway status

# View logs
railway logs

# Connect to database
railway run psql $DATABASE_URL

# Check Redis
railway run redis-cli -h $REDIS_HOST ping
```

### Backup & Restore

```bash
# Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore database
psql $DATABASE_URL < backup_20240115.sql
```

---

## Next Steps After Deployment

1. Configure Twilio webhooks in Console
2. Upload test CSV with 10 leads
3. Run QA checklist
4. Monitor first 100 calls
5. Set up alerts
6. Document any custom configuration
7. Train team on agent console
8. Create runbook for common issues
