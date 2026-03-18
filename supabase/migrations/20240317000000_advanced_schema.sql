-- Add new columns to websites table
ALTER TABLE public.websites
ADD COLUMN IF NOT EXISTS method VARCHAR(10) DEFAULT 'GET',
ADD COLUMN IF NOT EXISTS headers JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS timeout_ms INTEGER NOT NULL DEFAULT 10000,
ADD COLUMN IF NOT EXISTS maintenance_windows JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS next_check_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index on tags for filtering
CREATE INDEX IF NOT EXISTS idx_websites_tags ON public.websites USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_websites_next_check ON public.websites(next_check_at) WHERE status = 'active';

-- Add region and checker info to logs
ALTER TABLE public.monitoring_logs
ADD COLUMN IF NOT EXISTS region VARCHAR(50),
ADD COLUMN IF NOT EXISTS checker_node_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS error_type VARCHAR(100);

-- Update alerts table with new fields
ALTER TABLE public.alerts
ADD COLUMN IF NOT EXISTS alert_state VARCHAR(20) DEFAULT 'open' CHECK (alert_state IN ('open', 'resolved', 'acknowledged')),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ip VARCHAR(45),
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_user_id, timestamp DESC);

-- Enable RLS for audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit Logs Policies
CREATE POLICY "Users can view own audit logs" ON public.audit_logs
    FOR SELECT USING (auth.uid() = actor_user_id);

CREATE POLICY "Service role can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);
