-- Create Platform Health Metrics table
CREATE TABLE IF NOT EXISTS public.platform_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metric_name VARCHAR(100) NOT NULL,
    value FLOAT NOT NULL,
    tags JSONB DEFAULT '{}'
);

-- Index for time-series querying
CREATE INDEX IF NOT EXISTS idx_platform_health_metrics_time ON public.platform_health_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_platform_health_metrics_name ON public.platform_health_metrics(metric_name);

-- Enable RLS
ALTER TABLE public.platform_health_metrics ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users (admins/operators)
CREATE POLICY "Authenticated users can view platform metrics" ON public.platform_health_metrics
    FOR SELECT TO authenticated USING (true);

-- Allow insert access to service role (backend)
CREATE POLICY "Service role can insert platform metrics" ON public.platform_health_metrics
    FOR INSERT TO service_role WITH CHECK (true);
