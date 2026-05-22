from fastapi import APIRouter, UploadFile, File, HTTPException
from ..services.supabase_service import upload_receipt_to_supabase
from ..config import DEEPSEEK_API_KEY
import httpx
import json
import io
import re

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "application/pdf"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}


@router.post("/receipt")
async def upload_receipt(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(400, "No file provided")

    ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Invalid file type '{ext}'. Allowed: jpg, jpeg, png, pdf")

    contents = await file.read()
    if not contents:
        raise HTTPException(400, "Empty file")

    url = upload_receipt_to_supabase(contents, file.filename, file.content_type or "image/jpeg")

    if not url:
        raise HTTPException(500, "Upload to storage failed")

    return {"receipt_url": url}


@router.post("/bank-statement")
async def upload_bank_statement(file: UploadFile = File(...)):
    """Upload a bank statement PDF, extract text, and parse transactions via AI."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "PDF file required")

    contents = await file.read()
    if not contents:
        raise HTTPException(400, "Empty file")

    # Extract text from PDF
    text = _extract_pdf_text(contents)
    if not text or not text.strip():
        raise HTTPException(400, "Could not extract text from PDF. The file may be scanned or image-based.")

    # Send to DeepSeek to parse transactions
    transactions = await _parse_transactions_with_ai(text)
    if not transactions:
        raise HTTPException(400, "AI could not parse transactions from the bank statement")

    return {"transactions": transactions, "raw_text_preview": text[:500]}


def _extract_pdf_text(pdf_bytes: bytes) -> str:
    """Extract text from PDF bytes using pypdf."""
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(pdf_bytes))
    pages = []
    for page in reader.pages:
        t = page.extract_text()
        if t:
            pages.append(t)
    return "\n".join(pages)


async def _parse_transactions_with_ai(text: str) -> list[dict]:
    """Send extracted bank statement text to DeepSeek and parse into transactions."""
    if not DEEPSEEK_API_KEY:
        return None

    prompt = f"""You are a Malaysian bank statement parser. Extract ALL transactions from the text below.

For each transaction, return:
- name: short description of what was purchased
- amount: positive number (RM)
- category: one of "Food", "Transport", "Shopping", "Entertainment", "Bills", "Subscription", "PayLater", "Others"
- transactionDate: date in YYYY-MM-DD format

Common Malaysian transaction categories:
- Food: restaurants, mamak, GrabFood, FoodPanda, groceries, kopitiam
- Transport: petrol, Touch n Go, Grab, MRT, parking, toll
- Shopping: Shopee, Lazada, mall purchases, retail
- Entertainment: Netflix, cinema, Spotify, Steam
- Bills: TNB, SYABAS, phone bill, internet, rent
- Subscription: Netflix, iCloud, Google, Spotify (recurring)
- PayLater: SPayLater, Atome, Grab PayLater

Respond with ONLY valid JSON array, no markdown, no extra text:
[{{"name": "...", "amount": 12.50, "category": "Food", "transactionDate": "2026-05-15"}}, ...]

BANK STATEMENT TEXT:
{text[:8000]}"""

    try:
        resp = httpx.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": "You are a precise bank statement parser. Output only valid JSON arrays, no markdown or extra text."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.1,
                "max_tokens": 2000,
            },
            timeout=30,
        )
        resp.raise_for_status()
        body = resp.json()
        content = body.get("choices", [{}])[0].get("message", {}).get("content", "")

        # Parse JSON from response
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[-1]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
        if content.startswith("json"):
            content = content[4:].strip()

        transactions = json.loads(content)
        if isinstance(transactions, list):
            return transactions
        return None

    except Exception as e:
        import traceback
        print(f"AI bank statement parsing error: {e}")
        traceback.print_exc()
        return None
