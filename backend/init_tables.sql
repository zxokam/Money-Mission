-- Run this in Supabase SQL Editor (https://kgcwknyznvnixpxonfov.supabase.co)
-- Go to: SQL Editor → New Query → Paste → Run

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS missions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title TEXT NOT NULL,
    sponsor_name TEXT NOT NULL,
    participant_name TEXT NOT NULL,
    reward_amount FLOAT DEFAULT 0,
    target_improvement_percentage FLOAT DEFAULT 10,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rules TEXT,
    status TEXT DEFAULT 'pending',
    verification_method TEXT DEFAULT 'bank',
    photo_subject TEXT,
    photo_frequency TEXT DEFAULT 'daily',
    total_photos_required INTEGER DEFAULT 0,
    expire_days INTEGER DEFAULT 15,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_setups (
    id SERIAL PRIMARY KEY,
    mission_id INTEGER UNIQUE REFERENCES missions(id) ON DELETE CASCADE,
    monthly_income FLOAT DEFAULT 0,
    fixed_expenses FLOAT DEFAULT 0,
    subscriptions FLOAT DEFAULT 0,
    paylater_commitments FLOAT DEFAULT 0,
    average_food_per_day FLOAT DEFAULT 0,
    transport_cost FLOAT DEFAULT 0,
    other_required_expenses FLOAT DEFAULT 0,
    required_expenses FLOAT DEFAULT 0,
    expected_leftover FLOAT DEFAULT 0,
    safe_daily_spending FLOAT DEFAULT 0,
    baseline_financial_score INTEGER DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    mission_id INTEGER REFERENCES missions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount FLOAT NOT NULL,
    category TEXT DEFAULT 'Others',
    transaction_date DATE NOT NULL,
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evaluations (
    id SERIAL PRIMARY KEY,
    mission_id INTEGER UNIQUE REFERENCES missions(id) ON DELETE CASCADE,
    expected_leftover FLOAT DEFAULT 0,
    actual_total_spending FLOAT DEFAULT 0,
    actual_leftover FLOAT DEFAULT 0,
    improvement_percentage FLOAT DEFAULT 0,
    target_improvement_percentage FLOAT DEFAULT 10,
    final_financial_score INTEGER DEFAULT 60,
    status TEXT DEFAULT 'accepted',
    ai_explanation TEXT,
    reward_unlocked INTEGER DEFAULT 0,
    category_breakdown TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
