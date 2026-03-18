-- Migration: Threat Events Partitioning
-- Note: Supabase Postgres supports declarative partitioning.
-- We will rename the old table and create a new partitioned one.

-- 1. Rename existing table
ALTER TABLE threat_events RENAME TO threat_events_old;

-- 2. Create new partitioned table
CREATE TABLE threat_events (
    id uuid DEFAULT gen_random_uuid(),
    timestamp timestamptz DEFAULT now(),
    source_ip text,
    event_type text,
    severity text,
    description text,
    request_path text,
    user_agent text,
    action_taken text,
    metadata jsonb DEFAULT '{}'::jsonb,
    PRIMARY KEY (id, timestamp) -- Must include partition key in PK
) PARTITION BY RANGE (timestamp);

-- 3. Create initial partitions
-- For a real production system, a cron job (e.g. pg_cron) would create these automatically.
-- We will create partitions for the current month and next month as a baseline.
CREATE TABLE threat_events_y2024m03 PARTITION OF threat_events
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

CREATE TABLE threat_events_y2024m04 PARTITION OF threat_events
    FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');

-- Default partition for out of bounds data
CREATE TABLE threat_events_default PARTITION OF threat_events DEFAULT;

-- 4. Copy data over (if any)
INSERT INTO threat_events (id, timestamp, source_ip, event_type, severity, description, request_path, user_agent, action_taken, metadata)
SELECT id, timestamp, source_ip, event_type, severity, description, request_path, user_agent, action_taken, metadata 
FROM threat_events_old;

-- 5. Re-apply RLS
ALTER TABLE threat_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to authenticated users" ON threat_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert access to service role" ON threat_events FOR INSERT TO service_role WITH CHECK (true);

-- 6. Drop old table
DROP TABLE threat_events_old;
