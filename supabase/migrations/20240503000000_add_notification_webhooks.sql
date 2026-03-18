-- Add webhook columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT;
