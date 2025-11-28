-- YouTube CSV Dashboard - Supabase Schema
-- Run this in your Supabase SQL Editor

-- Users table (username/password auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Channels table (stores channel names per user)
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, channel_name)
);

-- Daily metrics table (stores the CSV data)
CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  watch_time_minutes DOUBLE PRECISION DEFAULT 0,
  subs_net INTEGER DEFAULT 0,
  revenue_usd DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(channel_id, date)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_metrics_channel_date ON daily_metrics(channel_id, date);
CREATE INDEX IF NOT EXISTS idx_channels_user ON channels(user_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for service role, we'll use service key)
CREATE POLICY "Service role access for users" ON users FOR ALL USING (true);
CREATE POLICY "Service role access for channels" ON channels FOR ALL USING (true);
CREATE POLICY "Service role access for daily_metrics" ON daily_metrics FOR ALL USING (true);

-- To add a user manually, generate a password hash at https://bcrypt-generator.com (12 rounds)
-- Then run:
-- INSERT INTO users (username, password_hash, display_name) 
-- VALUES ('myusername', '$2a$12$YOUR_HASH_HERE', 'My Display Name');
