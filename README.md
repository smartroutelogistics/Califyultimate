# Auto-Calling System with Human Transfer

A production-ready multi-tenant outbound calling platform built with Node.js, Express, React, and Twilio. Features automated machine detection (AMD), warm-transfer capabilities, and comprehensive campaign management.

## Features

- **Multi-Tenant Architecture**: Complete isolation between different broker/carrier partners
- **CSV Lead Upload**: Bulk import leads with automatic validation and DNC checking
- **Automated Machine Detection (AMD)**: Detect human vs. voicemail with Twilio's AMD
- **Warm Transfer**: Conference-based transfer allowing agents to screen calls before connection
- **Agent Console**: Real-time interface for agents to manage incoming calls
- **Campaign Management**: Schedule, start, pause campaigns with retry policies
- **Reporting**: Comprehensive call analytics and export capabilities
- **Real-time Updates**: WebSocket-based notifications for agents

## Technology Stack

### Backend
- **Node.js** 18+ with Express.js
- **PostgreSQL** 14+ for data storage
- **Twilio** Programmable Voice API
- **Socket.io** for real-time communication
- **Bull** + Redis for call queue management

### Frontend
- **React** 18 with Vite
- **Tailwind CSS** for styling
- **Axios** for API calls
- **Socket.io-client** for WebSocket

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   React     │◄────►│   Express    │◄────►│  PostgreSQL │
│  Frontend   │      │   Backend    │      │  Database   │
└─────────────┘      └──────┬───────┘      └─────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Twilio     │
                     │   Voice API  │
                     └──────────────┘
                            │
                   ┌────────┴────────┐
                   ▼                 ▼
              ┌────────┐        ┌────────┐
              │  Lead  │        │ Agent  │
              │  Phone │        │  Phone │
              └────────┘        └────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Twilio account with Voice API enabled
- Redis (for Bull queue)
- ngrok (for local webhook testing)

### 1. Backend Setup

```bash
# Navigate to project root
cd auto-calling-system

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials
# Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_NUMBER, DATABASE_URL

# Create database
createdb autocall_db

# Run database migrations
psql -d autocall_db -f src/database/schema.sql

# Start development server
npm run dev
```

The backend API will be available at `http://localhost:3000`

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 3. Webhook Setup (Local Testing)

```bash
# Start ngrok tunnel
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Update .env:
WEBHOOK_BASE_URL=https://abc123.ngrok.io
```

## Database Schema

### Core Tables

1. **tenants** - Organizations/Partners
2. **users** - User accounts with role-based access
3. **campaigns** - Calling campaigns with configuration
4. **leads** - Contact information and status
5. **agents** - Agent profiles and availability
6. **calls** - Call history and dispositions
7. **dnc_list** - Do Not Call registry
8. **call_queue** - Scheduled calls queue

See [src/database/schema.sql](src/database/schema.sql) for complete schema.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `PUT /api/campaigns/:id` - Update campaign
- `POST /api/campaigns/:id/start` - Start campaign
- `POST /api/campaigns/:id/pause` - Pause campaign

### Leads
- `GET /api/leads` - List leads for campaign
- `POST /api/leads/upload` - Upload CSV file
- `GET /api/leads/template/csv` - Download CSV template
- `PUT /api/leads/:id` - Update lead

### Calls
- `GET /api/calls` - List calls with filters
- `GET /api/calls/:id` - Get call details
- `GET /api/calls/stats/summary` - Get statistics

### Agents
- `GET /api/agents` - List agents
- `POST /api/agents` - Create agent
- `PUT /api/agents/:id/status` - Update agent status

### Webhooks (Twilio)
- `POST /webhooks/twilio/answer` - Call answered
- `POST /webhooks/twilio/amd` - AMD result
- `POST /webhooks/twilio/status` - Call status update
- `POST /webhooks/twilio/agent-answer` - Agent phone answered
- `POST /webhooks/twilio/conference-status` - Conference events

## Call Flow

### Human Detected (Warm Transfer)

1. System initiates outbound call to lead
2. Twilio AMD detects human answer
3. Lead is placed in conference with hold music
4. System calls available agent
5. Agent hears whisper: "Connecting you with [Lead Name]"
6. Agent presses any key to accept
7. Agent joins conference with lead
8. Both parties can now communicate

### Machine Detected

1. System initiates outbound call to lead
2. Twilio AMD detects voicemail
3. System plays pre-recorded message
4. Call is logged as "voicemail"
5. Lead is scheduled for retry based on campaign policy

## CSV Lead Upload

### Template Format

```csv
first_name,last_name,phone,country,type,priority,do_not_call,notes
John,Doe,+14155552671,US,broker,high,false,"VIP customer"
```

### Field Definitions

