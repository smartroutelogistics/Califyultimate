# System Architecture

## Overview

The Auto-Calling System is a multi-tenant, cloud-native application built for scalable outbound calling campaigns with intelligent call routing and agent management.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Dashboard  │  │ Agent Console│  │   Reports    │             │
│  │   (React)    │  │   (React +   │  │   (React)    │             │
│  │              │  │   Socket.io) │  │              │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         │                 │                  │                      │
│         └─────────────────┴──────────────────┘                      │
│                           │                                          │
└───────────────────────────┼──────────────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────────────┐
│                    APPLICATION LAYER                                 │
│                           │                                          │
│         ┌─────────────────▼────────────────────┐                    │
│         │      Express.js API Server            │                    │
│         │  ┌────────────────────────────────┐  │                    │
│         │  │  Authentication Middleware     │  │                    │
│         │  │  (JWT + Multi-tenant)          │  │                    │
│         │  └────────────────────────────────┘  │                    │
│         │                                       │                    │
│         │  ┌─────────┐ ┌─────────┐ ┌────────┐ │                    │
│         │  │Campaign │ │  Lead   │ │  Call  │ │                    │
│         │  │ Routes  │ │ Routes  │ │ Routes │ │                    │
│         │  └────┬────┘ └────┬────┘ └───┬────┘ │                    │
│         │       │           │           │      │                    │
│         │  ┌────▼───────────▼───────────▼───┐ │                    │
│         │  │     Business Logic Layer       │ │                    │
│         │  │  • CSV Processor               │ │                    │
│         │  │  • Twilio Service              │ │                    │
│         │  │  • Campaign Manager            │ │                    │
│         │  └────────────────────────────────┘ │                    │
│         └───────┬───────────────┬──────────────┘                    │
│                 │               │                                    │
│         ┌───────▼──────┐  ┌─────▼──────┐                           │
│         │  Socket.io   │  │   Bull     │                           │
│         │  WebSocket   │  │   Queue    │                           │
│         │   Server     │  │  (Redis)   │                           │
│         └──────────────┘  └────────────┘                           │
└──────────────┬──────────────────┬───────────────────────────────────┘
               │                  │
┌──────────────┼──────────────────┼───────────────────────────────────┐
│         DATA LAYER              │                                    │
│               │                 │                                    │
│      ┌────────▼────────┐   ┌────▼─────┐                            │
│      │   PostgreSQL    │   │  Redis   │                            │
│      │   • tenants     │   │  Cache   │                            │
│      │   • users       │   │  Queue   │                            │
│      │   • campaigns   │   └──────────┘                            │
│      │   • leads       │                                            │
│      │   • agents      │   ┌──────────┐                            │
│      │   • calls       │   │   AWS    │                            │
│      │   • dnc_list    │   │    S3    │                            │
│      └─────────────────┘   │ Storage  │                            │
│                             │(Recordings)                            │
│                             └──────────┘                            │
└─────────────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────────┐
│         EXTERNAL SERVICES     │                                       │
│                               │                                       │
│                      ┌────────▼────────┐                             │
│                      │  Twilio Voice   │                             │
│                      │      API        │                             │
│                      │  • Calls.create │                             │
│                      │  • AMD          │                             │
│                      │  • Conference   │                             │
│                      │  • Recording    │                             │
│                      └────┬───────┬────┘                             │
│                           │       │                                  │
│                  ┌────────▼───┐  │  ┌──────────▼──────┐             │
│                  │ Lead Phone │  │  │  Agent Phone    │             │
│                  └────────────┘  │  └─────────────────┘             │
│                                  │                                   │
│                        ┌─────────▼────────┐                          │
│                        │  Webhooks Back   │                          │
│                        │  to Application  │                          │
│                        └──────────────────┘                          │
└──────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Frontend (React SPA)

**Technology:**
- React 18 with Vite
- Tailwind CSS for styling
- Axios for HTTP requests
- Socket.io-client for real-time updates
- React Router for navigation

**Key Pages:**
- Dashboard - Overview statistics
- Campaigns - Campaign CRUD operations
- Lead Upload - CSV upload with field mapping
- Agent Console - Real-time call handling
- Reports - Call analytics and export

**State Management:**
- Context API for authentication
- Local component state
- WebSocket for real-time updates

### 2. Backend API (Node.js + Express)

**Technology:**
- Node.js 18+
- Express.js 4.x
- JWT for authentication
- Multer for file uploads
- Socket.io for WebSocket

**Architecture Patterns:**
- RESTful API design
- Middleware-based request processing
- Service layer for business logic
- Repository pattern for data access

**Key Services:**

