import json
from collections import defaultdict
import httpx
from ..config import GEMINI_API_KEY, DEEPSEEK_API_KEY, OPENAI_API_KEY
from .scoring_service import calculate_financial_score

NON_ESSENTIAL_CATEGORIES = {"Shopping", "Entertainment", "Others", "Food Delivery"}
ESSENTIAL_CATEGORIES = {"Food", "Transport", "Bills", "Subscription", "PayLater"}

CATEGORY_COLORS = {
    "Food": "#10b981", "Transport": "#3b82f6", "Bills": "#f59e0b",
    "Subscription": "#8b5cf6", "PayLater": "#ec4899", "Shopping": "#ef4444",
    "Entertainment": "#f97316", "Others": "#6b7280",
}

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"


# ── Gemini AI ────────────────────────────────────────────────

def _build_gemini_prompt(data: dict, photo_diary: dict = None) -> str:
    """Build a structured prompt for AI evaluation of missions."""
    mission_type = "PHOTO" if photo_diary else "BANK"

    prompt = f"""You are a strict but fair mission evaluator for a Malaysian student challenge app called MoneyMission. Your job is to verify whether a participant has completed their mission according to the rules. Respond in JSON format only.

═══════════════════════════════════
MISSION DETAILS ({mission_type} VERIFICATION)
═══════════════════════════════════
Title: {data['title']}
Participant: {data['participant']}
Rules: {data['rules'] or 'Complete the mission requirements as stated'}
Target Improvement: {data['target_pct']}%
Reward: RM{data['reward']}"""

    if photo_diary:
        missed = photo_diary.get("missed_dates", [])
        missed_str = ", ".join(missed) if missed else "None"
        prompt += f"""

═══════════════════════════════════
PHOTO VERIFICATION — READ CAREFULLY
═══════════════════════════════════
Required subject: "{photo_diary.get('subject', 'N/A')}"
Total days: {photo_diary.get('total', 0)}
Photos uploaded: {photo_diary.get('uploaded', 0)}
Compliance: {photo_diary.get('compliance_pct', 0)}%
Missed dates: {missed_str}

STEP 1: Look at each photo ONE BY ONE. For each photo, write down EXACTLY what objects you see. Be specific — "a clear glass containing transparent liquid on a wooden table" NOT just "water".

STEP 2: Compare what you see to the required subject "{photo_diary.get('subject', 'N/A')}". Ask yourself: would a reasonable person looking at this photo agree it shows "{photo_diary.get('subject', 'N/A')}"?

STEP 3: Decide verdict:
- APPROVED only if the photo ACTUALLY DEPICTS "{photo_diary.get('subject', 'N/A')}"
- REJECTED if the photo shows something else. DO NOT pretend a wrong object matches the subject.
- If compliance < 50% → REJECTED for incomplete submission."""
        # List photo URLs for text-only models as reference
        if data.get("photo_urls"):
            prompt += "\nPhoto URLs submitted:\n"
            for i, u in enumerate(data["photo_urls"], 1):
                prompt += f"  {i}. {u}\n"
        prompt += "\n"""

    else:
        has_budget = data['income'] > 0

        if has_budget:
            prompt += f"""

═══════════════════════════════════
PARTICIPANT'S BUDGET SETUP
═══════════════════════════════════
Monthly Income: RM{data['income']:.2f}
Fixed Expenses (rent/utilities): RM{data['fixed_expenses']:.2f}
Subscriptions: RM{data['subscriptions']:.2f}
PayLater Commitments: RM{data['paylater_commitments']:.2f}
Average Food Per Day: RM{data['avg_food_per_day']:.2f}
Transport Cost: RM{data['transport_cost']:.2f}
Other Required Expenses: RM{data['other_expenses']:.2f}
Total Required Expenses: RM{data['required']:.2f}
Expected Leftover (after expenses): RM{data['expected_leftover']:.2f}
Safe Daily Spending Limit: RM{data['safe_daily_spending']:.2f}"""

        prompt += f"""

═══════════════════════════════════
ACTUAL SPENDING RESULTS
═══════════════════════════════════
Total Actual Spending: RM{data['actual_spending']:.2f}
Actual Leftover: RM{data['actual_leftover']:.2f}
Improvement: {data['improvement_pct']:+.1f}% (Target: {data['target_pct']}%)
Baseline Financial Score: {data['base_score']}/100 → New Score: {data['health_score']}/100

Spending breakdown by category:
{data['cat_summary']}"""

        if has_budget:
            prompt += f"""

STEP 1: Compare their actual spending against their budget. For each category, check if they overspent relative to their planned budget. Be specific — "Food spending of RM450 exceeds their planned RM{data['avg_food_per_day'] * 30:.0f}/month food budget by RM{450 - data['avg_food_per_day'] * 30:.0f}" NOT just "spent on food".

STEP 2: Look at subscriptions (RM{data['subscriptions']:.2f}), PayLater (RM{data['paylater_commitments']:.2f}), and non-essential categories. Did they cut back where it matters? Are they overspending on wants vs needs?

STEP 3: Compare actual leftover (RM{data['actual_leftover']:.2f}) against expected leftover (RM{data['expected_leftover']:.2f}). Their safe daily spending was RM{data['safe_daily_spending']:.2f}/day — did they stay within it?

STEP 4: Decide verdict:
- APPROVED: If improvement ({data['improvement_pct']:+.1f}%) meets or exceeds target ({data['target_pct']}%). They reduced spending successfully.
- REJECTED: If improvement is below target. But acknowledge ANY positive improvement — even 2% better is progress."""
        else:
            prompt += f"""

STEP 1: Analyze their actual spending patterns. Look at where money is going — which categories dominate? Is spending balanced?

STEP 2: Identify non-essential spending (Shopping, Entertainment, Food Delivery). What percentage of total spending is discretionary vs necessary?

STEP 3: Look for any red flags: large single transactions, PayLater usage indicating debt, unusual patterns.

STEP 4: Decide verdict:
- APPROVED: If spending looks reasonable for a student — mostly essentials, limited splurging. The total spending of RM{data['actual_spending']:.2f} is the key number to judge.
- REJECTED: If there's excessive non-essential spending, debt signals, or spending far exceeds typical student budget (~RM1500-2000/month)."""


    if photo_diary:
        prompt += f"""

═══════════════════════════════════
YOUR RESPONSE
═══════════════════════════════════
Respond with this exact JSON (no markdown, no code fences, no extra text):
{{"verdict": "approved" OR "rejected", "observed": "EXACTLY what objects you see in the photo(s). One sentence. Be specific. Example: 'Clear glass half-filled with transparent liquid, sitting on a wooden table.'", "reason": "Short sentence comparing observed contents to required subject '{photo_diary.get('subject', 'N/A')}'. Example: 'Photo shows a glass of water which matches the subject.' or 'Photo shows a coffee mug, not water — mismatch.'", "explanation": "3-5 sentences. The FIRST sentence must describe what you observed in the photo. THEN judge whether it matches. TONE MUST MATCH verdict. APPROVED: warm, congratulate, mention RM reward. REJECTED: kind but clear about the mismatch, no congratulations or reward mention.", "recommendations": ["3 tips, each one sentence"]}}"""
    elif data['income'] > 0:
        prompt += f"""

═══════════════════════════════════
YOUR RESPONSE
═══════════════════════════════════
Respond with this exact JSON (no markdown, no code fences, no extra text):
{{"verdict": "approved" OR "rejected", "observed": "EXACTLY what spending patterns you notice. One sentence. Be specific. Example: 'Participant spent RM450.30 total across Food (RM180.50), Transport (RM120.00), and Shopping (RM149.80), leaving RM249.70 from RM700.00 income.'", "reason": "Short sentence comparing actual improvement ({data['improvement_pct']:+.1f}%) to target ({data['target_pct']}%). Example: 'Improvement of 15.3% exceeds the 10% target — mission passed.' or 'Improvement of only 3.2% falls short of the 10% target.'", "explanation": "3-5 sentences. The FIRST sentence must describe what you observed in the spending breakdown — mention the top spending categories and whether the participant saved. THEN judge whether they hit their target. TONE MUST MATCH verdict. APPROVED: warm, congratulate, mention RM{data['reward']} reward. REJECTED: kind but clear about the shortfall, no congratulations or reward mention.", "recommendations": ["3 tips, each one sentence related to the top spending categories"]}}"""
    else:
        prompt += f"""

═══════════════════════════════════
YOUR RESPONSE
═══════════════════════════════════
Respond with this exact JSON (no markdown, no code fences, no extra text):
{{"verdict": "approved" OR "rejected", "observed": "EXACTLY what spending patterns you notice. One sentence summarizing total spending and top categories. Be specific. Example: 'Participant spent RM1,234.50 total across Food (RM450.00), Transport (RM320.00), Shopping (RM280.50), and other categories.'", "reason": "One sentence judging whether this spending pattern looks healthy for a student. Example: 'Spending is mostly on essentials with moderate discretionary purchases — looks reasonable.' or 'High non-essential spending on Shopping and Entertainment signals poor money management.'", "explanation": "3-5 sentences. Describe the spending breakdown you observed — top categories, essential vs non-essential split, any red flags. THEN give your verdict on whether this looks financially healthy. TONE: friendly, motivational Malaysian coach style. APPROVED: warm, congratulate on good habits. REJECTED: kind but clear about overspending, no congratulations.", "recommendations": ["3 tips, each one sentence related to the top spending categories"]}}"""

    return prompt


