-- Migration: AI Attack Prediction System
-- Adds tables for storing predictions and security analytics

CREATE TABLE IF NOT EXISTS security_predictions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    prediction_data jsonb NOT NULL,
    accuracy_score numeric(3,2),
    timestamp timestamptz DEFAULT now(),
    risk_level text CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    confidence_score numeric(3,2)
);

CREATE TABLE IF NOT EXISTS security_analytics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_name text NOT NULL,
    metric_value numeric NOT NULL,
    timestamp timestamptz DEFAULT now(),
    tags jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_predictions_timestamp ON security_predictions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_analytics_timestamp ON security_analytics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_analytics_metric_name ON security_analytics(metric_name);

-- RLS Policies
ALTER TABLE security_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to authenticated users" ON security_predictions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert access to service role" ON security_predictions FOR INSERT TO service_role WITH CHECK (true);

ALTER TABLE security_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to authenticated users" ON security_analytics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert access to service role" ON security_analytics FOR INSERT TO service_role WITH CHECK (true);