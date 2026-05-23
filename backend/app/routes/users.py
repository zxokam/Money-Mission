import io
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from .. import supabase_client as db
from ..schemas import FinancialSetupCreate
from ..config import DEEPSEEK_API_KEY, OPENAI_API_KEY
from .uploads import _extract_pdf_text, _clean_bank_text, _parse_transactions_with_ai, _clean_json_response
import httpx
import json
import re

router = APIRouter(prefix="/api/users", tags=["users"])


class LoginBody(BaseModel):
    username: str


@router.post("/login")
def login(body: LoginBody):
    username = body.username.strip()
    if not username:
        raise HTTPException(400, "Username required")

    user = db.get_user_by_username(username)
    if not user:
        old = db.get_user_by_email(f"{username}@user.local")
        if old:
            user = db.update_user(old["id"], {"username": username})
        else:
            user = db.create_user_by_username(username)
    return {"id": user["id"], "username": user.get("username", user.get("name", username))}


@router.get("/{user_id}")
def get_user(user_id: int):
    user = db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return {"id": user["id"], "username": user.get("username", user.get("name", ""))}


@router.get("/{user_id}/dashboard")
def get_dashboard(user_id: int):
    """Combined dashboard data: settings + my missions + available missions."""
    from concurrent.futures import ThreadPoolExecutor

    with ThreadPoolExecutor(max_workers=3) as pool:
        fut_settings = pool.submit(db.get_user_settings, user_id)
        fut_my = pool.submit(db.list_missions, user_id=user_id)
        fut_avail = pool.submit(db.list_available_missions)

        s = fut_settings.result()
        my_missions = fut_my.result()
        available = fut_avail.result()

    settings = {"income": 0, "safeDailyLimit": 0, "healthScore": 60, "burnoutPrediction": None}
    if s:
        burnout = None
        raw_burnout = s.get("burnout_prediction")
        if raw_burnout:
            try:
                burnout = json.loads(raw_burnout) if isinstance(raw_burnout, str) else raw_burnout
            except Exception:
                pass
        settings = {
            "income": s.get("monthly_income", 0),
            "safeDailyLimit": s.get("safe_daily_spending", 0),
            "healthScore": s.get("baseline_financial_score", 60),
            "burnoutPrediction": burnout,
        }

    def fmt(m):
        import datetime
        end = m.get("end_date", "")
        if isinstance(end, str) and end:
            delta = (datetime.date.fromisoformat(end) - datetime.date.today()).days
        else:
            delta = 0
        return {
            "id": m["id"],
            "title": m["title"],
            "sponsor_name": m["sponsor_name"],
            "participant_name": m["participant_name"],
            "reward_amount": m.get("reward_amount", 0),
            "target_improvement_percentage": m.get("target_improvement_percentage", 10),
            "start_date": str(m.get("start_date", "")),
            "end_date": str(end),
            "rules": m.get("rules"),
            "status": m.get("status", "pending"),
            "verification_method": m.get("verification_method", "bank"),
            "photo_subject": m.get("photo_subject"),
            "photo_frequency": m.get("photo_frequency", "daily"),
            "total_photos_required": m.get("total_photos_required", 0),
            "expire_days": m.get("expire_days", 15),
            "days_left": max(0, delta),
            "created_at": str(m.get("created_at", "")),
        }

    return {
        "settings": settings,
        "my_missions": [fmt(m) for m in my_missions],
        "available_missions": [fmt(m) for m in available],
    }


@router.get("/{user_id}/settings")
def get_user_settings(user_id: int):
    s = db.get_user_settings(user_id)
    if not s:
        return {"income": 0, "safeDailyLimit": 0, "healthScore": 60}
    burnout = None
    raw_burnout = s.get("burnout_prediction")
    if raw_burnout:
        try:
            burnout = json.loads(raw_burnout) if isinstance(raw_burnout, str) else raw_burnout
        except Exception:
            pass
    return {
        "income": s.get("monthly_income", 0),
        "safeDailyLimit": s.get("safe_daily_spending", 0),
        "healthScore": s.get("baseline_financial_score", 60),
        "burnoutPrediction": burnout,
        "raw": s,
    }


class SettingsBody(BaseModel):
    income: float
    fixed_expenses: float = 0
    subscriptions: float = 0
    paylater_commitments: float = 0
    average_food_per_day: float = 0
    transport_cost: float = 0
    other_required_expenses: float = 0


