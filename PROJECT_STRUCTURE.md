# Project Structure

Complete file organization for the Auto-Calling System.

```
auto-calling-system/
│
├── 📄 README.md                    # Main documentation
├── 📄 QUICKSTART.md                # 10-minute setup guide
├── 📄 PROJECT_STRUCTURE.md         # This file
├── 📄 .env.example                 # Environment variables template
├── 📄 .gitignore                   # Git ignore rules
├── 📄 package.json                 # Backend dependencies
├── 📄 sample_leads.csv             # Sample CSV template
│
├── 📁 src/                         # Backend source code
│   │
│   ├── 📄 server.js                # Express app entry point
│   │
│   ├── 📁 config/                  # Configuration files
│   │   └── 📄 database.js          # PostgreSQL connection pool
│   │
│   ├── 📁 database/                # Database schemas & migrations
│   │   ├── 📄 schema.sql           # Full database schema
│   │   └── 📄 migrate.js           # Migration script
│   │
│   ├── 📁 middleware/              # Express middleware
│   │   └── 📄 auth.js              # JWT auth & validation
│   │
│   ├── 📁 services/                # Business logic
│   │   ├── 📄 csvProcessor.js      # CSV upload & validation
│   │   └── 📄 twilioService.js     # Twilio integration
│   │
│   └── 📁 routes/                  # API route handlers
│       ├── 📄 auth.js              # /api/auth/* endpoints
│       ├── 📄 campaigns.js         # /api/campaigns/* endpoints
│       ├── 📄 leads.js             # /api/leads/* endpoints
│       ├── 📄 calls.js             # /api/calls/* endpoints
│       ├── 📄 agents.js            # /api/agents/* endpoints
│       └── 📄 webhooks.js          # /webhooks/twilio/* endpoints
│
├── 📁 frontend/                    # React frontend application
│   │
│   ├── 📄 package.json             # Frontend dependencies
│   ├── 📄 vite.config.js           # Vite configuration
│   ├── 📄 tailwind.config.js       # Tailwind CSS config
│   ├── 📄 index.html               # HTML entry point
│   ├── 📄 .env.example             # Frontend environment vars
│   │
│   └── 📁 src/
│       │
│       ├── 📄 main.jsx             # React entry point
│       ├── 📄 App.jsx              # Main app component
│       ├── 📄 index.css            # Global styles
│       │
│       ├── 📁 components/          # Reusable components
│       │   └── 📄 Layout.jsx       # App layout wrapper
│       │
│       ├── 📁 context/             # React context providers
│       │   └── 📄 AuthContext.jsx  # Authentication context
│       │
│       └── 📁 pages/               # Page components
│           ├── 📄 Login.jsx        # Login page
│           ├── 📄 Dashboard.jsx    # Dashboard/home
│           ├── 📄 Campaigns.jsx    # Campaign management
│           ├── 📄 LeadUpload.jsx   # CSV upload
│           ├── 📄 AgentConsole.jsx # Agent interface
│           └── 📄 Reports.jsx      # Call reports
│
└── 📁 docs/                        # Documentation
    ├── 📄 API_SPECIFICATION.md     # Complete API docs
    ├── 📄 ARCHITECTURE.md          # System architecture
    ├── 📄 DEPLOYMENT.md            # Deployment guide
    └── 📄 COSTS_AND_SCALE.md       # Cost analysis
```

## File Descriptions

### Root Level

| File | Purpose |
|------|---------|
| `README.md` | Main documentation, features, quick start |
| `QUICKSTART.md` | 10-minute setup guide for new developers |
| `PROJECT_STRUCTURE.md` | This file - project organization |
| `.env.example` | Template for environment variables |
| `.gitignore` | Files/folders to exclude from Git |
| `package.json` | Backend Node.js dependencies and scripts |
| `sample_leads.csv` | Example CSV with correct format |

### Backend (`src/`)

#### Core Files

- **`server.js`**: Express app initialization, middleware setup, route registration, WebSocket configuration

#### Config (`src/config/`)

- **`database.js`**: PostgreSQL connection pool with error handling and reconnection logic

#### Database (`src/database/`)

- **`schema.sql`**: Complete database schema with tables, indexes, triggers, sample data
- **`migrate.js`**: Automated migration script to set up database

#### Middleware (`src/middleware/`)

- **`auth.js`**:
  - JWT token verification
  - Role-based access control
  - Multi-tenant enforcement
  - Twilio webhook signature validation

#### Services (`src/services/`)

- **`csvProcessor.js`**:
  - CSV parsing and validation
  - Phone number normalization (E.164)
  - DNC list checking
  - Deduplication
  - Bulk database insertion

- **`twilioService.js`**:
  - Outbound call initiation
  - AMD handling
  - Warm-transfer conference flow
  - TwiML generation
  - Retry scheduling

#### Routes (`src/routes/`)

- **`auth.js`**: Registration, login, JWT token generation
- **`campaigns.js`**: CRUD operations for campaigns, start/pause actions
- **`leads.js`**: CSV upload, lead management, template download
- **`calls.js`**: Call history, statistics, filtering
- **`agents.js`**: Agent CRUD, status management, statistics
- **`webhooks.js`**: Twilio callback handlers for call events