def _call_gemini(data: dict, photo_diary: dict = None) -> dict | None:
    """Call Gemini API. Returns dict with explanation and recommendations, or None on failure."""
    if not GEMINI_API_KEY:
        return None

    prompt = _build_gemini_prompt(data, photo_diary)

    try:
        resp = httpx.post(
            f"{GEMINI_URL}?key={GEMINI_API_KEY}",
            json={
                "contents": [{
                    "parts": [{"text": prompt}]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 800,
                },
            },
            timeout=30,
        )
        resp.raise_for_status()
        body = resp.json()

        # Extract text from Gemini response
        candidates = body.get("candidates", [])
        if not candidates:
            return None
        text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")

        # Parse JSON from response (strip any markdown code fences)
        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
        if text.startswith("json"):
            text = text[4:].strip()

        result = json.loads(text)
        if "explanation" not in result or "recommendations" not in result:
            return None
        return result

    except Exception as e:
        import traceback
        print(f"Gemini API error: {e}")
        traceback.print_exc()
        return None


# ── DeepSeek AI ──────────────────────────────────────────────

DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"


def _call_deepseek(data: dict, photo_diary: dict = None) -> dict | None:
    """Call DeepSeek API (OpenAI-compatible). Returns dict with explanation and recommendations, or None on failure."""
    if not DEEPSEEK_API_KEY:
        return None

    prompt = _build_gemini_prompt(data, photo_diary)

    try:
        resp = httpx.post(
            DEEPSEEK_URL,
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": "You are a friendly, motivational Malaysian financial coach for students. Always respond in valid JSON only — no markdown, no extra text."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.7,
                "max_tokens": 800,
            },
            timeout=30,
        )
        resp.raise_for_status()
        body = resp.json()

        text = body.get("choices", [{}])[0].get("message", {}).get("content", "")

        # Parse JSON from response (strip any markdown code fences)
        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
        if text.startswith("json"):
            text = text[4:].strip()

        result = json.loads(text)
        if "explanation" not in result or "recommendations" not in result:
            return None
        return result

    except Exception as e:
        import traceback
        print(f"DeepSeek API error: {e}")
        traceback.print_exc()
        return None