@router.post("/{user_id}/settings")
def save_user_settings(user_id: int, body: SettingsBody):
    required = (
        body.fixed_expenses
        + body.subscriptions
        + body.paylater_commitments
        + body.transport_cost
        + body.other_required_expenses
        + body.average_food_per_day * 30
    )
    leftover = body.income - required
    safe_daily = round(leftover / 30, 2) if leftover > 0 else 0
    score = 62
    if leftover > 0:
        score = min(100, 60 + round((leftover / body.income) * 40))

    data = {
        "monthly_income": body.income,
        "fixed_expenses": body.fixed_expenses,
        "subscriptions": body.subscriptions,
        "paylater_commitments": body.paylater_commitments,
        "average_food_per_day": body.average_food_per_day,
        "transport_cost": body.transport_cost,
        "other_required_expenses": body.other_required_expenses,
        "required_expenses": round(required, 2),
        "expected_leftover": round(leftover, 2),
        "safe_daily_spending": max(0, safe_daily),
        "baseline_financial_score": score,
    }
    s = db.upsert_user_settings(user_id, data)
    return {
        "income": s.get("monthly_income", 0),
        "safeDailyLimit": s.get("safe_daily_spending", 0),
        "healthScore": s.get("baseline_financial_score", 60),
    }


# ── Spending Burnout Prediction ────────────────────────────

_SPENDING_PREDICTION_PROMPT = """You are a financial pattern analyst for a Malaysian student app. Analyze the spending data across multiple months and predict their financial behavior.

You are given transaction data from {month_count} different months of bank statements. Each month's data includes all money-out transactions (debits/spending only — deposits and salary are already excluded).

Your job:
1. Find PATTERNS — which dates of the month does spending spike? (e.g., "The 1st-3rd always have large transactions — likely rent/bills")
2. Find TRENDS — is spending going up or down across months? Which categories are growing?
3. Predict BURNOUT DATE — based on spending rate, estimate which day of a typical month they run out of money
4. Give 3 personalized, actionable tips based on their actual spending data

SPENDING DATA ACROSS {month_count} MONTHS:
{transactions_data}

Respond with ONLY valid JSON, no markdown, no extra text:
{{"highSpendDates": ["1st-3rd (bills/rent)", "15th (payday spending)", "25th-28th (running low)"], "burnoutRisk": "You typically run through 70% of your money by the 22nd of the month", "burnoutDay": 22, "categoryTrends": [{{"category": "Food", "trend": "up", "avgMonthly": 450, "detail": "Food spending increased 15% from Month 1 to Month 2"}}], "overallTrend": "Your total spending is trending upward (+8% month over month). Shopping is the fastest growing category.", "tips": ["Tip 1 based on their actual data", "Tip 2", "Tip 3"], "summary": "2-3 sentence overview of financial health across months"}}"""


