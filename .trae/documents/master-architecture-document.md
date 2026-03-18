# Website Monitoring & Cybersecurity Operations Platform - Master Architecture Document

## 1. System Overview
A unified production-ready platform combining website monitoring, performance tracking, infrastructure observability, and cybersecurity operations. This system acts as a command center for developers and SREs to Monitor, Secure, Diagnose, and Repair.

## 2. Architecture Diagram

```mermaid
graph TD
    User[Developer/SRE] -->|HTTPS| CloudFront[AWS CloudFront]
    CloudFront --> ALB[Application Load Balancer]
    ALB --> API_Cluster[Node.js API Cluster (EKS/ECS)]
    
    subgraph "Data Layer"
        API_Cluster --> PrimaryDB[(PostgreSQL Primary)]
        API_Cluster --> Redis[Redis Cluster (Queues/Cache)]
        API_Cluster --> TimescaleDB[(TimescaleDB - Metrics)]
    end
    
    subgraph "Worker Layer"
        EventBridge[AWS EventBridge Scheduler] -->|Trigger| SQS_Jobs[SQS Job Queue]
        SQS_Jobs --> Lambda_Workers[Lambda Monitoring Workers]
        Lambda_Workers -->|HTTP/Browser Checks| Internet[Target Websites]
        Lambda_Workers -->|Write Results| TimescaleDB
        Lambda_Workers -->|Alert Events| SNS[AWS SNS]
    end
    
    subgraph "Agent Layer"
        Remote_Server[Remote Linux Server] -->|mTLS| Agent_Gateway[Agent Gateway Service]
        Agent_Gateway -->|Metrics/Logs| TimescaleDB
        API_Cluster -->|Commands| Agent_Gateway
    end
    
    subgraph "Security Services"
        Scanner_Worker[Vulnerability Scanner] -->|ZAP/Nuclei| Internet
        Scanner_Worker -->|Findings| PrimaryDB
    end
```

## 3. Database Schema (PostgreSQL + TimescaleDB)

### Core Entities
```sql
-- Websites / Targets
CREATE TABLE targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    name VARCHAR(255) NOT NULL,
    url VARCHAR(2048) NOT NULL,
    method VARCHAR(10) DEFAULT 'GET',
    headers JSONB DEFAULT '{}',
    body TEXT,
    tags TEXT[],
    is_owned BOOLEAN DEFAULT false,
    check_interval INTEGER DEFAULT 300,
    timeout_ms INTEGER DEFAULT 10000,
    maintenance_windows JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Infrastructure Agents
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id UUID REFERENCES targets(id),
    hostname VARCHAR(255),
    ip_address INET,
    os_info JSONB,
    version VARCHAR(50),
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20),
    api_key_hash VARCHAR(255)
);

-- Security Findings
CREATE TABLE security_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id UUID REFERENCES targets(id),
    severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    finding_type VARCHAR(100),
    description TEXT,
    evidence TEXT,
    status VARCHAR(20) DEFAULT 'open',
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);
```

### Time-Series Data (TimescaleDB Hypertables)
```sql
-- HTTP/Synthetic Checks
CREATE TABLE check_results (
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    target_id UUID NOT NULL,
    location VARCHAR(50),
    status_code INTEGER,
    response_time_ms INTEGER,
    ttfb_ms INTEGER,
    dns_ms INTEGER,
    error_code VARCHAR(50),
    is_available BOOLEAN
);
SELECT create_hypertable('check_results', 'time');

-- Infrastructure Metrics
CREATE TABLE system_metrics (
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    agent_id UUID NOT NULL,
    cpu_usage FLOAT,
    memory_usage FLOAT,
    disk_usage FLOAT,
    network_rx_bytes BIGINT,
    network_tx_bytes BIGINT
);
SELECT create_hypertable('system_metrics', 'time');
```

## 4. Backend Folder Structure (NestJS/Node.js)

```
src/
├── modules/
│   ├── targets/           # Website/API management
│   ├── monitoring/        # HTTP/Browser check logic
│   ├── infrastructure/    # Agent communication & metrics
│   ├── security/          # Vulnerability scanning & SSL
│   ├── incidents/         # Alerting & Incident management
│   ├── recovery/          # Emergency actions (Restart, Block IP)
│   └── analytics/         # Data aggregation & reporting
├── common/
│   ├── guards/            # RBAC & Auth guards
│   ├── decorators/        # Custom API decorators
│   └── utils/             # Helper functions
├── config/                # Environment configuration
├── database/              # TypeORM/Prisma schemas & migrations
├── queues/                # BullMQ/SQS consumers
└── main.ts                # Application entry point
```

## 5. Frontend Component Tree (Vue.js)

