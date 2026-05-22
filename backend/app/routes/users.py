from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from .. import supabase_client as db
from ..schemas import FinancialSetupCreate

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

    settings = {"income": 0, "safeDailyLimit": 0, "healthScore": 60}
    if s:
        settings = {
            "income": s.get("monthly_income", 0),
            "safeDailyLimit": s.get("safe_daily_spending", 0),
            "healthScore": s.get("baseline_financial_score", 60),
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
    return {
        "income": s.get("monthly_income", 0),
        "safeDailyLimit": s.get("safe_daily_spending", 0),
        "healthScore": s.get("baseline_financial_score", 60),
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
