-- create users table handled by supabase auth by default, but we'll extend it
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- create websites table
CREATE TABLE IF NOT EXISTS public.websites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    check_interval INTEGER NOT NULL CHECK (check_interval IN (5, 30)),
    is_owned BOOLEAN DEFAULT true,
    alert_email VARCHAR(255),
    alert_sms VARCHAR(20),
    response_time_threshold INTEGER DEFAULT 5000,
    failure_threshold INTEGER DEFAULT 2,
    recovery_threshold_minutes INTEGER DEFAULT 10,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- create monitoring_logs table
CREATE TABLE IF NOT EXISTS public.monitoring_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status_code INTEGER,
    response_time INTEGER,
    request_duration INTEGER,
    check_status VARCHAR(20) CHECK (check_status IN ('success', 'failed', 'timeout')),
    error_message TEXT
);

-- create alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
    alert_type VARCHAR(20) CHECK (alert_type IN ('downtime', 'recovery', 'slow_response')),
    delivery_method VARCHAR(10) CHECK (delivery_method IN ('email', 'sms')),
    triggered_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_timestamp TIMESTAMP WITH TIME ZONE,
    failure_count INTEGER DEFAULT 1,
    escalation_level INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'escalated'))
);

-- create alert_configs table
CREATE TABLE IF NOT EXISTS public.alert_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
    alert_type VARCHAR(20) CHECK (alert_type IN ('downtime', 'recovery', 'slow_response')),
    failure_threshold INTEGER DEFAULT 2,
    escalation_interval_minutes INTEGER DEFAULT 60,
    max_escalations INTEGER DEFAULT 5,
    recovery_alert BOOLEAN DEFAULT true,
    recovery_threshold_minutes INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- create indexes
CREATE INDEX IF NOT EXISTS idx_websites_user_id ON public.websites(user_id);
CREATE INDEX IF NOT EXISTS idx_websites_status ON public.websites(status);
CREATE INDEX IF NOT EXISTS idx_websites_check_interval ON public.websites(check_interval);

CREATE INDEX IF NOT EXISTS idx_monitoring_logs_website_id ON public.monitoring_logs(website_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_timestamp ON public.monitoring_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_website_timestamp ON public.monitoring_logs(website_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_check_status ON public.monitoring_logs(check_status);

CREATE INDEX IF NOT EXISTS idx_alerts_website_id ON public.alerts(website_id);
CREATE INDEX IF NOT EXISTS idx_alerts_triggered_timestamp ON public.alerts(triggered_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);

CREATE INDEX IF NOT EXISTS idx_alert_configs_website_id ON public.alert_configs(website_id);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_configs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Websites Policies
CREATE POLICY "Users can view own websites" ON public.websites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own websites" ON public.websites
    FOR ALL USING (auth.uid() = user_id);

-- Monitoring Logs Policies
CREATE POLICY "Users can view monitoring logs for own websites" ON public.monitoring_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.websites 
            WHERE websites.id = monitoring_logs.website_id 
            AND websites.user_id = auth.uid()
        )
    );

-- We need service role to insert logs
CREATE POLICY "Service role can insert monitoring logs" ON public.monitoring_logs
    FOR INSERT WITH CHECK (true);

-- Alerts Policies
CREATE POLICY "Users can view alerts for own websites" ON public.alerts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.websites 
            WHERE websites.id = alerts.website_id 
            AND websites.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage alerts" ON public.alerts
    FOR ALL USING (true);

-- Alert Configs Policies
CREATE POLICY "Users can manage alert configs for own websites" ON public.alert_configs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.websites 
            WHERE websites.id = alert_configs.website_id 
            AND websites.user_id = auth.uid()
        )
    );

-- Create trigger for new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user when a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();