# ── OpenAI ─────────────────────────────────────────────────

OPENAI_URL = "https://api.openai.com/v1/chat/completions"


def _call_openai(data: dict, photo_diary: dict = None, photo_urls: list = None) -> dict | None:
    """Call OpenAI API. For photo missions with image URLs, uses vision to inspect photos."""
    if not OPENAI_API_KEY:
        return None

    prompt = _build_gemini_prompt(data, photo_diary)

    # Build message content — use vision format if photo URLs provided
    if photo_urls and len(photo_urls) > 0:
        content = [{"type": "text", "text": prompt}]
        for url in photo_urls:
            content.append({
                "type": "image_url",
                "image_url": {"url": url, "detail": "high"}
            })
        messages = [
            {"role": "system", "content": "You are an honest Malaysian mission verifier. Look at each photo carefully. Describe what you actually see, then judge if it matches the required subject. Never lie about photo contents — if it doesn't match, reject it. If it matches, approve it. Respond in valid JSON only — no markdown, no extra text."},
            {"role": "user", "content": content},
        ]
        max_tok = 1500
    else:
        messages = [
            {"role": "system", "content": "You are a friendly, motivational Malaysian financial coach for students. Always respond in valid JSON only — no markdown, no extra text."},
            {"role": "user", "content": prompt},
        ]
        max_tok = 800

    try:
        resp = httpx.post(
            OPENAI_URL,
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o",
                "messages": messages,
                "temperature": 0.3 if photo_urls else 0.7,
                "max_tokens": max_tok,
            },
            timeout=60,
        )
        resp.raise_for_status()
        body = resp.json()

        text = body.get("choices", [{}])[0].get("message", {}).get("content", "")

        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
        if text.startswith("json"):
            text = text[4:].strip()

        result = json.loads(text)
        if "explanation" not in result or "recommendations" not in result:
            return None
        return result

    except Exception as e:
        import traceback
        print(f"OpenAI API error: {e}")
        traceback.print_exc()
        return None


