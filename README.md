# MoneyMission AI

Social finance challenges. Create missions, track spending, prove progress — AI verifies everything. Built for Malaysian students.

## How It Works

1. **Set your budget** — income, fixed expenses, subscriptions. AI computes your safe daily spending limit and financial health score.
2. **Browse or create missions** — bank missions track spending via PDF statements, photo missions track habits via daily uploads.
3. **AI verifies progress** — upload bank statements or photos, AI cross-references against mission rules and gives a verdict (pass/fail).
4. **Check your health** — a fitness-tracker-style score ring on the home page shows budget, balance, daily limit, and burnout risk at a glance.
5. **Predict burnout** — upload 2+ months of bank statements and AI analyzes spending patterns to predict when you'll run out of money.

## Project Structure

```
root/
├── frontend/     React 19 + Vite 8 SPA
├── backend/      Python FastAPI (Vercel serverless)
└── README.md
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router 7 |
| Backend | FastAPI, Python 3.12+ |
| Database | Supabase (PostgreSQL) |
| Auth | Username-based (Supabase GoTrue backend) |
| Storage | Supabase Storage (receipts, photos, bank statements) |
| Hosting | Vercel (frontend + backend serverless) |
| AI/ML | DeepSeek Chat, OpenAI GPT-4o, Google Gemini 2.0 Flash |

## System Architecture

```
Browser (React SPA)
    │
    ├── POST /api/users/login              →  username-only login
    ├── POST /api/users/{id}/settings       →  save budget & expenses
    ├── GET  /api/users/{id}/dashboard       →  settings + missions + available missions
    ├── POST /api/users/{id}/spending-prediction →  upload 2+ bank PDFs, AI burnout analysis
    │
    ├── POST /api/missions                  →  create mission (bank or photo)
    ├── GET  /api/missions/available         →  browse open missions
    ├── POST /api/missions/{id}/accept       →  accept a mission
    ├── POST /api/missions/{id}/transactions →  upload bank statement PDF
    ├── POST /api/missions/{id}/photo-entries→  upload daily photo proof
    ├── POST /api/missions/{id}/evaluate     →  AI evaluation (verdict + score)
    │
    └── POST /api/uploads/receipt           →  upload receipt image
    └── POST /api/uploads/bank-statement    →  parse bank PDF into transactions
            │
            ▼
    FastAPI Backend (Vercel serverless)
            │
            ├── Bank PDF parsing: pypdf → DeepSeek → GPT-4o Vision (scanned)
            ├── AI Evaluation: DeepSeek → Gemini → GPT-4o → rule-based fallback
            ├── Spending Prediction: DeepSeek → GPT-4o → rule-based fallback
            │
            ▼
    Supabase (PostgreSQL + Storage)