#### CSV Processor Service
- Parses uploaded CSV files
- Validates phone numbers (E.164)
- Checks DNC list
- Deduplicates entries
- Bulk inserts leads

#### Twilio Service
- Initiates outbound calls
- Handles AMD results
- Manages warm-transfer via conference
- Generates TwiML responses
- Validates webhook signatures

#### Campaign Manager
- Schedules calls based on campaign settings
- Manages retry logic
- Respects calling hours
- Enforces rate limits

### 3. Database (PostgreSQL)

**Schema Design:**

```
Multi-Tenancy Model: Each table has tenant_id for data isolation

┌──────────┐     ┌──────────┐     ┌──────────┐
│ tenants  │────<│  users   │     │campaigns │
└──────────┘     └──────────┘     └────┬─────┘
                                       │
                 ┌──────────┐     ┌────▼─────┐
                 │  agents  │     │  leads   │
                 └────┬─────┘     └────┬─────┘
                      │                │
                 ┌────▼────────────────▼─────┐
                 │         calls             │
                 └───────────────────────────┘

     ┌──────────┐           ┌──────────┐
     │dnc_list  │           │call_queue│
     └──────────┘           └──────────┘
```

**Indexes:**
- tenant_id on all tables (multi-tenancy)
- phone_normalized for quick DNC lookup
- status fields for filtering
- created_at/updated_at for time-based queries

**Key Features:**
- JSONB fields for flexible custom data
- Triggers for updated_at timestamps
- Foreign key constraints for referential integrity
- UUID primary keys for security

### 4. Queue System (Bull + Redis)

**Purpose:**
- Schedule calls based on campaign settings
- Retry failed calls
- Distribute load across time windows
- Priority-based processing

**Queue Jobs:**
- `initiate-call` - Start outbound call
- `retry-call` - Retry failed/no-answer
- `campaign-scheduler` - Queue daily campaign calls

### 5. Real-time Communication (Socket.io)

**Events:**

**Client → Server:**
- `agent:join` - Agent connects
- `agent:status` - Status update

**Server → Client:**
- `incoming:call` - New call notification
- `call:ended` - Call completed
- `agent:status:updated` - Agent status changed

**Rooms:**
- `tenant:{id}` - Tenant-wide broadcasts
- `agent:{id}` - Agent-specific notifications

### 6. File Storage (AWS S3)

**Stored Content:**
- Call recordings
- Voicemail messages
- CSV uploads (temporary)

**Organization:**
```
bucket/
├── recordings/
│   ├── {tenant_id}/
│   │   ├── {campaign_id}/
│   │   │   └── {call_sid}.mp3
├── voicemails/
│   ├── {tenant_id}/
│   │   └── {message_id}.mp3
└── uploads/
    └── temp/
```

## Call Flow Architecture

### Warm Transfer Flow (Human Detected)

```
1. System → Twilio: calls.create()
   ├─ to: lead phone
   ├─ from: campaign caller ID
   ├─ machineDetection: DetectMessageEnd
   └─ url: /webhooks/twilio/answer

2. Twilio → Lead: Initiates call

3. Lead answers → Twilio AMD: Detects human

4. Twilio → System: POST /webhooks/twilio/answer
   └─ AnsweredBy: human

5. System → Twilio: Returns TwiML
   └─ <Dial><Conference>call_{id}</Conference></Dial>

6. Lead → Conference: Joins with hold music

7. System → Twilio: calls.create() for agent
   ├─ to: agent phone
   └─ url: /webhooks/twilio/agent-answer

8. Agent answers → Twilio → System: Agent answer webhook

9. System → Twilio: Returns TwiML with whisper
   └─ <Say>Connecting with {leadName}</Say>
   └─ <Gather>Press any key to accept</Gather>

10. Agent presses key → Twilio → System: Gather callback

11. System → Twilio: Returns TwiML
    └─ <Dial><Conference>call_{id}</Conference></Dial>

12. Agent → Conference: Joins conference

13. Lead + Agent: Connected in conference

14. Conference ends → Twilio → System: Status callback
    └─ Update database with duration, cost, etc.
```

### Machine Detection Flow

```
1. System → Twilio: calls.create() (same as above)

2. Twilio → Lead: Initiates call

3. Voicemail answers → Twilio AMD: Detects machine

4. Twilio → System: POST /webhooks/twilio/answer
   └─ AnsweredBy: machine_end_beep

5. System → Twilio: Returns TwiML
   └─ <Play>voicemail_message.mp3</Play>
   └─ <Record />
   └─ <Hangup />

6. Twilio: Plays message, records, hangs up

7. System: Schedules retry based on retry_policy
```

## Security Architecture

### Authentication & Authorization

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ POST /auth/login
     │ {email, password}
     ▼
