# MoneyMission AI

Social finance challenges. Friends create missions, AI verifies financial improvement.

## Project Structure

```
root/
  frontend/    React + Vite SPA
  backend/     Python FastAPI (Vercel serverless)
```

## Prerequisites

- [Supabase](https://supabase.com) account (Auth + Storage)
- [Vercel](https://vercel.com) account (hosting)
- MySQL 8+ database (PlanetScale, Railway, or any managed MySQL)

## 1. Create MySQL Database

Create a MySQL 8+ database and run the schema:

```bash
mysql -h <host> -u <user> -p <database> < backend/schema.sql
```

Optionally seed demo data:

```bash
mysql -h <host> -u <user> -p <database> < backend/seed.sql
```

## 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Note your **Project URL** and **anon key** (Settings > API)
3. Generate a **service_role key** (Settings > API)

### Auth

1. Go to Authentication > Providers
2. Enable **Email** provider (disable "Confirm email" for hackathon MVP)

### Storage

1. Go to Storage, create a new bucket named `receipts`
2. Set as **public bucket**

## 3. Deploy Backend to Vercel

```bash
cd backend
vercel --prod
```

Or via Vercel dashboard — import project, root directory `backend/`, framework **Other**.

### Backend Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string `mysql+pymysql://user:pass@host:3306/db` |
| `SUPABASE_URL` | `https://<project>.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `SUPABASE_BUCKET` | `receipts` |

## 4. Deploy Frontend to Vercel

```bash
cd frontend
vercel --prod
```

Or via Vercel dashboard — import project, root directory `frontend/`, framework **Vite**.

### Frontend Environment Variables

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend URL (e.g. `https://backend-xxx.vercel.app`) |
| `VITE_SUPABASE_URL` | `https://<project>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |

## 5. Verify Deployment

```bash
# Health check
curl https://<backend-url>/api/health

# API docs
open https://<backend-url>/api/docs
```

Expected response:

```json
{"status": "ok", "version": "1.0.0"}
```

## Local Development

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # edit .env for local URLs
npm run dev
```

Frontend starts on `http://localhost:5173`, proxying API calls to `http://localhost:8000`.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4, Recharts |
| Backend | FastAPI, Python 3.12+ |
| Auth | Supabase Auth (GoTrue) |
| Storage | Supabase Storage (receipts) |
| Database | MySQL 8+ |
| Hosting | Vercel (frontend + backend serverless) |

## AI Tools Used

| AI Model | Purpose | Priority |
|---|---|---|
| OpenAI GPT-4o | Photo verification with vision — inspects receipt/photo diary images to validate mission compliance | Primary (photo missions) |
| Google Gemini 2.0 Flash | Financial evaluation — analyzes spending patterns, calculates improvement, generates verdicts and recommendations | Primary (text) |
| DeepSeek Chat | Secondary fallback for financial evaluation if Gemini is unavailable | Fallback |

The evaluation pipeline chains: **GPT-4o** (with vision) → **Gemini** → **DeepSeek** → rule-based fallback. Photo missions with uploaded receipts/images use GPT-4o's vision capabilities first; text-only bank transaction evaluations use Gemini as the primary model.
