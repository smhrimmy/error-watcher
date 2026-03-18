-- Add GitHub integration fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS github_token TEXT;

-- Add GitHub integration fields to websites
ALTER TABLE public.websites 
ADD COLUMN IF NOT EXISTS github_repo TEXT,
ADD COLUMN IF NOT EXISTS github_branch TEXT DEFAULT 'main',
ADD COLUMN IF NOT EXISTS auto_rollback_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS create_issues_on_alert BOOLEAN DEFAULT false;