# ── Rule-based fallback ──────────────────────────────────────

FALLBACK_TIPS = {
    "Food": [
        "Cook at home more — mamak is your best friend for cheap, filling meals under RM10.",
        "Plan your grocery list weekly and stick to it. Impulse buys at Lotus's add up fast.",
        "Try meal prepping: cook 3 days' worth at once. Your wallet (and future self) will thank you.",
    ],
    "Transport": [
        "Carpool with friends or take public transit on non-urgent days.",
        "Use Touch 'n Go eWallet reloads during promo periods for cashback.",
        "Batch your errands into one trip. Fewer petrol runs = more money staying put.",
    ],
    "Shopping": [
        "Uninstall Shopee for a week and watch your bank balance breathe.",
        "Before buying, ask: 'Do I need this, or do I just want this?' Sleep on it.",
        "Set a monthly 'fun money' limit of RM30-50 and track it religiously.",
    ],
    "Entertainment": [
        "Swap paid streaming for free alternatives — YouTube and RTM have plenty.",
        "Host a potluck instead of eating out. Friends bring food, you save cash.",
        "Limit subscriptions to 1-2 you actually use daily. Cancel the rest.",
    ],
    "Subscription": [
        "Audit your subscriptions: are you really watching Netflix AND Spotify Premium daily?",
        "Share family plans with housemates — split costs, same benefits.",
        "Downgrade to basic plans. iCloud 50GB is only RM3.90/month.",
    ],
    "Others": [
        "Track every sen for a week. Small leaks (RM5 here, RM10 there) sink big ships.",
        "Set a daily spending limit and check your balance every morning.",
        "Build a tiny emergency fund first — even RM50/month creates breathing room.",
    ],
}

FALLBACK_GENERIC = [
    "Track every expense for one week — awareness alone can cut spending by 10-15%.",
    "Set a daily spending cap and check your bank balance each morning.",
    "Avoid impulse purchases before the mission end date. Every ringgit counts.",
]


def _classify_spending(cats: dict) -> tuple[float, float]:
    essential = 0.0
    non_essential = 0.0
    for category, amount in cats.items():
        if category in NON_ESSENTIAL_CATEGORIES:
            non_essential += amount
        else:
            essential += amount
    return essential, non_essential