```
App.vue
├── Layout
│   ├── Sidebar (Navigation)
│   ├── Topbar (User, Org, Global Search)
│   └── MainContent
│       ├── Dashboard (Global Health)
│       │   ├── HealthScoreCard
│       │   ├── ActiveIncidentsList
│       │   └── GlobalMap
│       ├── TargetList (Grid/List View)
│       │   ├── TargetCard
│       │   │   ├── StatusIndicator
│       │   │   ├── SparklineChart
│       │   │   └── QuickActions
│       ├── TargetDetail
│       │   ├── OverviewTab (Uptime/Latency Charts)
│       │   ├── SecurityTab (SSL, Headers, Vulns)
│       │   ├── InfrastructureTab (CPU/RAM/Disk)
│       │   ├── LogsTab (Check history)
│       │   └── SettingsTab (Config, Alerts)
│       ├── SecurityCenter
│       │   ├── VulnerabilityTable
│       │   └── SSLExpiryCalendar
│       ├── Incidents
│       │   ├── IncidentTimeline
│       │   └── RootCauseAnalysis
│       └── EmergencyPanel (Modal)
│           ├── ActionConfirmation
│           ├── ExecutionLogTerminal
│           └── RollbackControls
```

## 6. Monitoring Agent Design

**Capabilities:**
- **Language:** Go (Golang) for single binary distribution and performance.
- **Communication:** mTLS (Mutual TLS) gRPC stream to Agent Gateway.
- **Modules:**
  - `Collector`: Scrapes /proc for system stats (CPU, RAM, Disk).
  - `LogTail`: Tails specified log files and streams to backend.
  - `Executor`: Listens for signed commands (e.g., `systemctl restart nginx`).
  - `Integrity`: Watches critical file paths (inotify) for unauthorized changes.

**Security:**
- Agent initiates connection (outbound only), no open inbound ports required.
- Commands must be cryptographically signed by the backend.
- Command allowlist configured locally on the agent (e.g., only allow `restart nginx`, deny `rm -rf /`).

## 7. Emergency Automation Workflows

**Scenario: High Latency & Error Rate Spike**
1. **Detection:**
   - `check_results` show 500 errors > 5% AND latency > 2000ms.
   - `system_metrics` show CPU > 90% on web servers.
2. **Alerting:**
   - Create Incident #1234.
   - PagerDuty trigger to On-Call Engineer.
3. **Automated Diagnosis:**
   - Correlate with recent `deployment_events`.
   - Check `security_findings` for recent attacks.
4. **Emergency Actions (Manual or Auto-Pilot):**
   - **Action A:** "Rollback Deployment" -> Triggers webhook to CI/CD.
   - **Action B:** "Block Suspicious IPs" -> Updates WAF rules via API.
   - **Action C:** "Restart Web Service" -> Sends command to Agents.
5. **Recovery:**
   - Monitor for metric stabilization.
   - Resolve Incident.

## 8. REST API Specification (Key Endpoints)

**Targets:**
- `POST /targets` - Create monitoring target
- `POST /targets/:id/maintenance` - Schedule maintenance window
- `POST /targets/:id/test` - Run immediate check

**Security:**
- `GET /security/findings` - List all vulnerabilities
- `POST /security/scan` - Trigger OWASP ZAP scan
- `GET /security/ssl/:domain` - Get certificate chain details

**Infrastructure:**
- `GET /infra/agents` - List connected agents
- `POST /infra/agents/:id/command` - Execute remote command (RBAC: Admin only)
- `GET /infra/metrics/cpu` - Get aggregated CPU usage

**Recovery:**
- `POST /recovery/rollback` - Trigger deployment rollback
- `POST /recovery/cache/flush` - Flush CDN/Redis cache

## 9. Security Architecture

1. **Identity & Access:**
   - OIDC/SAML integration for SSO.
   - Fine-grained RBAC (Viewer, Editor, Operator, Admin).
   - MFA enforcement for "Operator" and "Admin" roles.
   - Session revocation on suspicious activity.

2. **Data Protection:**
   - Field-level encryption for API keys and secrets in DB.
   - TLS 1.3 for all data in transit.
   - Audit logs stored in WORM (Write Once Read Many) storage (e.g., S3 Object Lock).

3. **Platform Security:**
   - Container scanning in CI/CD.
   - Runtime Application Self-Protection (RASP) features in the API.
   - Rate limiting on all API endpoints.

## 10. Deployment (Terraform)

- **VPC:** Private subnets for Database and Workers. Public subnets for Load Balancers.
- **Compute:** EKS (Kubernetes) for API and Workers.
- **Data:** RDS (PostgreSQL), ElastiCache (Redis), MSK (Kafka/EventBridge).
- **Security:** WAF attached to ALB. KMS keys for encryption.
