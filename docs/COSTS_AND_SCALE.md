# Cost Estimates & Scale Guidance

## Cost Breakdown by Scale

### Small Scale
**3,000 calls/month (2 min average)**

| Component | Monthly Cost |
|-----------|--------------|
| Twilio Voice (6,000 min × $0.0140) | $84.00 |
| Twilio Phone Number (1×) | $1.00 |
| Recording Storage (S3) | $0.50 |
| **Twilio Subtotal** | **$85.50** |
| | |
| Railway Starter (Web Service) | $5.00 |
| PostgreSQL Database | $5.00 |
| Redis Cache | $3.00 |
| **Infrastructure Subtotal** | **$13.00** |
| | |
| **TOTAL MONTHLY** | **$98.50** |

**Per-call cost:** $0.033

---

### Medium Scale
**30,000 calls/month (2 min average)**

| Component | Monthly Cost |
|-----------|--------------|
| Twilio Voice (60,000 min × $0.0140) | $840.00 |
| Twilio Phone Numbers (5×) | $5.00 |
| Recording Storage (S3) | $5.00 |
| **Twilio Subtotal** | **$850.00** |
| | |
| Railway Pro (Web Service) | $20.00 |
| PostgreSQL Database (increased) | $25.00 |
| Redis Cache | $10.00 |
| **Infrastructure Subtotal** | **$55.00** |
| | |
| **TOTAL MONTHLY** | **$905.00** |

**Per-call cost:** $0.030

---

### Large Scale
**300,000 calls/month (2 min average)**

| Component | Monthly Cost |
|-----------|--------------|
| Twilio Voice (600,000 min × $0.0125*) | $7,500.00 |
| Twilio Phone Numbers (20×) | $20.00 |
| Recording Storage (S3) | $50.00 |
| **Twilio Subtotal** | **$7,570.00** |
| | |
| AWS ECS Fargate (2 tasks) | $100.00 |
| RDS PostgreSQL (db.t3.medium) | $60.00 |
| ElastiCache Redis (cache.t3.micro) | $15.00 |
| Application Load Balancer | $16.00 |
| Data Transfer | $50.00 |
| S3 Storage & Bandwidth | $10.00 |
| **Infrastructure Subtotal** | **$251.00** |
| | |
| **TOTAL MONTHLY** | **$7,821.00** |

*Volume discount applied at 500,000+ min/month

**Per-call cost:** $0.026

---

## Cost Optimization Strategies

### 1. Retry Policy Optimization

**Before:**
```json
{
  "max_attempts": 5,
  "retry_on_voicemail": true,
  "delay_minutes": 30
}
```
- Average attempts per lead: 3.2
- Wasted voicemail retries: 30%

**After:**
```json
{
  "max_attempts": 3,
  "retry_on_voicemail": false,
  "delay_minutes": 60
}
```
- Average attempts per lead: 2.1
- **Savings: ~15%**

### 2. Selective Recording

**Before:** Record all calls
- 30,000 calls/month
- 2 min average
- Storage: 60,000 min = ~$5/mo + storage

**After:** Record only human-answered, completed calls
- Human answer rate: ~45%
- Recording: 13,500 calls
- **Savings: ~55% on recording costs**

### 3. Regional Phone Numbers

Use local area codes for target markets:
- Improves answer rates by 10-15%
- Reduces per-minute costs in some regions
- **Overall savings: 5-10%**

### 4. AMD Timeout Optimization

**Before:** AMD timeout = 60s (Twilio default)
- Waiting for AMD: 60s × 30% no-answer = 18s average waste
- 30,000 calls × 18s = 150 hours = $126/mo waste

**After:** AMD timeout = 30s
- Waiting for AMD: 30s × 30% no-answer = 9s average waste
- **Savings: ~$63/mo**

### 5. Batching & Scheduling

**Before:** Random calling throughout day
- Peak hour rates
- Higher abandon rates

**After:** Optimize for:
- Call during 10am-4pm local time (better answer rates)
- Spread calls evenly (avoid Twilio rate limits)
- **Improved answer rate: +10-15%**
- **Reduced retries: -10%**

---

## Scaling Recommendations

### When to Scale Up

| Metric | Threshold | Action |
|--------|-----------|--------|
| Concurrent calls | > 80% capacity | Add more Twilio numbers |
| API response time | > 500ms (p95) | Scale up web service |
| Database CPU | > 70% | Upgrade database tier |
| Queue depth | > 1000 | Add workers |
| Memory usage | > 80% | Increase container memory |

### Scaling Strategy by Volume

#### 0-10K calls/month
**Infrastructure:**
- Single web server (Railway Starter)
- PostgreSQL (10GB)
- Redis (512MB)
- 1-2 Twilio numbers

**Team:**
- 1-2 agents
- Self-managed

#### 10K-100K calls/month
**Infrastructure:**
- 2 web servers (Railway Pro)
- PostgreSQL (50GB, read replica)
- Redis (2GB)
- 5-10 Twilio numbers

**Team:**
- 5-10 agents
- 1 manager
- Monitoring tools

#### 100K-500K calls/month
**Infrastructure:**
- AWS ECS (3-5 tasks)
- RDS Multi-AZ (100GB)
- ElastiCache (4GB)
- 20-50 Twilio numbers
- CDN for frontend

