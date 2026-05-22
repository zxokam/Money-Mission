from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import missions, financial_setup, transactions, evaluation, uploads, users

app = FastAPI(
    title="MoneyMission AI",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8000",
        "https://ahmedzaid.xyz",
        "https://www.ahmedzaid.xyz",
        "https://moneymission.vercel.app",
        "https://moneymission-ai.vercel.app",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(missions.router)
app.include_router(financial_setup.router)
app.include_router(transactions.router)
app.include_router(evaluation.router)
app.include_router(uploads.router)
app.include_router(users.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/api/ai-status")
def ai_status():
    """Test connectivity to both Gemini and DeepSeek APIs."""
    from .config import GEMINI_API_KEY, DEEPSEEK_API_KEY
    import httpx

    result = {"gemini": "not_configured", "deepseek": "not_configured"}

    if GEMINI_API_KEY:
        try:
            resp = httpx.post(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
                params={"key": GEMINI_API_KEY},
                json={
                    "contents": [{"parts": [{"text": "Reply with just the word OK."}]}],
                    "generationConfig": {"maxOutputTokens": 10},
                },
                timeout=15,
            )
            if resp.status_code == 200:
                body = resp.json()
                text = body.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                result["gemini"] = "ok" if "OK" in text else f"unexpected: {text[:80]}"
            elif resp.status_code == 429:
                result["gemini"] = "quota_exhausted"
            else:
                result["gemini"] = f"error_{resp.status_code}"
        except Exception as e:
            result["gemini"] = f"exception: {str(e)[:80]}"

    if DEEPSEEK_API_KEY:
        try:
            resp = httpx.post(
                "https://api.deepseek.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "deepseek-chat",
                    "messages": [{"role": "user", "content": "Reply with just the word OK."}],
                    "max_tokens": 10,
                },
                timeout=15,
            )
            if resp.status_code == 200:
                body = resp.json()
                text = body.get("choices", [{}])[0].get("message", {}).get("content", "")
                result["deepseek"] = "ok" if "OK" in text else f"unexpected: {text[:80]}"
            elif resp.status_code == 429:
                result["deepseek"] = "rate_limited"
            else:
                result["deepseek"] = f"error_{resp.status_code}"
        except Exception as e:
            result["deepseek"] = f"exception: {str(e)[:80]}"

    return result


@app.post("/api/debug-create-mission")
def debug_create_mission():
    """Debug endpoint: create a test mission and return raw result."""
    import urllib.request
    import json
    from .config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
    import traceback

    REST_URL = f"{SUPABASE_URL}/rest/v1"
    HEADERS = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    data = json.dumps({
        "title": "Debug Mission",
        "sponsor_name": "Alice",
        "participant_name": "Bob",
        "reward_amount": 20,
        "target_improvement_percentage": 10,
        "start_date": "2026-05-17",
        "end_date": "2026-06-17",
        "verification_method": "bank",
        "expire_days": 15,
        "status": "pending",
    }).encode("utf-8")

    url = f"{REST_URL}/missions"
    req = urllib.request.Request(url, data=data, headers=HEADERS, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8")
            return {
                "status_code": resp.status,
                "headers": dict(resp.headers),
                "body": raw,
                "body_len": len(raw),
            }
    except urllib.error.HTTPError as e:
        err_body = ""
        try:
            err_body = e.read().decode("utf-8")
        except Exception:
            pass
        return {
            "error": True,
            "status_code": e.code,
            "headers": dict(e.headers) if hasattr(e, 'headers') else {},
            "body": err_body,
        }
