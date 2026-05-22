import datetime
from fastapi import APIRouter, HTTPException
from .. import supabase_client as db
from ..schemas import FinancialSetupCreate

router = APIRouter(prefix="/api/missions", tags=["financial-setup"])


def _compute_totals(payload: FinancialSetupCreate, mission_days: int) -> dict:
    required = (
        payload.fixedExpenses
        + payload.subscriptions
        + payload.payLater
        + payload.transport
        + payload.otherExpenses
        + payload.foodPerDay * mission_days
    )
    leftover = payload.income - required
    safe_daily = round(leftover / mission_days, 2) if mission_days > 0 else 0
    score = 62
    if leftover > 0:
        score = min(100, 60 + round((leftover / payload.income) * 40))
    return {
        "required_expenses": round(required, 2),
        "expected_leftover": round(leftover, 2),
        "safe_daily_spending": max(0, safe_daily),
        "baseline_financial_score": score,
    }


def _setup_out(s: dict) -> dict:
    return {
        "id": s["id"],
        "mission_id": s["mission_id"],
        "monthly_income": s.get("monthly_income", 0),
        "fixed_expenses": s.get("fixed_expenses", 0),
        "subscriptions": s.get("subscriptions", 0),
        "paylater_commitments": s.get("paylater_commitments", 0),
        "average_food_per_day": s.get("average_food_per_day", 0),
        "transport_cost": s.get("transport_cost", 0),
        "other_required_expenses": s.get("other_required_expenses", 0),
        "required_expenses": s.get("required_expenses", 0),
        "expected_leftover": s.get("expected_leftover", 0),
        "safe_daily_spending": s.get("safe_daily_spending", 0),
        "baseline_financial_score": s.get("baseline_financial_score", 60),
        "healthScore": s.get("baseline_financial_score", 60),
        "safeDailyLimit": s.get("safe_daily_spending", 0),
        "income": s.get("monthly_income", 0),
        "created_at": str(s.get("created_at", "")),
    }


@router.post("/{mission_id}/financial-setup")
def create_financial_setup(mission_id: int, payload: FinancialSetupCreate):
    mission = db.get_mission(mission_id)
    if not mission:
        raise HTTPException(404, "Mission not found")

    start = mission.get("start_date")
    end = mission.get("end_date")
    if isinstance(start, str) and isinstance(end, str):
        days = (datetime.date.fromisoformat(end) - datetime.date.fromisoformat(start)).days or 30
    else:
        days = 30
    totals = _compute_totals(payload, days)

    data = {
        "monthly_income": payload.income,
        "fixed_expenses": payload.fixedExpenses,
        "subscriptions": payload.subscriptions,
        "paylater_commitments": payload.payLater,
        "average_food_per_day": payload.foodPerDay,
        "transport_cost": payload.transport,
        "other_required_expenses": payload.otherExpenses,
        "required_expenses": totals["required_expenses"],
        "expected_leftover": totals["expected_leftover"],
        "safe_daily_spending": totals["safe_daily_spending"],
        "baseline_financial_score": totals["baseline_financial_score"],
    }
    setup = db.upsert_financial_setup(mission_id, data)
    return _setup_out(setup)


@router.get("/{mission_id}/financial-setup")
def get_financial_setup(mission_id: int):
    setup = db.get_financial_setup(mission_id)
    if not setup:
        raise HTTPException(404, "Financial setup not found")
    return _setup_out(setup)
