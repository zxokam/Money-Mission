-- Run this in Supabase SQL Editor
-- Adds user accounts, mission claiming, and per-user settings

-- 1. Add username to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- 2. Add accepted_by to missions (who claimed it)
ALTER TABLE missions ADD COLUMN IF NOT EXISTS accepted_by INTEGER REFERENCES users(id);

-- 3. Add user_id to financial_setups (per-user budget settings)
ALTER TABLE financial_setups ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
ALTER TABLE financial_setups ALTER COLUMN mission_id DROP NOT NULL;