def _rule_based_explanation(passed: bool, improvement_pct: float, target_pct: float,
                            participant_name: str, mission_title: str) -> str:
    if passed:
        return (
            f"Mission PASSED! {participant_name} crushed the \"{mission_title}\" challenge, "
            f"hitting a {improvement_pct:+.1f}% improvement and beating the {target_pct}% target. "
            "Great discipline and smart choices made all the difference. "
            "This kind of consistency is what builds real money habits!"
        )
    else:
        shortfall = target_pct - improvement_pct
        return (
            f"Mission fell short — {participant_name} improved by {abs(improvement_pct):.1f}%, "
            f"but the \"{mission_title}\" target was {target_pct}% (just {shortfall:.1f}% away). "
            "So close! A few small tweaks and you'll nail it next time. "
            "Every attempt teaches you something — don't give up!"
        )


def _rule_based_recommendations(passed: bool) -> list[str]:
    if passed:
        return [
            "Keep up the great habits — consistency is your superpower.",
            "Challenge yourself: set a slightly higher target next mission.",
            "Share your strategy with a friend — teaching reinforces your own discipline.",
        ]
    else:
        return FALLBACK_GENERIC[:3]


# ── Main evaluation ──────────────────────────────────────────

def run_ai_evaluation(mission, financial_setup, transactions, photo_diary: dict = None, photo_urls: list = None) -> dict:
    income = financial_setup.monthly_income
    required = financial_setup.required_expenses
    expected_leftover = financial_setup.expected_leftover
    target_pct = mission.target_improvement_percentage
    reward = mission.reward_amount

    actual_spending = sum(t.amount for t in transactions)
    actual_leftover = income - actual_spending

    improvement_pct = 0.0
    if expected_leftover > 0:
        improvement_pct = round(((actual_leftover - expected_leftover) / expected_leftover) * 100, 2)
    elif income > 0:
        # No expected leftover set, but we have income — use actual_leftover/income ratio
        improvement_pct = round((actual_leftover / income) * 100, 2)

    # When no budget data at all, judge purely on spending vs typical student budget
    if income <= 0:
        passed = actual_spending < 2000  # Reasonable student monthly spend
    else:
        passed = improvement_pct >= target_pct

    # Category breakdown
    cats = defaultdict(float)
    for t in transactions:
        cats[t.category] += t.amount

    essential, non_essential = _classify_spending(cats)
    top_cat = (max(cats, key=cats.get) if cats else "N/A")
    top_amount = cats.get(top_cat, 0)

    category_breakdown = [
        {"category": c, "amount": round(a, 2), "color": CATEGORY_COLORS.get(c, "#6b7280")}
        for c, a in sorted(cats.items(), key=lambda x: -x[1])
    ]

    # Financial health score
    base_score = financial_setup.baseline_financial_score
    health_score = calculate_financial_score(
        actual_leftover=actual_leftover,
        monthly_income=income,
        required_expenses=required,
        actual_total_spending=actual_spending,
        expected_leftover=expected_leftover,
    )

    # Checks (adapt for missing budget)
    has_budget = income > 0
    passed_checks = [
        {"label": "Improvement target met", "result": passed},
        {"label": "Essential expenses covered", "result": actual_leftover > 0 if has_budget else actual_spending < 2000},
        {"label": "No single category over 50% of spending",
         "result": all(a < actual_spending * 0.5 for a in cats.values()) if actual_spending > 0 else True},
        {"label": "Leftover ratio healthy (>10% of income)",
         "result": (actual_leftover / income) >= 0.1 if has_budget else (actual_spending < 2000)},
        {"label": "Non-essential spending under control",
         "result": non_essential <= income * 0.2 if has_budget else non_essential < 500},
    ]

    # Prepare data for Gemini
    cat_summary = "\n".join(
        f"  - {c}: RM{a:.0f}" for c, a in sorted(cats.items(), key=lambda x: -x[1])
    )
    checks_summary = "\n".join(
        f"  - {'PASS' if c['result'] else 'FAIL'}: {c['label']}" for c in passed_checks
    )

    gemini_data = {
        "participant": getattr(mission, "participant_name", "Student"),
        "title": getattr(mission, "title", "Money Mission"),
        "rules": getattr(mission, "rules", "") or "",
        "reward": reward,
        "target_pct": target_pct,
        "passed": passed,
        "is_photo_mission": photo_diary is not None,
        "photo_urls": photo_urls or [],
        "income": income,
        "required": required,
        "expected_leftover": expected_leftover,
        "actual_spending": actual_spending,
        "actual_leftover": actual_leftover,
        "improvement_pct": improvement_pct,
        "health_score": health_score,
        "base_score": base_score,
        "non_essential": non_essential,
        "top_category": top_cat,
        "top_amount": top_amount,
        "cat_summary": cat_summary,
        "checks_summary": checks_summary,
        # Budget details from financial setup
        "fixed_expenses": getattr(financial_setup, "fixed_expenses", 0),
        "subscriptions": getattr(financial_setup, "subscriptions", 0),
        "paylater_commitments": getattr(financial_setup, "paylater_commitments", 0),
        "avg_food_per_day": getattr(financial_setup, "average_food_per_day", 0),
        "transport_cost": getattr(financial_setup, "transport_cost", 0),
        "other_expenses": getattr(financial_setup, "other_required_expenses", 0),
        "safe_daily_spending": getattr(financial_setup, "safe_daily_spending", 0),
    }

    # Try DeepSeek first (only reliable one) → Gemini → OpenAI → rule-based
    ai = _call_deepseek(gemini_data, photo_diary) or _call_gemini(gemini_data, photo_diary) or _call_openai(gemini_data, photo_diary, photo_urls)
    if ai:
        explanation = ai["explanation"]
        reason = ai.get("reason", "")
        observed = ai.get("observed", "")
        recommendations = ai["recommendations"]

        # Use AI's explicit verdict — not keyword matching
        verdict = ai.get("verdict", "").lower()
        passed = verdict == "approved"
    else:
        explanation = _rule_based_explanation(
            passed, improvement_pct, target_pct,
            gemini_data["participant"], gemini_data["title"],
        )
        reason = ("All requirements met" if passed else "Did not meet requirements")
        observed = f"Participant spent RM{actual_spending:.2f} across various categories with RM{actual_leftover:.2f} leftover from RM{income:.2f} income."
        recommendations = _rule_based_recommendations(passed)

    # Health history
    health_history = [
        {"month": m, "score": min(100, max(0, base_score + (i - 4) * 3 + (5 if i >= 4 else 0)))}
        for i, m in enumerate(["Jan", "Feb", "Mar", "Apr", "May"])
    ]
    health_history[-1] = {"month": "May", "score": health_score}
    score_change = health_score - base_score
    health_history.append({
        "month": "vs baseline",
        "score": score_change,
        "label": f"{'+' if score_change >= 0 else ''}{score_change} pts",
    })

    return {
        "status": "completed" if passed else "failed",
        "ai_verdict": "accepted" if passed else "rejected",
        "expected_leftover": round(expected_leftover, 2),
        "actual_total_spending": round(actual_spending, 2),
        "actual_leftover": round(actual_leftover, 2),
        "improvement_percentage": improvement_pct,
        "target_improvement_percentage": target_pct,
        "final_financial_score": health_score,
        "score_change": score_change,
        "reward_unlocked": passed,
        "reward": reward if passed else 0,
        "ai_explanation": explanation,
        "reason": reason,
        "observed": observed,
        "verdict_reason": explanation,
        "recommendations": recommendations,
        "passed_checks": passed_checks,
        "category_breakdown": category_breakdown,
        "non_essential_spending": round(non_essential, 2),
        "essential_spending": round(essential, 2),
        "health_history": health_history,
    }
