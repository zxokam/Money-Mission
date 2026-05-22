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

    # Step 1: Extract and clean text from PDF
    raw_text = _extract_pdf_text(contents)
    has_text = bool(raw_text and raw_text.strip())

    # Step 2a: Try text-based parsing with cleaned text (OpenAI → DeepSeek)
    if has_text:
        text = _clean_bank_text(raw_text)
        if text and text.strip():
            transactions = await _parse_transactions_with_ai(text)
            if transactions:
                return {"transactions": transactions, "method": "text", "raw_text_preview": text[:500]}

    # Step 2b: Try GPT-4o vision on embedded PDF images (scanned/image-based PDFs)
    vision_result = await _parse_pdf_with_vision(contents)
    if vision_result:
        return {"transactions": vision_result, "method": "vision"}

    # All methods failed — return useful error
    if not has_text:
        raise HTTPException(400, "Could not extract text or images from this PDF. The file may be encrypted, corrupt, or an unsupported scanned format.")
    raise HTTPException(400, "AI could not parse the transactions from the extracted text. The PDF may contain unstructured or non-standard bank statement format.")


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


def _clean_bank_text(raw: str) -> str:
    """Filter bank statement text to keep only transaction-like lines."""
    lines = raw.split("\n")
    cleaned = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Skip obvious non-transaction lines
        lower = line.lower()
        skip_words = [
            "page", "opening balance", "closing balance", "available balance",
            "statement", "account", "branch", "address", "phone", "fax",
            "date", "description", "amount", "withdrawal", "deposit",
            "balance brought", "balance carried", "total", "continued",
            "this page", "subtotal", "www.", ".com", "customer", "hotline",
        ]
        if any(w in lower for w in skip_words) and not _has_amount(line):
            continue
        cleaned.append(line)

    return "\n".join(cleaned)


def _has_amount(line: str) -> bool:
    """Check if a line contains a monetary amount (RM or decimal number)."""
    # Matches: 123.45, 1,234.56, RM123.45, RM 123.45, -123.45
    return bool(re.search(r'(?:RM\s*)?\d[\d,]*(?:\.\d{2})', line))


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
    """Clean and parse JSON from AI responses, handling truncation."""
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
    except json.JSONDecodeError as e:
        # JSON was truncated mid-response — try to salvage by closing the array
        if "Expecting value" in str(e) or "Unterminated string" in str(e):
            content = content.rstrip()
            # Find last complete object by backtracking to last "}," or "}]"
            last_good = content.rfind("},")
            if last_good > 0:
                content = content[:last_good + 1] + "]"
                try:
                    transactions = json.loads(content)
                    if isinstance(transactions, list) and len(transactions) > 0:
                        return transactions
                except json.JSONDecodeError:
                    pass
            # Simpler fallback: just close with ]
            content = content.rstrip(",\n\r ") + "]"
            try:
                transactions = json.loads(content)
                if isinstance(transactions, list) and len(transactions) > 0:
                    return transactions
            except json.JSONDecodeError:
                pass
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
                "max_tokens": 4000,
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
                "max_tokens": 4000,
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
    return await _parse_with_deepseek(prompt) or await _parse_with_openai(prompt)


async def _parse_pdf_with_vision(pdf_bytes: bytes) -> list[dict] | None:
    """Extract images from PDF pages using pypdf, send to GPT-4o vision."""
    if not OPENAI_API_KEY:
        return None

    try:
        from pypdf import PdfReader
        from PIL import Image as PILImage

        reader = PdfReader(io.BytesIO(pdf_bytes))
        images = []
        for page in reader.pages[:2]:
            for img_obj in page.images:
                try:
                    img = PILImage.open(io.BytesIO(img_obj.data))
                    # Convert to PNG for consistent handling
                    buf = io.BytesIO()
                    img = img.convert("RGB")
                    img.save(buf, format="PNG")
                    img_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
                    images.append(f"data:image/png;base64,{img_b64}")
                    if len(images) >= 4:  # Max 4 images per page
                        break
                except Exception:
                    continue
    except ImportError:
        return None
    except Exception as e:
        print(f"PDF image extraction error: {e}")
        return None

    if not images:
        return None

    try:
        prompt = f"""{_BANK_STATEMENT_PROMPT}

This is a scanned bank statement. Look at each transaction visible in the image(s) and extract all of them."""

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
                "max_tokens": 4000,
            },
            timeout=60,
        )
        resp.raise_for_status()
        body = resp.json()
        text = body.get("choices", [{}])[0].get("message", {}).get("content", "")
        return _clean_json_response(text)
    except Exception as e:
        import traceback
        print(f"Vision API error: {e}")
        traceback.print_exc()
        return None
