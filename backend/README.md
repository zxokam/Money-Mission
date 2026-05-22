# MoneyMission AI — Backend

FastAPI + MySQL + Supabase backend for the MoneyMission AI social finance challenge app.

## Quick Start

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your MySQL and Supabase credentials
uvicorn app.main:app --reload
```

API docs at `http://localhost:8000/api/docs`

## Seed Data

```bash
python -m app.seed
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/missions` | Create a mission |
| GET | `/api/missions` | List all missions |
| GET | `/api/missions/{id}` | Get a mission |
| PATCH | `/api/missions/{id}` | Update mission status |
| POST | `/api/missions/{id}/financial-setup` | Set monthly budget |
| GET | `/api/missions/{id}/financial-setup` | Get budget |
| POST | `/api/missions/{id}/transactions` | Submit transactions |
| GET | `/api/missions/{id}/transactions` | List transactions |
| GET | `/api/missions/{id}/transactions/summary` | Spending summary |
| POST | `/api/missions/{id}/evaluate` | Run AI evaluation |
| GET | `/api/missions/{id}/evaluation` | Get evaluation result |
| POST | `/api/uploads/receipt` | Upload receipt to Supabase |

## Deploy to Vercel

```
vercel deploy
```

Make sure to set all environment variables in the Vercel dashboard.