```

### Frontend Pages

| Route | Page | Purpose |
|---|---|---|
| `/` | LandingPage | Home hub: 4-step checklist, financial health score ring, stats cards |
| `/dashboard` | Dashboard | Active missions, burnout alert, available missions feed with filters |
| `/create` | CreateMission | Create bank or photo verification missions |
| `/join` | JoinMission | Mission detail + accept flow |
| `/settings` | FinancialSetup | Budget form + spending burnout prediction (upload PDFs) |
| `/transactions` | Transactions | Upload bank statement, preview AI-extracted transactions |
| `/photo-diary` | PhotoDiary | Day-by-day photo upload grid for photo missions |
| `/evaluation` | EvaluationResult | AI verdict: pass/fail, reward, score change, recommendations |

### Backend Routes

| Prefix | Endpoints |
|---|---|
| `/api/users` | login, get user, dashboard, settings CRUD, spending prediction |
| `/api/missions` | create, list, available, accept, cancel, delete, photo entries CRUD, transactions CRUD, financial setup, evaluate |
| `/api/uploads` | receipt upload, bank statement parse |

## AI Tools Used

### Overview

The AI pipeline chains multiple models with automatic fallback. Every endpoint that calls AI tries the primary model first, then falls back through alternatives before using rule-based logic.

### Models

| Model | Used For | Role |
|---|---|---|
| **DeepSeek Chat** | Bank statement parsing, financial evaluation, spending prediction | Primary — fast, accurate, cost-effective for structured financial data extraction |
| **OpenAI GPT-4o** | Photo verification (vision), bank statement parsing (vision fallback for scanned PDFs), spending prediction fallback | Vision capabilities for receipt/photo inspection; scans image-based PDFs when text extraction fails |
| **Google Gemini 2.0 Flash** | Financial evaluation fallback | Secondary fallback for evaluation when DeepSeek is unavailable |

### AI Pipeline Flows

**Bank Statement Parsing** (`POST /api/uploads/bank-statement`):
1. `pypdf` extracts text with layout mode
2. Text cleaner preserves dates, amounts, and debit/credit signs
3. DeepSeek parses transactions (date, name, amount, category)
4. If PDF is scanned (no text): GPT-4o Vision inspects each page
5. Debit/credit convention: `-` = money out (spending), no `-` = money in (deposits/salary, excluded)

**Mission Evaluation** (`POST /api/missions/{id}/evaluate`):
1. Gathers budget settings, transaction history, mission rules, and date range
2. DeepSeek evaluates: spending vs budget, mission rule compliance, improvement percentage
3. Falls back to Gemini 2.0 Flash, then GPT-4o, then rule-based scoring
4. Returns: verdict (accepted/rejected), score change, category breakdown, recommendations

**Spending Burnout Prediction** (`POST /api/users/{id}/spending-prediction`):
1. Parses 2+ months of bank statement PDFs
2. DeepSeek analyzes cross-month patterns: spending spikes, category trends, burnout day
3. Extracts closing balance from raw PDF text (or via regex: "Baki Akhir", "Closing Balance")
4. Falls back to GPT-4o, then rule-based estimation
5. Result saved to Supabase and displayed on home page + dashboard

### AI-Generated Features

- **Financial Health Score** (0-100): computed from income/expense ratio with burnout penalty
- **Daily Safe Limit**: `(income - fixed expenses - subscriptions - paylater - other) / 30`
- **Burnout Day**: predicted day of month when money runs out
- **Spending Trend**: month-over-month direction with percentage
- **Category Trends**: per-category spending tracked across months
- **Personalized Tips**: 3 actionable recommendations based on actual spending data

## Setup

### Prerequisites

- [Supabase](https://supabase.com) account (PostgreSQL + Storage)
- [Vercel](https://vercel.com) account (hosting)
- Node.js 18+ and npm
- Python 3.12+

### 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run:
   ```sql
   -- Run init_tables.sql to create all tables
   -- Then add the burnout prediction column:
   ALTER TABLE financial_setups ADD COLUMN IF NOT EXISTS burnout_prediction JSONB;
   ```
3. Go to **Authentication** > Providers > enable **Email** (disable "Confirm email" for MVP)
4. Go to **Storage** > create a public bucket named `receipts`
5. Note your **Project URL**, **anon key**, and **service_role key** (Settings > API)

### 2. Backend

```bash
cd backend
cp .env.example .env   # fill in Supabase keys and API keys
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Required environment variables:**

| Variable | Description |
|---|---|
| `SUPABASE_URL` | `https://<project>.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `SUPABASE_BUCKET` | `receipts` |
| `DEEPSEEK_API_KEY` | DeepSeek API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `GEMINI_API_KEY` | Google Gemini API key |

Deploy:
```bash
vercel --prod
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # fill in Supabase keys and API base URL
npm install
npm run dev
```

**Required environment variables:**

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend URL (e.g. `http://localhost:8000` or Vercel URL) |
| `VITE_SUPABASE_URL` | `https://<project>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |

Deploy:
```bash
vercel --prod
```

### 4. Verify

```bash
curl https://<backend-url>/api/health
# {"status": "ok", "version": "1.0.0"}
```

Open the frontend URL, enter a username, set a budget under Settings, and you're ready to go.

## Database Schema

| Table | Purpose |
|---|---|
| `users` | User accounts (username-based) |
| `missions` | Created missions: bank or photo verification, with rules, dates, rewards |
| `financial_setups` | User budget settings + burnout prediction (JSONB) |
| `transactions` | Parsed bank transactions linked to missions |
| `evaluations` | AI evaluation results: verdict, scores, recommendations |
