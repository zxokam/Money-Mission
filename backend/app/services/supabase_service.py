import uuid
import httpx
from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, SUPABASE_BUCKET

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "application/pdf"}


def _storage_headers(content_type: str = None) -> dict:
    h = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "x-upsert": "true",
    }
    if content_type:
        h["Content-Type"] = content_type
    return h


def _auth_headers(token: str = None) -> dict:
    h = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


# ── Storage ──────────────────────────────────────────────────

def upload_receipt_to_supabase(file_bytes: bytes, filename: str, content_type: str = "image/jpeg") -> str | None:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return None

    ext = filename.rsplit(".", 1)[-1] if "." in filename else "jpg"
    unique_name = f"{uuid.uuid4().hex}.{ext}"

    try:
        resp = httpx.post(
            f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{unique_name}",
            headers=_storage_headers(content_type),
            content=file_bytes,
            timeout=30,
        )
        resp.raise_for_status()

        return f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{unique_name}"

    except httpx.HTTPStatusError as e:
        print(f"Supabase upload error [{e.response.status_code}]: {e.response.text}")
        return None
    except Exception as e:
        print(f"Supabase upload error: {e}")
        return None


# ── Auth ─────────────────────────────────────────────────────

def signup(email: str, password: str) -> dict:
    resp = httpx.post(
        f"{SUPABASE_URL}/auth/v1/signup",
        headers=_auth_headers(),
        json={"email": email, "password": password},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def login(email: str, password: str) -> dict:
    resp = httpx.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers=_auth_headers(),
        json={"email": email, "password": password},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def logout(token: str) -> None:
    httpx.post(
        f"{SUPABASE_URL}/auth/v1/logout",
        headers=_auth_headers(token),
        timeout=15,
    ).raise_for_status()


def get_user(token: str) -> dict:
    resp = httpx.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers=_auth_headers(token),
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()