**Team:**
- 20-50 agents
- 2-3 managers
- DevOps engineer
- 24/7 monitoring

#### 500K+ calls/month
**Infrastructure:**
- Kubernetes cluster
- RDS (500GB+, Multi-AZ)
- ElastiCache cluster (16GB+)
- 100+ Twilio numbers
- Multi-region deployment

**Team:**
- 100+ agents
- Dedicated operations team
- Full-time DevOps
- 24/7 support

---

## Cost Comparison: Alternatives

### Twilio vs Competitors

| Provider | Per-Minute Cost | AMD Available | Pros | Cons |
|----------|----------------|---------------|------|------|
| **Twilio** | $0.0140 | Yes (best accuracy) | Best documentation, reliability | Higher cost |
| **Telnyx** | $0.0060 | Yes | Lower cost | Less accurate AMD |
| **Plivo** | $0.0070 | Yes | Good pricing | Fewer features |
| **Vonage** | $0.0090 | Yes | Good uptime | Limited API |

**Recommendation:** Start with Twilio for reliability. Consider Telnyx for high-volume (100K+ calls/mo) if AMD accuracy is acceptable.

---

## ROI Analysis

### Example: Broker Lead Generation

**Scenario:**
- 30,000 calls/month
- Human answer rate: 45% (13,500 answers)
- Agent connect rate: 80% (10,800 connects)
- Conversion rate: 5% (540 leads)
- Lead value: $50

**Revenue:**
- 540 leads × $50 = **$27,000/mo**

**Costs:**
- System: $905/mo
- Agents (10 @ $3000/mo): $30,000/mo
- **Total: $30,905/mo**

**ROI:**
- Break-even lead value: **$57**
- At $50/lead: Net loss
- At $75/lead: **$9,595/mo profit** (31% margin)

**Optimization:**
- Improve answer rate to 55%: +667 leads = +$33,350 revenue
- Better targeting: Increase conversion to 7% = +108 leads = +$5,400 revenue

---

## Budget Planning Template

### Monthly Budget Worksheet

```
REVENUE
────────────────────────────────
Calls per month:              _______
Answer rate (%):              _______
Connects (calls × answer):    _______
Conversion rate (%):          _______
Leads (connects × conv):      _______
Lead value ($):               _______

TOTAL REVENUE:                $_______

COSTS
────────────────────────────────
Twilio (calls × 2 min × $0.014): $_______
Phone numbers (qty × $1):        $_______
Infrastructure:                  $_______
SYSTEM SUBTOTAL:                 $_______

Agents (qty × salary):           $_______
Management:                      $_______
LABOR SUBTOTAL:                  $_______

TOTAL COSTS:                     $_______

PROFIT/LOSS:                     $_______
MARGIN (%):                      _______%
```

### Example Filled

```
REVENUE
────────────────────────────────
Calls per month:              30,000
Answer rate (%):              45%
Connects (calls × answer):    13,500
Conversion rate (%):          5%
Leads (connects × conv):      675
Lead value ($):               $75

TOTAL REVENUE:                $50,625

COSTS
────────────────────────────────
Twilio (30K × 2 × $0.014):    $840
Phone numbers (5 × $1):       $5
Infrastructure:               $60
SYSTEM SUBTOTAL:              $905

Agents (10 × $3000):          $30,000
Management:                   $5,000
LABOR SUBTOTAL:               $35,000

TOTAL COSTS:                  $35,905

PROFIT/LOSS:                  $14,720
MARGIN (%):                   29.1%
```

---

## Monitoring Costs

### Set Budget Alerts

**Twilio:**
1. Console → Usage → Alerts
2. Set alert at 80% of expected usage
3. Monitor daily usage trends

**Infrastructure:**
1. Railway/AWS Budget Alerts
2. Monitor resource utilization
3. Set up cost anomaly detection

### Cost Tracking Queries

```sql
-- Daily call costs
SELECT
  DATE(start_time) as date,
  COUNT(*) as calls,
  SUM(cost) as total_cost,
  AVG(cost) as avg_cost_per_call
FROM calls
WHERE start_time >= NOW() - INTERVAL '30 days'
GROUP BY DATE(start_time)
ORDER BY date DESC;

-- Cost by campaign
SELECT
  c.name,
  COUNT(ca.id) as calls,
  SUM(ca.cost) as total_cost,
  AVG(ca.cost) as avg_cost
FROM campaigns c
LEFT JOIN calls ca ON c.id = ca.campaign_id
WHERE ca.start_time >= NOW() - INTERVAL '30 days'
GROUP BY c.id, c.name
ORDER BY total_cost DESC;

-- Cost by disposition
SELECT
  disposition,
  COUNT(*) as calls,
  SUM(cost) as total_cost
FROM calls
WHERE start_time >= NOW() - INTERVAL '30 days'
GROUP BY disposition
ORDER BY total_cost DESC;
```

---

## Conclusion

- **Start small:** $100/mo for 3K calls
- **Scale gradually:** Monitor key metrics
- **Optimize continuously:** 15-25% cost reduction possible
- **Plan for growth:** Infrastructure scales with volume
- **Track ROI:** Ensure lead value > system + labor costs

For specific scaling questions, review [docs/ARCHITECTURE.md](ARCHITECTURE.md) for technical scaling patterns.
