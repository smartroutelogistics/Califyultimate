# API Specification

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

## Authentication

All API endpoints (except `/auth/*`) require JWT authentication.

### Header Format

```
Authorization: Bearer <jwt_token>
```

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message description"
}
```

---

## Authentication Endpoints

### Register User

```http
POST /api/auth/register
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+14155551234",
  "role": "agent",
  "tenant_id": "uuid"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "agent",
    "tenant_id": "uuid",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### Login

```http
POST /api/auth/login
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** Same as Register

---

## Campaign Endpoints

### List Campaigns

```http
GET /api/campaigns?status=active&limit=50&offset=0
```

**Query Parameters:**
- `status` (optional): draft | scheduled | active | paused | completed | cancelled
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**

```json
{
  "success": true,
  "campaigns": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "name": "Q1 2024 Outreach",
      "caller_id": "+14155551234",
      "status": "active",
      "schedule_start": "2024-01-01T09:00:00Z",
      "schedule_end": "2024-03-31T17:00:00Z",
      "timezone": "America/Los_Angeles",
      "calling_hours_start": "09:00:00",
      "calling_hours_end": "17:00:00",
      "agent_group_id": "uuid",
      "retry_policy": {
        "max_attempts": 3,
        "delay_minutes": 60,
        "retry_on_no_answer": true,
        "retry_on_busy": true,
        "retry_on_voicemail": false
      },
      "amd_enabled": true,
      "voicemail_message_url": "https://example.com/voicemail.mp3",
      "record_calls": true,
      "total_leads": 1500,
      "calls_made": 850,
      "calls_completed": 320,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T12:00:00Z"
    }
  ],
  "count": 1
}
```

### Get Campaign

```http
GET /api/campaigns/:id
```

**Response:**

```json
{
  "success": true,
  "campaign": { ... }
}
```

### Create Campaign

```http
POST /api/campaigns
```

**Request Body:**

```json
{
  "name": "Q1 2024 Outreach",
  "caller_id": "+14155551234",
  "schedule_start": "2024-01-01T09:00:00Z",
  "schedule_end": "2024-03-31T17:00:00Z",
  "timezone": "America/Los_Angeles",
  "calling_hours_start": "09:00:00",
  "calling_hours_end": "17:00:00",
  "agent_group_id": "uuid",
  "retry_policy": {
    "max_attempts": 3,
    "delay_minutes": 60,
    "retry_on_no_answer": true,
    "retry_on_busy": true,
    "retry_on_voicemail": false
  },
  "amd_enabled": true,
  "voicemail_message_url": "https://example.com/voicemail.mp3",
  "record_calls": true
}
```

**Response:**

```json
{
  "success": true,
  "campaign": { ... }
}
```

### Update Campaign

```http
PUT /api/campaigns/:id
```

**Request Body:** Same fields as Create (all optional)

### Start Campaign

```http
POST /api/campaigns/:id/start
```

**Response:**

```json
{
  "success": true,
  "message": "Campaign started successfully",
  "campaign": { ... }
}
```

### Pause Campaign

```http
POST /api/campaigns/:id/pause
```

---

## Lead Endpoints

### List Leads

```http
GET /api/leads?campaign_id=uuid&status=pending&limit=50&offset=0
```

**Query Parameters:**
- `campaign_id` (required): Campaign UUID
- `status` (optional): pending | queued | calling | completed | failed | dnc
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**

```json
{
  "success": true,
  "leads": [
    {
      "id": "uuid",
      "campaign_id": "uuid",
      "tenant_id": "uuid",
      "phone": "+14155552671",
      "phone_normalized": "+14155552671",
      "first_name": "Sara",
      "last_name": "Ahmed",
      "email": "sara@example.com",
      "country": "US",
      "type": "carrier",
      "priority": "normal",
      "custom_fields": {
        "company": "ABC Corp"
      },
      "notes": "VIP customer",
      "status": "pending",
      "call_attempts": 0,
      "last_call_at": null,
      "next_call_at": null,
      "do_not_call": false,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1,
  "total": 1500
}
```

### Upload CSV

```http
POST /api/leads/upload
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: CSV file
- `campaign_id`: Campaign UUID
- `field_mapping` (optional): JSON object mapping CSV columns to database fields

**Example field_mapping:**

```json
{
  "First Name": "first_name",
  "Last Name": "last_name",
  "Phone Number": "phone",
  "Country Code": "country"
}
```

**Response:**

```json
{
  "success": true,
  "message": "CSV processed successfully",
  "results": {
    "total": 100,
    "valid": 95,
    "invalid": 2,
    "duplicates": 2,
    "dnc": 1,
    "inserted": 95
  },
  "errors": [
    {
      "row": 15,
      "field": "phone",
      "value": "invalid",
      "error": "Invalid phone number format"
    }
  ]
}
```

### Download CSV Template

```http
GET /api/leads/template/csv
```

Returns CSV file with headers.

### Update Lead

```http
PUT /api/leads/:id
```

**Request Body:**

```json
{
  "first_name": "Updated",
  "last_name": "Name",
  "priority": "high",
  "notes": "Updated notes"
}
```

---

## Call Endpoints

### List Calls

```http
GET /api/calls?campaign_id=uuid&disposition=answered&date_from=2024-01-01&limit=50
```

**Query Parameters:**
- `campaign_id` (optional): Filter by campaign
- `agent_id` (optional): Filter by agent
- `disposition` (optional): answered | voicemail | no_answer | busy | failed
- `answered_by` (optional): human | machine_start | machine_end_beep
- `date_from` (optional): ISO date
- `date_to` (optional): ISO date
- `limit` (optional): Default 50
- `offset` (optional): Default 0

**Response:**

```json
{
  "success": true,
  "calls": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "campaign_id": "uuid",
      "lead_id": "uuid",
      "agent_id": "uuid",
      "call_sid": "CA1234567890abcdef",
      "conference_sid": "CF1234567890abcdef",
      "from_number": "+14155551234",
      "to_number": "+14155552671",
      "direction": "outbound",
      "status": "completed",
      "answered_by": "human",
      "start_time": "2024-01-15T10:30:00Z",
      "answer_time": "2024-01-15T10:30:15Z",
      "end_time": "2024-01-15T10:35:30Z",
      "duration": 330,
      "talk_time": 315,
      "disposition": "answered",
      "recording_url": "https://api.twilio.com/recordings/RE123",
      "recording_sid": "RE1234567890abcdef",
      "recording_duration": 315,
      "cost": 0.077,
      "metadata": {},
      "notes": null,
      "created_at": "2024-01-15T10:30:00Z",
      "first_name": "Sara",
      "last_name": "Ahmed",
      "phone": "+14155552671",
      "campaign_name": "Q1 2024 Outreach",
      "agent_name": "John Doe"
    }
  ],
  "count": 1
}
```

### Get Call Details

```http
GET /api/calls/:id
```

### Get Call Statistics

```http
GET /api/calls/stats/summary?campaign_id=uuid&date_from=2024-01-01&date_to=2024-01-31
```

**Response:**

```json
{
  "success": true,
  "stats": {
    "total_calls": 1000,
    "answered_calls": 450,
    "voicemail_calls": 300,
    "no_answer_calls": 150,
    "busy_calls": 75,
    "failed_calls": 25,
    "human_answered": 450,
    "machine_answered": 300,
    "avg_duration": 185.5,
    "avg_talk_time": 165.2,
    "total_cost": 140.50
  }
}
```

### Get Disposition Breakdown

```http
GET /api/calls/stats/by-disposition?campaign_id=uuid
```

**Response:**

```json
{
  "success": true,
  "dispositions": [
    { "disposition": "answered", "count": 450 },
    { "disposition": "voicemail", "count": 300 },
    { "disposition": "no_answer", "count": 150 }
  ]
}
```

---

## Agent Endpoints

### List Agents

```http
GET /api/agents?status=available&agent_group_id=uuid
```

**Query Parameters:**
- `status` (optional): available | busy | offline | break
- `agent_group_id` (optional): Filter by agent group

**Response:**

```json
{
  "success": true,
  "agents": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "user_id": "uuid",
      "name": "John Doe",
      "phone": "+14155553333",
      "email": "john@example.com",
      "agent_group_id": "uuid",
      "status": "available",
      "max_concurrent_calls": 2,
      "current_calls": 0,
      "total_calls_handled": 156,
      "total_call_duration_seconds": 23400,
      "working_hours": {
        "monday": { "start": "09:00", "end": "17:00" },
        "tuesday": { "start": "09:00", "end": "17:00" }
      },
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "last_active_at": "2024-01-15T15:30:00Z"
    }
  ],
  "count": 1
}
```

### Create Agent

```http
POST /api/agents
```

**Request Body:**

```json
{
  "name": "John Doe",
  "phone": "+14155553333",
  "email": "john@example.com",
  "agent_group_id": "uuid",
  "max_concurrent_calls": 2,
  "working_hours": {
    "monday": { "start": "09:00", "end": "17:00" }
  }
}
```

### Update Agent Status

```http
PUT /api/agents/:id/status
```

**Request Body:**

```json
{
  "status": "available"
}
```

Valid statuses: `available`, `busy`, `offline`, `break`

### Get Agent Statistics

```http
GET /api/agents/:id/stats?date_from=2024-01-01&date_to=2024-01-31
```

**Response:**

```json
{
  "success": true,
  "agent": { ... },
  "stats": {
    "total_calls": 156,
    "answered_calls": 142,
    "avg_talk_time": 150.5,
    "total_talk_time": 23400
  }
}
```

---

## Webhook Endpoints

These endpoints are called by Twilio and require Twilio signature validation.

### Call Answered (TwiML Response)

```http
POST /webhooks/twilio/answer?leadId=uuid&callId=uuid
```

**Twilio Request Body:**

```
AnsweredBy=human
CallSid=CA1234567890abcdef
CallStatus=in-progress
Direction=outbound-api
From=+14155551234
To=+14155552671
```

**Response:** TwiML XML

### AMD Result

```http
POST /webhooks/twilio/amd?callId=uuid
```

**Twilio Request Body:**

```
AnsweredBy=machine_end_beep
CallSid=CA1234567890abcdef
```

### Call Status Update

```http
POST /webhooks/twilio/status?callId=uuid
```

**Twilio Request Body:**

```
CallSid=CA1234567890abcdef
CallStatus=completed
CallDuration=330
Direction=outbound-api
```

### Agent Answer

```http
POST /webhooks/twilio/agent-answer?conferenceName=call_uuid&leadName=John Doe&callId=uuid
```

**Response:** TwiML XML with whisper

### Conference Status

```http
POST /webhooks/twilio/conference-status?callId=uuid
```

**Twilio Request Body:**

```
ConferenceSid=CF1234567890abcdef
FriendlyName=call_uuid
StatusCallbackEvent=participant-join
Timestamp=2024-01-15T10:30:00Z
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400  | Bad Request - Invalid parameters |
| 401  | Unauthorized - Missing or invalid token |
| 403  | Forbidden - Insufficient permissions |
| 404  | Not Found - Resource doesn't exist |
| 409  | Conflict - Resource already exists |
| 500  | Internal Server Error |

## Rate Limiting

- API endpoints: 100 requests/minute per user
- Webhook endpoints: No rate limiting (Twilio controlled)

## Pagination

List endpoints support pagination:
- `limit`: Number of results per page (max: 100, default: 50)
- `offset`: Number of results to skip

## Filtering

Most list endpoints support filtering via query parameters. Multiple filters can be combined.

## WebSocket Events

### Client → Server

- `agent:join` - Join agent room
  ```json
  { "agentId": "uuid", "tenantId": "uuid" }
  ```

- `agent:status` - Update status
  ```json
  { "agentId": "uuid", "status": "available" }
  ```

### Server → Client

- `incoming:call` - New call for agent
  ```json
  {
    "callId": "uuid",
    "leadId": "uuid",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+14155552671",
    "notes": "VIP customer"
  }
  ```

- `call:ended` - Call ended
- `agent:status:updated` - Agent status changed
