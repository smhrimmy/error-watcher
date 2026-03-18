-- Add Maintenance Mode Webhook URL to websites
ALTER TABLE public.websites 
ADD COLUMN IF NOT EXISTS maintenance_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS maintenance_webhook_secret TEXT;
