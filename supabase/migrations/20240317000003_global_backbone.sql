-- Migration: Global Software Backbone Expansion
-- Adds support for WAF, Threat Intelligence, FIM, and Expanded Infrastructure

-- 1. Infrastructure Types & Tags
ALTER TABLE agents ADD COLUMN IF NOT EXISTS type text DEFAULT 'server'; -- server, container, database, iot
ALTER TABLE agents ADD COLUMN IF NOT EXISTS region text DEFAULT 'global';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- 2. Threat Intelligence & WAF Logs
CREATE TABLE IF NOT EXISTS threat_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp timestamptz DEFAULT now(),
    source_ip text,
    event_type text, -- 'sqli', 'xss', 'ddos', 'brute_force', 'bot'
    severity text, -- 'low', 'medium', 'high', 'critical'
    description text,
    request_path text,
    user_agent text,
    action_taken text, -- 'blocked', 'monitored', 'challenged'
    metadata jsonb DEFAULT '{}'::jsonb
);

-- 3. WAF Rules
CREATE TABLE IF NOT EXISTS waf_rules (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    pattern text NOT NULL, -- Regex or keyword
    rule_type text NOT NULL, -- 'sqli', 'xss', 'agent_block'
    is_active boolean DEFAULT true,
    severity text DEFAULT 'high',
    created_at timestamptz DEFAULT now()
);

-- 4. File Integrity Monitoring (FIM) Logs
CREATE TABLE IF NOT EXISTS fim_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
    file_path text NOT NULL,
    event_type text, -- 'modified', 'created', 'deleted'
    previous_hash text,
    new_hash text,
    timestamp timestamptz DEFAULT now(),
    severity text DEFAULT 'high'
);

-- 5. Vulnerability Scans
CREATE TABLE IF NOT EXISTS vulnerability_scans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    target text NOT NULL,
    status text DEFAULT 'pending', -- 'running', 'completed', 'failed'
    findings jsonb DEFAULT '[]'::jsonb,
    started_at timestamptz DEFAULT now(),
    completed_at timestamptz
);

-- Seed basic WAF rules
INSERT INTO waf_rules (name, pattern, rule_type, severity) VALUES
('Basic SQL Injection Block', '(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b)', 'sqli', 'critical'),
('Script Tag Block', '<script>', 'xss', 'high'),
('Path Traversal', '\.\./', 'lfi', 'high')
ON CONFLICT DO NOTHING;

-- RLS Policies (Simplified for prototype)
ALTER TABLE threat_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to authenticated users" ON threat_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert access to service role" ON threat_events FOR INSERT TO service_role WITH CHECK (true);

ALTER TABLE waf_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to authenticated users" ON waf_rules FOR SELECT TO authenticated USING (true);

ALTER TABLE fim_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to authenticated users" ON fim_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert access to service role" ON fim_logs FOR INSERT TO service_role WITH CHECK (true);