- **first_name**: Lead's first name (optional)
- **last_name**: Lead's last name (optional)
- **phone**: Phone number (required, E.164 format preferred)
- **country**: ISO country code for phone normalization (optional, default: US)
- **type**: Lead type (broker, carrier, etc.)
- **priority**: low | normal | high | urgent
- **do_not_call**: true | false
- **notes**: Additional notes

### Validation Rules

- Phone number is required
- Phone numbers normalized to E.164 format
- DNC list checked automatically
- Duplicate phone numbers within campaign are rejected
- Invalid phone formats are rejected

## Deployment

### Railway (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
railway add postgresql

# Add Redis
railway add redis

# Set environment variables
railway variables set TWILIO_ACCOUNT_SID=ACxxx...
railway variables set TWILIO_AUTH_TOKEN=xxx...
railway variables set TWILIO_NUMBER=+1xxx...

# Deploy
railway up
```

### Render

1. Create new Web Service
2. Connect GitHub repository
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables
6. Add PostgreSQL database
7. Deploy

### Environment Variables

See [.env.example](.env.example) for all required variables.

## Testing

### Local Testing with ngrok

1. Start ngrok: `ngrok http 3000`
2. Update `WEBHOOK_BASE_URL` in `.env`
3. Configure Twilio webhook URLs in Twilio Console
4. Upload test CSV with 5-10 numbers
5. Start campaign
6. Monitor logs for call flow

### Test Numbers

Twilio provides test numbers for development:

- **Human answer**: +15005550006
- **Voicemail**: Configure your own voicemail box for testing
- **No answer**: Let call ring without answering
- **Busy**: +15005550001

## Cost Estimates

Based on Twilio pricing (as of 2024):

### Small Scale (3,000 calls/month, 2 min avg)

- Voice minutes: 6,000 min × $0.0140 = $84.00
- Phone number: $1.00/month
- **Total: ~$85-100/month**

### Medium Scale (30,000 calls/month)

- Voice minutes: 60,000 min × $0.0140 = $840.00
- Phone numbers: 5 × $1.00 = $5.00
- **Total: ~$850-900/month**

### Large Scale (300,000 calls/month)

- Voice minutes: 600,000 min × $0.0125 = $7,500.00 (volume discount)
- Phone numbers: 20 × $1.00 = $20.00
- **Total: ~$7,500-8,000/month**

### Cost Optimization Tips

1. **Retry Policy**: Avoid repeated voicemail attempts
2. **Recording Toggles**: Only record when necessary
3. **Regional Numbers**: Use local numbers to reduce per-minute costs
4. **Batching**: Spread calls during off-peak hours
5. **AMD Timeout**: Optimize AMD timeout to reduce wasted minutes

## Security & Compliance

### Implemented Security Measures

- JWT-based authentication
- Twilio webhook signature validation
- Multi-tenant data isolation
- HTTPS enforcement for webhooks
- DNC list checking
- PII encryption at rest (configure in schema)

### Compliance Considerations

- **TCPA**: Ensure consent before calling
- **DNC**: Automatic checking against DNC list
- **Recording Consent**: Configurable per campaign
- **Data Retention**: Configure retention policies
- **GDPR**: Data export and deletion capabilities

## Troubleshooting

### Webhook Not Receiving Calls

1. Verify `WEBHOOK_BASE_URL` is publicly accessible
2. Check Twilio signature validation is not blocking
3. Enable `SKIP_TWILIO_VALIDATION=true` for local testing
4. Check firewall/proxy settings

### AMD Accuracy Issues

1. Increase AMD timeout (default: 30s)
2. Use `DetectMessageEnd` for better accuracy
3. Test with known human/voicemail numbers
4. Review AMD results in call logs

### Agent Not Receiving Calls

1. Verify agent status is "available"
2. Check agent phone number is correct
3. Verify agent is in correct agent_group
4. Check WebSocket connection in browser console

## Development

### Running Tests

```bash
npm test
```

### Database Migrations

```bash
# Run migrations
psql -d autocall_db -f src/database/schema.sql

# Backup database
pg_dump autocall_db > backup.sql
```

### Code Structure

```
├── src/
│   ├── config/          # Configuration files
│   ├── database/        # Database schema and migrations
│   ├── middleware/      # Express middleware
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic
│   └── server.js        # Express app entry point
├── frontend/
│   └── src/
│       ├── components/  # React components
│       ├── context/     # React context providers
│       ├── pages/       # Page components
│       └── App.jsx      # Main app component
└── sample_leads.csv     # Sample CSV template
```

## Support

For issues and questions:
- Check existing documentation
- Review Twilio logs in Twilio Console
- Check application logs
- Verify environment variables

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Twilio Programmable Voice API
- Express.js framework
- React and Vite
- PostgreSQL database
