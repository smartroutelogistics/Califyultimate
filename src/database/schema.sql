-- Multi-Tenant Auto-Calling System Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE (Multi-tenant user management)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'agent', 'tenant_admin')),
    tenant_id UUID NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- 2. TENANTS TABLE (Organizations/Partners)
-- ============================================
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. CAMPAIGNS TABLE
-- ============================================
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    caller_id VARCHAR(20) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled')),

    -- Scheduling
    schedule_start TIMESTAMP,
    schedule_end TIMESTAMP,
    timezone VARCHAR(50) DEFAULT 'UTC',
    calling_hours_start TIME DEFAULT '09:00:00',
    calling_hours_end TIME DEFAULT '17:00:00',

    -- Agent assignment
    agent_group_id UUID,

    -- Retry policy (JSONB for flexibility)
    retry_policy JSONB DEFAULT '{
        "max_attempts": 3,
        "delay_minutes": 60,
        "retry_on_no_answer": true,
        "retry_on_busy": true,
        "retry_on_voicemail": false
    }'::jsonb,

    -- AMD settings
    amd_enabled BOOLEAN DEFAULT true,
    voicemail_message_url VARCHAR(500),

    -- Recording settings
    record_calls BOOLEAN DEFAULT true,

    -- Statistics
    total_leads INTEGER DEFAULT 0,
    calls_made INTEGER DEFAULT 0,
    calls_completed INTEGER DEFAULT 0,

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_campaigns_tenant ON campaigns(tenant_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- ============================================
-- 4. LEADS TABLE
-- ============================================
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Contact information
    phone VARCHAR(20) NOT NULL,
    phone_normalized VARCHAR(20), -- E.164 format
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),

    -- Metadata
    country VARCHAR(2), -- ISO country code
    type VARCHAR(50), -- broker, carrier, etc.
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- Custom fields (flexible JSONB)
    custom_fields JSONB DEFAULT '{}'::jsonb,
    notes TEXT,

    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'calling', 'completed', 'failed', 'dnc')),
    call_attempts INTEGER DEFAULT 0,
    last_call_at TIMESTAMP,
    next_call_at TIMESTAMP,

    -- DNC flag
    do_not_call BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leads_campaign ON leads(campaign_id);
CREATE INDEX idx_leads_tenant ON leads(tenant_id);
CREATE INDEX idx_leads_phone ON leads(phone_normalized);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_next_call ON leads(next_call_at) WHERE status = 'queued';

-- ============================================
-- 5. AGENTS TABLE
-- ============================================
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Agent information
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),

    -- Agent groups for campaign assignment
    agent_group_id UUID,

    -- Availability
    status VARCHAR(50) DEFAULT 'offline' CHECK (status IN ('available', 'busy', 'offline', 'break')),
    max_concurrent_calls INTEGER DEFAULT 1,
    current_calls INTEGER DEFAULT 0,

    -- Statistics
    total_calls_handled INTEGER DEFAULT 0,
    total_call_duration_seconds INTEGER DEFAULT 0,

    -- Working hours (JSONB for flexibility)
    working_hours JSONB DEFAULT '{
        "monday": {"start": "09:00", "end": "17:00"},
        "tuesday": {"start": "09:00", "end": "17:00"},
        "wednesday": {"start": "09:00", "end": "17:00"},
        "thursday": {"start": "09:00", "end": "17:00"},
        "friday": {"start": "09:00", "end": "17:00"}
    }'::jsonb,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP
);

CREATE INDEX idx_agents_tenant ON agents(tenant_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_group ON agents(agent_group_id);

-- ============================================
-- 6. CALLS TABLE (Call history and dispositions)
-- ============================================
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,

    -- Twilio identifiers
    call_sid VARCHAR(100) UNIQUE,
    conference_sid VARCHAR(100),
    parent_call_sid VARCHAR(100),

    -- Call details
    from_number VARCHAR(20),
    to_number VARCHAR(20),
    direction VARCHAR(20) DEFAULT 'outbound',

    -- Call status and timing
    status VARCHAR(50), -- queued, ringing, in-progress, completed, busy, no-answer, failed, cancelled
    answered_by VARCHAR(50), -- human, machine_start, machine_end_beep, machine_end_silence, machine_end_other, fax, unknown

    start_time TIMESTAMP,
    answer_time TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER, -- total call duration in seconds
    talk_time INTEGER, -- actual talk time with agent in seconds

    -- Disposition (outcome)
    disposition VARCHAR(50) CHECK (disposition IN (
        'answered', 'voicemail', 'no_answer', 'busy', 'failed',
        'transferred', 'completed', 'dnc_request', 'callback_request'
    )),

    -- Recording
    recording_url VARCHAR(500),
    recording_sid VARCHAR(100),
    recording_duration INTEGER,

    -- Cost tracking
    cost DECIMAL(10, 4),

    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calls_tenant ON calls(tenant_id);
CREATE INDEX idx_calls_campaign ON calls(campaign_id);
CREATE INDEX idx_calls_lead ON calls(lead_id);
CREATE INDEX idx_calls_agent ON calls(agent_id);
CREATE INDEX idx_calls_sid ON calls(call_sid);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_disposition ON calls(disposition);
CREATE INDEX idx_calls_start_time ON calls(start_time);

-- ============================================
-- 7. DNC_LIST TABLE (Do Not Call registry)
-- ============================================
CREATE TABLE dnc_list (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    phone VARCHAR(20) NOT NULL,
    phone_normalized VARCHAR(20) NOT NULL,

    reason VARCHAR(255),
    source VARCHAR(100), -- manual, api, customer_request, regulatory

    added_by UUID REFERENCES users(id),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Optional expiration
    expires_at TIMESTAMP,

    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_dnc_tenant ON dnc_list(tenant_id);
CREATE INDEX idx_dnc_phone ON dnc_list(phone_normalized);
CREATE UNIQUE INDEX idx_dnc_tenant_phone ON dnc_list(tenant_id, phone_normalized) WHERE is_active = true;

-- ============================================
-- 8. AGENT_GROUPS TABLE (for campaign assignment)
-- ============================================
CREATE TABLE agent_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agent_groups_tenant ON agent_groups(tenant_id);

-- ============================================
-- 9. CALL_QUEUE TABLE (for managing call scheduling)
-- ============================================
CREATE TABLE call_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

    priority INTEGER DEFAULT 5,
    scheduled_at TIMESTAMP NOT NULL,

    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER DEFAULT 0,

    last_error TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

CREATE INDEX idx_queue_campaign ON call_queue(campaign_id);
CREATE INDEX idx_queue_scheduled ON call_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_queue_status ON call_queue(status);

-- ============================================
-- TRIGGERS for updated_at timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA (optional, for testing)
-- ============================================
-- Insert a default tenant
INSERT INTO tenants (id, name, company, email) VALUES
('00000000-0000-0000-0000-000000000001', 'Demo Tenant', 'Demo Corp', 'demo@example.com');

-- Insert an admin user (password: 'admin123', hashed with bcrypt)
INSERT INTO users (id, email, password_hash, role, tenant_id, first_name, last_name) VALUES
('00000000-0000-0000-0000-000000000002', 'admin@example.com', '$2a$10$X3p7qYJ9YwQl3kVxKqHhFeYqC4P1WlMvZ8Y4N2QX5jXy7K0Z8W9q6', 'admin', '00000000-0000-0000-0000-000000000001', 'Admin', 'User');
