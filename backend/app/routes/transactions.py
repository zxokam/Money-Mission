from collections import defaultdict
from typing import List
from fastapi import APIRouter, HTTPException
from .. import supabase_client as db
from ..schemas import TransactionCreate

router = APIRouter(prefix="/api/missions", tags=["transactions"])


def _tx_out(tx: dict) -> dict:
    return {
        "id": tx["id"],
        "mission_id": tx["mission_id"],
        "name": tx["name"],
        "amount": tx["amount"],
        "category": tx.get("category", "Others"),
        "transaction_date": str(tx.get("transaction_date", "")),
        "receipt_url": tx.get("receipt_url"),
    }


@router.post("/{mission_id}/transactions")
def add_transactions(mission_id: int, payload: List[TransactionCreate]):
    mission = db.get_mission(mission_id)
    if not mission:
        raise HTTPException(404, "Mission not found")

    count = 0
    for item in payload:
        data = {
            "mission_id": mission_id,
            "name": item.name,
            "amount": item.amount,
            "category": item.category,
            "transaction_date": item.transactionDate,
            "receipt_url": item.receiptUrl,
        }
        db.create_transaction(data)
        count += 1
    return {"success": True, "count": count}


@router.get("/{mission_id}/transactions")
def list_transactions(mission_id: int):
    txs = db.list_transactions(mission_id)
    return [_tx_out(t) for t in txs]


@router.get("/{mission_id}/transactions/summary")
def transaction_summary(mission_id: int):
    txs = db.list_transactions(mission_id)
    total = sum(t["amount"] for t in txs)
    cats = defaultdict(float)
    for t in txs:
        cats[t.get("category", "Others")] += t["amount"]
    return {
        "total_spent": round(total, 2),
        "transaction_count": len(txs),
        "by_category": {k: round(v, 2) for k, v in sorted(cats.items(), key=lambda x: -x[1])},
    }
