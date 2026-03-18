-- Migration: Session Protection and Device Fingerprinting
-- Adds comprehensive session security tracking

-- 1. User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token text UNIQUE NOT NULL,
    device_fingerprint text NOT NULL,
    ip_address text NOT NULL,
    user_agent text,
    location_data jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'active', -- active, revoked, expired
    created_at timestamptz DEFAULT now(),
    last_activity timestamptz DEFAULT now(),
    expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

-- 2. Security Events Table
CREATE TABLE IF NOT EXISTS security_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id uuid REFERENCES user_sessions(id) ON DELETE CASCADE,
    event_type text NOT NULL, -- suspicious_login, ip_changed, device_changed, etc.
    severity text NOT NULL, -- low, medium, high, critical
    description text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- 3. Device Fingerprints Table
CREATE TABLE IF NOT EXISTS device_fingerprints (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    fingerprint_hash text UNIQUE NOT NULL,
    device_info jsonb NOT NULL,
    first_seen timestamptz DEFAULT now(),
    last_seen timestamptz DEFAULT now(),
    trust_level text DEFAULT 'unknown', -- trusted, unknown, suspicious, blocked
    metadata jsonb DEFAULT '{}'::jsonb
);

-- 4. Blocked Devices Table
CREATE TABLE IF NOT EXISTS blocked_devices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    fingerprint_hash text NOT NULL,
    reason text NOT NULL,
    blocked_by uuid REFERENCES auth.users(id),
    blocked_at timestamptz DEFAULT now(),
    expires_at timestamptz DEFAULT (now() + interval '30 days')
);

-- RLS Policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own sessions" ON user_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can revoke their own sessions" ON user_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own security events" ON security_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert security events" ON security_events FOR INSERT TO service_role WITH CHECK (true);

ALTER TABLE device_fingerprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own device fingerprints" ON device_fingerprints FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage device fingerprints" ON device_fingerprints FOR ALL TO service_role USING (true);

ALTER TABLE blocked_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view blocked devices" ON blocked_devices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage blocked devices" ON blocked_devices FOR ALL TO authenticated USING (true);

-- Indexes for performance
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_status ON user_sessions(status);
CREATE INDEX idx_user_sessions_created_at ON user_sessions(created_at);
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_created_at ON security_events(created_at);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_device_fingerprints_user_id ON device_fingerprints(user_id);
CREATE INDEX idx_device_fingerprints_hash ON device_fingerprints(fingerprint_hash);
CREATE INDEX idx_blocked_devices_hash ON blocked_devices(fingerprint_hash);
CREATE INDEX idx_blocked_devices_expires_at ON blocked_devices(expires_at);