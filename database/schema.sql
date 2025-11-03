-- Supabase Auth Module Database Schema
-- This SQL script creates the necessary tables for the authentication module

-- Table for logging user registrations
CREATE TABLE IF NOT EXISTS wp_user_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  user_id UUID NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  site_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for better performance on user lookups
CREATE INDEX IF NOT EXISTS idx_wp_user_registrations_user_id ON wp_user_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_wp_user_registrations_email ON wp_user_registrations(user_email);
CREATE INDEX IF NOT EXISTS idx_wp_user_registrations_registered_at ON wp_user_registrations(registered_at);

-- Optional: Table for tracking authentication events
CREATE TABLE IF NOT EXISTS auth_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'login', 'logout', 'registration', 'token_refresh'
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for auth events
CREATE INDEX IF NOT EXISTS idx_auth_events_user_id ON auth_events(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_events_event_type ON auth_events(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_events_created_at ON auth_events(created_at);

-- Grant necessary permissions (adjust based on your Supabase RLS policies)
-- Note: In Supabase, you might want to enable RLS and create policies instead

-- Example RLS policies (uncomment and adjust as needed):
/*
ALTER TABLE wp_user_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_events ENABLE ROW LEVEL SECURITY;

-- Policy for wp_user_registrations - only service role can insert
CREATE POLICY "Service role can insert registrations" ON wp_user_registrations
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Policy for auth_events - only service role can insert
CREATE POLICY "Service role can insert auth events" ON auth_events
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
*/
