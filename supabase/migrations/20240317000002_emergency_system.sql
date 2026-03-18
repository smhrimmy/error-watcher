-- Create Blocked IPs table
CREATE TABLE IF NOT EXISTS public.blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON public.blocked_ips(ip_address);

-- Create Agent Commands table (for remote execution)
CREATE TABLE IF NOT EXISTS public.agent_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    command VARCHAR(50) NOT NULL, -- e.g., 'restart', 'shutdown', 'clear_cache'
    params JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    executed_at TIMESTAMP WITH TIME ZONE,
    result TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_commands_agent_status ON public.agent_commands(agent_id, status);

-- Add Maintenance Mode to Websites
ALTER TABLE public.websites ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT FALSE;

-- RLS Policies
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_commands ENABLE ROW LEVEL SECURITY;

-- Blocked IPs
CREATE POLICY "Users can manage own blocked ips" ON public.blocked_ips
    FOR ALL USING (auth.uid() = user_id);

-- Agent Commands
CREATE POLICY "Users can manage own agent commands" ON public.agent_commands
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.agents
            WHERE agents.id = agent_commands.agent_id
            AND agents.user_id = auth.uid()
        )
    );
