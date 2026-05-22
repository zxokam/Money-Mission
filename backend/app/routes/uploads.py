from fastapi import APIRouter, UploadFile, File, HTTPException
from ..services.supabase_service import upload_receipt_to_supabase
from ..config import DEEPSEEK_API_KEY, OPENAI_API_KEY
import httpx
import json
import io
import re
import base64

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

    # Step 1: Extract text from PDF
    text = _extract_pdf_text(contents)

    # Step 2a: If text-based, parse with AI (OpenAI → DeepSeek → fail)
    if text and text.strip():
        transactions = await _parse_transactions_with_ai(text)
        if transactions:
            return {"transactions": transactions, "raw_text_preview": text[:500]}

    # Step 2b: If no text or parsing failed, try GPT-4o vision on PDF pages
    if OPENAI_API_KEY:
        transactions = await _parse_pdf_with_vision(contents, file.filename)
        if transactions:
            return {"transactions": transactions, "method": "vision"}

    raise HTTPException(400, "AI could not extract transactions from this PDF. Make sure it's a text-based bank statement.")


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


_BANK_STATEMENT_PROMPT = """You are a Malaysian bank statement parser. Extract ALL transactions from the text below.

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
[{{"name": "...", "amount": 12.50, "category": "Food", "transactionDate": "2026-05-15"}}, ...]"""


def _clean_json_response(content: str) -> list[dict] | None:
    """Clean and parse JSON from AI responses."""
    content = content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[-1]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
    if content.startswith("json"):
        content = content[4:].strip()
    try:
        transactions = json.loads(content)
        if isinstance(transactions, list):
            return transactions
    except Exception:
        pass
    return None


async def _parse_with_openai(prompt: str) -> list[dict] | None:
    """Try OpenAI GPT-4o for text-based parsing."""
    if not OPENAI_API_KEY:
        return None
    try:
        resp = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o",
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
        return _clean_json_response(content)
    except Exception:
        return None


async def _parse_with_deepseek(prompt: str) -> list[dict] | None:
    """Try DeepSeek for text-based parsing (fallback)."""
    if not DEEPSEEK_API_KEY:
        return None
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
        return _clean_json_response(content)
    except Exception:
        return None


async def _parse_transactions_with_ai(text: str) -> list[dict]:
    """Parse bank statement text via AI. OpenAI first, then DeepSeek as fallback."""
    prompt = f"""{_BANK_STATEMENT_PROMPT}

BANK STATEMENT TEXT:
{text[:8000]}"""
    return await _parse_with_openai(prompt) or await _parse_with_deepseek(prompt)


async def _parse_pdf_with_vision(pdf_bytes: bytes, filename: str) -> list[dict] | None:
    """Convert PDF pages to images and use GPT-4o vision for scanned/image-based PDFs."""
    try:
        import fitz  # PyMuPDF
    except ImportError:
        return None

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        pages = min(len(doc), 2)
        images = []
        for i in range(pages):
            page = doc[i]
            pix = page.get_pixmap(dpi=200)
            img_b64 = base64.b64encode(pix.tobytes("png")).decode("utf-8")
            images.append(f"data:image/png;base64,{img_b64}")
        doc.close()

        prompt = f"""{_BANK_STATEMENT_PROMPT}

This is a scanned bank statement image. Look at each transaction in the image and extract all of them."""

        content = [{"type": "text", "text": prompt}]
        for img in images:
            content.append({"type": "image_url", "image_url": {"url": img, "detail": "high"}})

        resp = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o",
                "messages": [
                    {"role": "system", "content": "You are a precise bank statement parser. Look at the image and extract all transactions. Output only valid JSON arrays, no markdown or extra text."},
                    {"role": "user", "content": content},
                ],
                "temperature": 0.1,
                "max_tokens": 2000,
            },
            timeout=60,
        )
        resp.raise_for_status()
        body = resp.json()
        text = body.get("choices", [{}])[0].get("message", {}).get("content", "")
        return _clean_json_response(text)
    except Exception as e:
        import traceback
        print(f"Vision PDF parsing error: {e}")
        traceback.print_exc()
        return None
