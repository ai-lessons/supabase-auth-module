-- Supabase Auth Module Database Schema
-- This SQL script creates the necessary tables for the authentication module

-- Table for logging user registrations (from original plugin)
CREATE TABLE IF NOT EXISTS wp_user_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  user_id UUID NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  site_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  pair_id UUID, -- Reference to registration pair
  registration_url TEXT, -- URL where user registered
  thankyou_page_url TEXT -- URL of thank you page
);

-- Table for registration pairs (from original plugin)
CREATE TABLE IF NOT EXISTS wp_registration_pairs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_url TEXT NOT NULL,
  registration_page_url TEXT NOT NULL,
  thankyou_page_url TEXT NOT NULL,
  registration_page_id TEXT, -- Can be used for external page IDs
  thankyou_page_id TEXT, -- Can be used for external page IDs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for system users (replaces WordPress users)
CREATE TABLE IF NOT EXISTS system_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supabase_user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  username TEXT,
  display_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Optional: Table for tracking authentication events
CREATE TABLE IF NOT EXISTS auth_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'login', 'logout', 'registration', 'token_refresh'
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance on user lookups
CREATE INDEX IF NOT EXISTS idx_wp_user_registrations_user_id ON wp_user_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_wp_user_registrations_email ON wp_user_registrations(user_email);
CREATE INDEX IF NOT EXISTS idx_wp_user_registrations_registered_at ON wp_user_registrations(registered_at);
CREATE INDEX IF NOT EXISTS idx_wp_user_registrations_pair_id ON wp_user_registrations(pair_id);

-- Indexes for registration pairs
CREATE INDEX IF NOT EXISTS idx_wp_registration_pairs_site_url ON wp_registration_pairs(site_url);
CREATE INDEX IF NOT EXISTS idx_wp_registration_pairs_reg_url ON wp_registration_pairs(registration_page_url);
CREATE INDEX IF NOT EXISTS idx_wp_registration_pairs_ty_url ON wp_registration_pairs(thankyou_page_url);

-- Indexes for system users
CREATE INDEX IF NOT EXISTS idx_system_users_supabase_id ON system_users(supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_system_users_email ON system_users(email);
CREATE INDEX IF NOT EXISTS idx_system_users_role ON system_users(role);

-- Indexes for auth events
CREATE INDEX IF NOT EXISTS idx_auth_events_user_id ON auth_events(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_events_event_type ON auth_events(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_events_created_at ON auth_events(created_at);

-- Grant necessary permissions (adjust based on your Supabase RLS policies)
-- Note: In Supabase, you might want to enable RLS and create policies instead

-- Example RLS policies (uncomment and adjust as needed):
/*
ALTER TABLE wp_user_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp_registration_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_events ENABLE ROW LEVEL SECURITY;

-- Policy for wp_user_registrations - only service role can insert
CREATE POLICY "Service role can insert registrations" ON wp_user_registrations
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Policy for wp_registration_pairs - only service role can manage
CREATE POLICY "Service role can manage pairs" ON wp_registration_pairs
  FOR ALL USING (auth.role() = 'service_role');

-- Policy for system_users - users can read their own data
CREATE POLICY "Users can read own data" ON system_users
  FOR SELECT USING (auth.uid() = supabase_user_id);

-- Policy for auth_events - only service role can insert
CREATE POLICY "Service role can insert auth events" ON auth_events
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
*/