async def _call_ai_for_prediction(prompt: str) -> dict | None:
    """Try DeepSeek first, then OpenAI for spending prediction."""
    # Try DeepSeek
    if DEEPSEEK_API_KEY:
        try:
            resp = httpx.post(
                "https://api.deepseek.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "deepseek-chat",
                    "messages": [
                        {"role": "system", "content": "You are a sharp financial analyst. Output only valid JSON, no markdown."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 1200,
                },
                timeout=45,
            )
            resp.raise_for_status()
            text = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            text = text.strip()
            if text.startswith("```"): text = text.split("\n", 1)[-1]
            if text.endswith("```"): text = text[:-3]
            if text.startswith("json"): text = text[4:]
            result = json.loads(text.strip())
            if isinstance(result, dict) and "tips" in result:
                return result
        except Exception:
            pass

    # Try OpenAI fallback
    if OPENAI_API_KEY:
        try:
            resp = httpx.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "gpt-4o",
                    "messages": [
                        {"role": "system", "content": "You are a sharp financial analyst. Output only valid JSON, no markdown."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 1200,
                },
                timeout=45,
            )
            resp.raise_for_status()
            text = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            text = text.strip()
            if text.startswith("```"): text = text.split("\n", 1)[-1]
            if text.endswith("```"): text = text[:-3]
            if text.startswith("json"): text = text[4:]
            result = json.loads(text.strip())
            if isinstance(result, dict) and "tips" in result:
                return result
        except Exception:
            pass

    return None


@router.post("/{user_id}/spending-prediction")
async def predict_spending(user_id: int, files: list[UploadFile] = File(...)):
    if len(files) < 2:
        raise HTTPException(400, "At least 2 bank statement PDFs required for pattern analysis")

    all_months = []

    for idx, file in enumerate(files):
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(400, f"File '{file.filename}' is not a PDF")

        contents = await file.read()
        if not contents:
            raise HTTPException(400, f"File '{file.filename}' is empty")

        raw_text = _extract_pdf_text(contents)
        has_text = bool(raw_text and raw_text.strip())

        if has_text:
            text = _clean_bank_text(raw_text)
            transactions = await _parse_transactions_with_ai(text) if text and text.strip() else None
        else:
            # Try vision fallback for scanned PDFs
            from .uploads import _parse_pdf_with_vision
            transactions = await _parse_pdf_with_vision(contents)

        month_label = f"Month {idx + 1}"
        # Try to extract month from filename or transactions
        if transactions:
            dates = [t.get("transactionDate", "") for t in transactions if t.get("transactionDate")]
            if dates:
                dates.sort()
                month_label = f"{dates[0]} to {dates[-1]}"
        else:
            month_label = f"Month {idx + 1} ({file.filename})"

        all_months.append({
            "label": month_label,
            "filename": file.filename,
            "transactionCount": len(transactions) if transactions else 0,
            "transactions": transactions or [],
        })

    # Check we have enough data
    total_txns = sum(m["transactionCount"] for m in all_months)
    if total_txns < 5:
        raise HTTPException(400, "Not enough transactions found across the PDFs. Try different bank statements with more transaction data.")

    # Build prompt with all months' transactions
    tx_parts = []
    for m in all_months:
        tx_parts.append(f"\n─── {m['label']} ({m['filename']}) ───")
        if m["transactions"]:
            for t in m["transactions"]:
                tx_parts.append(f"  {t.get('transactionDate', '?')} | {t.get('name', '?')} | RM{t.get('amount', 0):.2f} | {t.get('category', 'Others')}")
        else:
            tx_parts.append("  (No transactions extracted)")

    prompt = _SPENDING_PREDICTION_PROMPT.format(
        month_count=len(all_months),
        transactions_data="\n".join(tx_parts)[:10000],
    )

    ai_result = await _call_ai_for_prediction(prompt)

    if not ai_result:
        # Rule-based fallback
        ai_result = _rule_based_prediction(all_months)

    # Save prediction to DB so it persists and shows on dashboard
    if ai_result:
        try:
            db.upsert_user_settings(user_id, {"burnout_prediction": json.dumps(ai_result)})
        except Exception:
            pass

    return {
        "prediction": ai_result,
        "months": [{"label": m["label"], "filename": m["filename"], "transactionCount": m["transactionCount"]} for m in all_months],
    }


def _rule_based_prediction(months: list) -> dict:
    """Fallback prediction when AI is unavailable."""
    total = sum(m["transactionCount"] for m in months)
    month_labels = [m["label"] for m in months]

    all_cats = {}
    for m in months:
        for t in m.get("transactions", []):
            cat = t.get("category", "Others")
            all_cats[cat] = all_cats.get(cat, 0) + t.get("amount", 0)

    top_cats = sorted(all_cats.items(), key=lambda x: -x[1])[:3]

    return {
        "highSpendDates": ["1st-5th (start of month bills)", "15th-20th (mid-month)", "25th-31st (end of month)"],
        "burnoutRisk": f"Based on {total} transactions across {len(months)} months, track your spending daily to avoid running out.",
        "burnoutDay": 20,
        "categoryTrends": [{"category": c, "trend": "steady", "avgMonthly": round(a / len(months), 2), "detail": f"RM{a:.2f} total across {len(months)} months"} for c, a in top_cats],
        "overallTrend": f"Analyzed {total} transactions across {len(months)} months. Set up your budget in the section above for more accurate predictions.",
        "tips": ["Track daily spending against your safe daily limit", "Review subscriptions — cancel unused ones", "Set aside money for bills right after payday"],
        "summary": f"Analyzed {total} transactions from {', '.join(month_labels)}. Top spending: {', '.join(f'{c} (RM{a:.0f})' for c, a in top_cats)}. Complete your budget above for personalized AI predictions.",
    }
