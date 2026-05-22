import urllib.request
import json
from .config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

REST_URL = f"{SUPABASE_URL}/rest/v1"
HEADERS = {
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
}


def _request(method: str, path: str, body: dict = None, params: dict = None, extra_headers: dict = None) -> dict | list | None:
    """Make a request to Supabase REST API using urllib (no external deps)."""
    url = f"{REST_URL}/{path}"
    if params:
        qs = "&".join(f"{k}={v}" for k, v in params.items())
        url += f"?{qs}"

    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")

    hdrs = dict(HEADERS)
    if extra_headers:
        hdrs.update(extra_headers)

    req = urllib.request.Request(url, data=data, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8")
            status = resp.status
    except urllib.error.HTTPError as e:
        if e.code in (404, 406):
            return None
        raw = ""
        try:
            raw = e.read().decode("utf-8")
        except Exception:
            pass
        raise RuntimeError(f"Supabase {method} {path} failed [{e.code}]: {raw}")

    if not raw or not raw.strip():
        return [] if method in ("GET", "DELETE") else None
    return json.loads(raw)


def _row(resp) -> dict | None:
    if resp is None:
        return None
    if isinstance(resp, list):
        return resp[0] if resp else None
    return resp


def _rows(resp) -> list[dict]:
    if resp is None:
        return []
    if isinstance(resp, list):
        return resp
    return [resp] if resp else []


# ── Users ──────────────────────────────────────────────────

def get_user_by_email(email: str) -> dict | None:
    return _row(_request("GET", "users", params={"email": f"eq.{email}", "limit": "1"}))


def get_user_by_username(username: str) -> dict | None:
    return _row(_request("GET", "users", params={"username": f"eq.{username}", "limit": "1"}))


def get_user_by_id(user_id: int) -> dict | None:
    return _row(_request("GET", "users", params={"id": f"eq.{user_id}"}))


def create_user(name: str, email: str) -> dict:
    return _request("POST", "users", body={"name": name, "email": email}, extra_headers={"Prefer": "return=representation"})[0]


def create_user_by_username(username: str) -> dict:
    return _request("POST", "users", body={"name": username, "username": username, "email": f"{username}@user.local"}, extra_headers={"Prefer": "return=representation"})[0]


def update_user(user_id: int, data: dict) -> dict:
    return _request("PATCH", "users", body=data, params={"id": f"eq.{user_id}"}, extra_headers={"Prefer": "return=representation"})[0]


# ── Missions ───────────────────────────────────────────────

def list_missions(user_id: int | None = None) -> list[dict]:
    params = {"order": "created_at.desc"}
    if user_id is not None:
        params["accepted_by"] = f"eq.{user_id}"
        # Only show active or pending missions (not completed/failed)
        params["status"] = "in.(pending,active)"
    return _rows(_request("GET", "missions", params=params))


def list_available_missions() -> list[dict]:
    params = {"accepted_by": "is.null", "status": "eq.pending", "order": "created_at.desc"}
    return _rows(_request("GET", "missions", params=params))


def get_mission(mission_id: int) -> dict | None:
    return _row(_request("GET", "missions", params={"id": f"eq.{mission_id}"}))


def create_mission(data: dict) -> dict:
    return _request("POST", "missions", body=data, extra_headers={"Prefer": "return=representation"})[0]


def update_mission(mission_id: int, data: dict) -> dict | None:
    return _row(_request("PATCH", "missions", body=data, params={"id": f"eq.{mission_id}"}, extra_headers={"Prefer": "return=representation"}))


def delete_mission(mission_id: int) -> None:
    _request("DELETE", "missions", params={"id": f"eq.{mission_id}"})


# ── Financial Setup ────────────────────────────────────────

def get_financial_setup(mission_id: int) -> dict | None:
    return _row(_request("GET", "financial_setups", params={"mission_id": f"eq.{mission_id}"}))


def upsert_financial_setup(mission_id: int, data: dict) -> dict:
    existing = get_financial_setup(mission_id)
    if existing:
        return _request("PATCH", "financial_setups", body=data, params={"id": f"eq.{existing['id']}"}, extra_headers={"Prefer": "return=representation"})[0]
    else:
        data = {**data, "mission_id": mission_id}
        return _request("POST", "financial_setups", body=data, extra_headers={"Prefer": "return=representation"})[0]


def get_user_settings(user_id: int) -> dict | None:
    return _row(_request("GET", "financial_setups", params={"user_id": f"eq.{user_id}", "order": "created_at.desc", "limit": "1"}))


def upsert_user_settings(user_id: int, data: dict) -> dict:
    existing = get_user_settings(user_id)
    if existing:
        return _request("PATCH", "financial_setups", body=data, params={"id": f"eq.{existing['id']}"}, extra_headers={"Prefer": "return=representation"})[0]
    else:
        data = {**data, "user_id": user_id}
        return _request("POST", "financial_setups", body=data, extra_headers={"Prefer": "return=representation"})[0]


# ── Transactions ───────────────────────────────────────────

def list_transactions(mission_id: int) -> list[dict]:
    return _rows(_request("GET", "transactions", params={
        "mission_id": f"eq.{mission_id}",
        "order": "transaction_date.desc",
    }))


def create_transaction(data: dict) -> dict:
    return _request("POST", "transactions", body=data, extra_headers={"Prefer": "return=representation"})[0]


def delete_transaction(transaction_id: int) -> None:
    _request("DELETE", "transactions", params={"id": f"eq.{transaction_id}"})


# ── Photo Diary Entries ────────────────────────────────────

def list_photo_entries(mission_id: int) -> list[dict]:
    return _rows(_request("GET", "photo_diary_entries", params={
        "mission_id": f"eq.{mission_id}",
        "order": "photo_date.asc",
    }))


def create_photo_entry(data: dict) -> dict:
    return _request("POST", "photo_diary_entries", body=data, extra_headers={"Prefer": "return=representation"})[0]


def delete_photo_entries(mission_id: int, photo_date: str) -> None:
    _request("DELETE", "photo_diary_entries", params={
        "mission_id": f"eq.{mission_id}",
        "photo_date": f"eq.{photo_date}",
    })


# ── Evaluations ────────────────────────────────────────────

def get_evaluation(mission_id: int) -> dict | None:
    return _row(_request("GET", "evaluations", params={"mission_id": f"eq.{mission_id}"}))


def upsert_evaluation(mission_id: int, data: dict) -> dict:
    existing = get_evaluation(mission_id)
    if existing:
        return _request("PATCH", "evaluations", body=data, params={"id": f"eq.{existing['id']}"}, extra_headers={"Prefer": "return=representation"})[0]
    else:
        data = {**data, "mission_id": mission_id}
        return _request("POST", "evaluations", body=data, extra_headers={"Prefer": "return=representation"})[0]
