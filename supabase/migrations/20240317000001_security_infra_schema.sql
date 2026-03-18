-- Create Agents table for Infrastructure Monitoring
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    hostname VARCHAR(255) NOT NULL,
    ip_address INET,
    os_info JSONB DEFAULT '{}',
    version VARCHAR(50),
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'maintenance')),
    api_key_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON public.agents(status);

-- Create Security Findings table
CREATE TABLE IF NOT EXISTS public.security_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
    severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    finding_type VARCHAR(100) NOT NULL,
    description TEXT,
    evidence TEXT,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'ignored')),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_security_findings_website_id ON public.security_findings(website_id);
CREATE INDEX IF NOT EXISTS idx_security_findings_severity ON public.security_findings(severity);

-- Create System Metrics table (Time-series data for infrastructure)
CREATE TABLE IF NOT EXISTS public.system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    cpu_usage FLOAT,
    memory_usage FLOAT,
    disk_usage FLOAT,
    network_rx_bytes BIGINT,
    network_tx_bytes BIGINT
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_agent_time ON public.system_metrics(agent_id, timestamp DESC);

-- Enable RLS
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Agents
CREATE POLICY "Users can manage own agents" ON public.agents
    FOR ALL USING (auth.uid() = user_id);

-- Security Findings
CREATE POLICY "Users can view security findings for own websites" ON public.security_findings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.websites
            WHERE websites.id = security_findings.website_id
            AND websites.user_id = auth.uid()
        )
    );

-- System Metrics
CREATE POLICY "Users can view metrics for own agents" ON public.system_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agents
            WHERE agents.id = system_metrics.agent_id
            AND agents.user_id = auth.uid()
        )
    );
