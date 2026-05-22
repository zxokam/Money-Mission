import json
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from .. import supabase_client as db
from ..services.ai_evaluation_service import run_ai_evaluation


class EvaluateBody(BaseModel):
    photo_diary: Optional[dict] = None


router = APIRouter(prefix="/api/missions", tags=["evaluation"])


def _eval_out(e: dict, mission: dict) -> dict:
    breakdown = e.get("category_breakdown")
    if isinstance(breakdown, str):
        breakdown = json.loads(breakdown)
    elif breakdown is None:
        breakdown = []
    status = e.get("status", "accepted")
    passed = status == "accepted"

    # Verdict comes from the AI comment — full stop.
    # If the comment concludes success → Approved. If it concludes failure → Rejected.
    expl = (e.get("ai_explanation") or "").lower()
    is_approved = any(w in expl for w in [
        "well done", "great effort", "great job", "congratulations",
        "earned the", "you've earned", "keep up", "successfully",
        "matches", "clearly shows", "good habit", "excellent",
        "passed", "approved", "mission complete",
    ])
    is_rejected = any(w in expl for w in [
        "does not match", "doesn't match", "wrong subject",
        "did not pass", "did not meet", "fell short", "failed",
        "not accepted", "rejected", "does not show",
    ])
    if is_approved and not is_rejected:
        passed = True
        status = "accepted"
    elif is_rejected:
        passed = False
        status = "rejected"

    return {
        "id": e["id"],
        "mission_id": e["mission_id"],
        "status": "completed" if passed else "failed",
        "ai_verdict": "accepted" if passed else "rejected",
        "expected_leftover": e.get("expected_leftover", 0),
        "actual_total_spending": e.get("actual_total_spending", 0),
        "actual_leftover": e.get("actual_leftover", 0),
        "improvement_percentage": e.get("improvement_percentage", 0),
        "target_improvement_percentage": e.get("target_improvement_percentage", 10),
        "final_financial_score": e.get("final_financial_score", 60),
        "score_change": e.get("score_change", 0),
        "reward_unlocked": bool(e.get("reward_unlocked", 0)),
        "reward": mission.get("reward_amount", 0) if e.get("reward_unlocked", 0) else 0,
        "ai_explanation": e.get("ai_explanation") or "",
        "reason": e.get("reason") or "",
        "observed": e.get("observed", "") or "",
        "verdict_reason": e.get("ai_explanation") or "",
        "recommendations": e.get("recommendations", []),
        "passed_checks": e.get("passed_checks", [
            {"label": "Financial improvement target met", "result": passed},
            {"label": "Essential expenses covered", "result": e.get("actual_leftover", 0) > 0},
        ]),
        "category_breakdown": breakdown,
        "non_essential_spending": e.get("non_essential_spending", 0),
        "essential_spending": e.get("essential_spending", 0),
        "health_history": e.get("health_history", [
            {"month": "May", "score": e.get("final_financial_score", 60)},
        ]),
        "created_at": str(e.get("created_at", "")),
    }


@router.post("/{mission_id}/evaluate")
def evaluate_mission(mission_id: int, body: EvaluateBody = EvaluateBody()):
    mission = db.get_mission(mission_id)
    if not mission:
        raise HTTPException(404, "Mission not found")

    setup = db.get_financial_setup(mission_id)
    photo_diary = body.photo_diary

    # Photo missions don't need financial setup — use defaults
    if photo_diary and not setup:
        setup = {"expected_leftover": 0, "baseline_financial_score": 60, "monthly_income": 0, "required_expenses": 0}

    if not setup:
        raise HTTPException(400, "Financial setup required before evaluation")

    txs = db.list_transactions(mission_id)

    # Allow photo missions without transactions
    if not txs and not photo_diary:
        raise HTTPException(400, "No transactions found for this mission")

    # Load actual photo URLs for AI vision inspection
    photo_urls = []
    if photo_diary:
        entries = db.list_photo_entries(mission_id)
        photo_urls = [e["photo_url"] for e in entries]

    # Convert dict data to objects the ai_evaluation_service expects
    import datetime as dt
    from types import SimpleNamespace

    start_str = mission.get("start_date", "2026-05-01")
    end_str = mission.get("end_date", "2026-05-31")
    if isinstance(start_str, str):
        start_date = dt.date.fromisoformat(start_str)
    else:
        start_date = start_str
    if isinstance(end_str, str):
        end_date = dt.date.fromisoformat(end_str)
    else:
        end_date = end_str

    m_obj = SimpleNamespace(
        id=mission["id"],
        title=mission.get("title", ""),
        participant_name=mission.get("participant_name", ""),
        rules=mission.get("rules", ""),
        reward_amount=mission.get("reward_amount", 0),
        target_improvement_percentage=mission.get("target_improvement_percentage", 10),
        start_date=start_date,
        end_date=end_date,
        photoSubject=mission.get("photo_subject", ""),
    )
    s_obj = SimpleNamespace(
        expected_leftover=setup.get("expected_leftover", 0),
        baseline_financial_score=setup.get("baseline_financial_score", 60),
        monthly_income=setup.get("monthly_income", 0),
        required_expenses=setup.get("required_expenses", 0),
    )
    t_objs = []
    for t in txs:
        t_objs.append(SimpleNamespace(
            amount=t["amount"],
            category=t.get("category", "Others"),
            name=t.get("name", ""),
        ))

    result = run_ai_evaluation(m_obj, s_obj, t_objs, photo_diary, photo_urls)

    eval_data = {
        "expected_leftover": result["expected_leftover"],
        "actual_total_spending": result["actual_total_spending"],
        "actual_leftover": result["actual_leftover"],
        "improvement_percentage": result["improvement_percentage"],
        "target_improvement_percentage": result["target_improvement_percentage"],
        "final_financial_score": result["final_financial_score"],
        "status": result["ai_verdict"],
        "ai_explanation": result["ai_explanation"],
        "reward_unlocked": 1 if result["reward_unlocked"] else 0,
        "category_breakdown": json.dumps(result["category_breakdown"]),
    }
    e = db.upsert_evaluation(mission_id, eval_data)

    # Enrich DB record with live evaluation fields not persisted
    e["reason"] = result.get("reason", "")
    e["recommendations"] = result["recommendations"]
    e["passed_checks"] = result["passed_checks"]
    e["non_essential_spending"] = result["non_essential_spending"]
    e["essential_spending"] = result["essential_spending"]
    e["health_history"] = result["health_history"]
    e["score_change"] = result["score_change"]

    # Update mission status
    new_status = "completed" if result["ai_verdict"] == "accepted" else "failed"
    db.update_mission(mission_id, {"status": new_status})

    return _eval_out(e, mission)


@router.get("/{mission_id}/evaluation")
def get_evaluation(mission_id: int):
    mission = db.get_mission(mission_id)
    if not mission:
        raise HTTPException(404, "Mission not found")

    e = db.get_evaluation(mission_id)
    if not e:
        raise HTTPException(404, "Evaluation not found")

    return _eval_out(e, mission)