┌────────────────┐
│  Auth Service  │
│  • bcrypt      │
│  • JWT sign    │
└────┬───────────┘
     │ Returns JWT
     ▼
┌────────────────┐
│    Client      │
│  Stores token  │
└────┬───────────┘
     │ All requests
     │ Authorization: Bearer {token}
     ▼
┌────────────────────┐
│ Auth Middleware    │
│ • Verify JWT       │
│ • Load user        │
│ • Check tenant     │
└────┬───────────────┘
     │ req.user = {id, role, tenant_id}
     ▼
┌────────────────────┐
│  Route Handler     │
│ • Check role       │
│ • Enforce tenancy  │
└────────────────────┘
```

### Multi-Tenancy

**Data Isolation:**
- All queries filter by `tenant_id`
- Middleware automatically adds `tenant_id` to writes
- Database-level row security (future enhancement)

**Tenant Verification:**
```javascript
// Automatic in middleware
req.body.tenant_id = req.user.tenant_id;

// Query always includes tenant
WHERE tenant_id = $1 AND id = $2
```

### Webhook Security

**Twilio Signature Validation:**
```javascript
1. Get X-Twilio-Signature header
2. Compute expected signature:
   - Concatenate URL + sorted params
   - HMAC-SHA1 with auth token
3. Compare signatures (constant-time)
4. Reject if mismatch
```

## Scalability Considerations

### Horizontal Scaling

**Stateless API:**
- No session state on server
- JWT tokens are self-contained
- Load balancer can distribute requests

**Database Connection Pooling:**
```javascript
Pool size: 20 connections
Idle timeout: 30s
Connection timeout: 2s
```

**Queue-based Call Processing:**
- Distribute calls across workers
- Scale workers independently
- Graceful degradation under load

### Vertical Scaling

**Database:**
- Read replicas for reports
- Partitioning by tenant_id
- Index optimization

**Caching Strategy:**
- Redis for session data
- Cache DNC list in memory
- Cache campaign settings

### Performance Targets

- API response time: < 200ms (p95)
- Webhook processing: < 100ms
- Call initiation: < 2s from trigger
- WebSocket latency: < 50ms
- Database queries: < 50ms (p95)

## Monitoring & Observability

### Logging

**Application Logs:**
- Request/response logging
- Error logging with stack traces
- Call flow events

**Format:** JSON structured logs
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "service": "api",
  "tenant_id": "uuid",
  "event": "call_initiated",
  "call_sid": "CA123",
  "metadata": {}
}
```

### Metrics

**Key Metrics:**
- Calls initiated per minute
- AMD accuracy rate
- Agent availability
- API error rate
- Database connection pool usage
- Queue depth

### Alerting

**Critical Alerts:**
- API error rate > 5%
- Twilio webhook failures
- Database connection pool exhausted
- Queue depth > 1000

## Disaster Recovery

### Backups

**Database:**
- Automated daily backups
- Point-in-time recovery (PITR)
- Retention: 30 days

**Recordings:**
- S3 versioning enabled
- Cross-region replication
- Lifecycle policies for archival

### Failover Strategy

1. **Database Failure:**
   - Automatic failover to replica
   - RTO: 5 minutes
   - RPO: 1 minute

2. **API Failure:**
   - Health check endpoint
   - Load balancer removes unhealthy instances
   - Auto-scaling triggers new instances

3. **Twilio Outage:**
   - Queue calls for retry
   - Alert operators
   - Switch to backup provider (manual)

## Technology Alternatives

### Considered Alternatives

**Voice Providers:**
- Telnyx: Lower per-minute cost, less AMD accuracy
- Plivo: Similar pricing, fewer features
- **Chosen: Twilio** - Best AMD, documentation, reliability

**Database:**
- MySQL: Good, but JSONB support limited
- MongoDB: Good for flexibility, but lacks ACID for billing
- **Chosen: PostgreSQL** - JSONB + ACID + proven scale

**Queue:**
- AWS SQS: Managed, but higher latency
- RabbitMQ: More features, harder to manage
- **Chosen: Bull + Redis** - Simple, fast, battle-tested

**Frontend:**
- Vue.js: Similar to React
- Angular: More opinionated, heavier
- **Chosen: React** - Largest ecosystem, hiring pool

## Future Enhancements

1. **AI-powered AMD:** Custom ML model for better accuracy
2. **Predictive Dialing:** Call multiple leads per agent
3. **Multi-channel:** SMS, Email integration
4. **Advanced Analytics:** ML-based insights
5. **Mobile App:** Native iOS/Android for agents
6. **Voice AI:** Text-to-speech for dynamic messages
7. **CRM Integration:** Salesforce, HubSpot connectors