### Frontend (`frontend/`)

#### Core Files

- **`index.html`**: HTML entry point with root div
- **`main.jsx`**: React initialization with routing
- **`App.jsx`**: Main app component with route definitions
- **`vite.config.js`**: Vite build configuration
- **`tailwind.config.js`**: Tailwind CSS configuration

#### Components (`frontend/src/components/`)

- **`Layout.jsx`**: App shell with navigation and footer

#### Context (`frontend/src/context/`)

- **`AuthContext.jsx`**: Global authentication state management

#### Pages (`frontend/src/pages/`)

- **`Login.jsx`**: Login form with authentication
- **`Dashboard.jsx`**: Overview statistics and charts
- **`Campaigns.jsx`**: Campaign list and management
- **`LeadUpload.jsx`**: CSV upload with field mapping
- **`AgentConsole.jsx`**: Real-time agent interface with WebSocket
- **`Reports.jsx`**: Call reports with filters and export

### Documentation (`docs/`)

- **`API_SPECIFICATION.md`**: Complete REST API documentation with examples
- **`ARCHITECTURE.md`**: System architecture, components, call flows
- **`DEPLOYMENT.md`**: Step-by-step deployment and testing guide
- **`COSTS_AND_SCALE.md`**: Cost analysis and scaling recommendations

## Key Dependencies

### Backend

```json
{
  "express": "^4.18.2",         // Web framework
  "twilio": "^4.20.0",          // Twilio SDK
  "pg": "^8.11.3",              // PostgreSQL driver
  "dotenv": "^16.3.1",          // Environment variables
  "jsonwebtoken": "^9.0.2",     // JWT authentication
  "bcryptjs": "^2.4.3",         // Password hashing
  "socket.io": "^4.6.2",        // WebSocket server
  "bull": "^4.12.0",            // Queue management
  "csv-parse": "^5.5.3",        // CSV parsing
  "multer": "^1.4.5-lts.1",     // File uploads
  "libphonenumber-js": "^1.10.51" // Phone validation
}
```

### Frontend

```json
{
  "react": "^18.2.0",           // UI framework
  "react-router-dom": "^6.20.0", // Routing
  "axios": "^1.6.2",            // HTTP client
  "socket.io-client": "^4.6.2", // WebSocket client
  "recharts": "^2.10.3",        // Charts
  "tailwindcss": "^3.3.6"       // CSS framework
}
```

## Environment Variables

### Backend (`.env`)

```env
# Twilio
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_NUMBER=+1xxx

# Server
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000

# Database
DATABASE_URL=postgres://user:pass@host:5432/dbname

# AWS S3
S3_BUCKET=my-recordings
S3_ACCESS_KEY=AKIA...
S3_SECRET=xxx
S3_REGION=us-east-1

# Auth
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Webhooks
WEBHOOK_BASE_URL=https://your-domain.com
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000
```

## Database Tables

1. **tenants** - Multi-tenant organizations
2. **users** - User accounts with roles
3. **campaigns** - Calling campaigns
4. **leads** - Contact leads
5. **agents** - Agent profiles
6. **calls** - Call history and logs
7. **dnc_list** - Do Not Call registry
8. **agent_groups** - Agent team groupings
9. **call_queue** - Call scheduling queue

## API Endpoints Summary

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/register` | User registration |
| `POST /api/auth/login` | User login |
| `GET /api/campaigns` | List campaigns |
| `POST /api/campaigns` | Create campaign |
| `POST /api/leads/upload` | Upload CSV |
| `GET /api/leads` | List leads |
| `GET /api/calls` | List calls |
| `GET /api/agents` | List agents |
| `POST /webhooks/twilio/answer` | Call answered |
| `POST /webhooks/twilio/status` | Call status update |

Full API documentation: [docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md)

## Development Workflow

```bash
# 1. Start services
brew services start postgresql
brew services start redis
ngrok http 3000  # New terminal

# 2. Start backend
npm run dev  # Terminal 1

# 3. Start frontend
cd frontend && npm run dev  # Terminal 2

# 4. Access application
# Frontend: http://localhost:5173
# Backend: http://localhost:3000
# API Docs: See docs/API_SPECIFICATION.md
```

## Build & Deploy

```bash
# Backend (Railway)
railway up

# Frontend (Vercel)
cd frontend
npm run build
vercel --prod

# Or deploy both to same platform
# See docs/DEPLOYMENT.md for full guide
```

## Testing

```bash
# Unit tests
npm test

# Manual testing
# 1. Upload sample_leads.csv
# 2. Create campaign
# 3. Start campaign
# 4. Monitor call flow in logs

# See docs/DEPLOYMENT.md for QA checklist
```

## Monitoring

- Application logs: `railway logs` or platform-specific
- Twilio logs: Console → Monitor → Debugger
- Database: Platform monitoring dashboards
- WebSocket: Browser dev console

## Next Steps

1. Read [QUICKSTART.md](QUICKSTART.md) for setup
2. Review [docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md) for API details
3. Check [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design
4. Follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment
5. Review [docs/COSTS_AND_SCALE.md](docs/COSTS_AND_SCALE.md) for cost planning
