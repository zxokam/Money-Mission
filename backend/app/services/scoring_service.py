def calculate_financial_score(
    actual_leftover: float,
    monthly_income: float,
    required_expenses: float,
    actual_total_spending: float,
    expected_leftover: float,
) -> int:
    """
    Financial health score from 0–100.

    Breakdown:
    - Leftover money score:  0–40 pts
    - Expense discipline:    0–25 pts
    - Non-essential control: 0–25 pts
    - Emergency buffer:      0–10 pts
    """

    # ── Leftover money score (40 pts) ──
    leftover_ratio = actual_leftover / monthly_income if monthly_income > 0 else 0
    leftover_score = min(40, round(leftover_ratio * 100))

    # ── Expense discipline (25 pts) ──
    if required_expenses > 0:
        overspend_ratio = actual_total_spending / required_expenses
        if overspend_ratio <= 1.0:
            discipline_score = 25
        elif overspend_ratio <= 1.15:
            discipline_score = 18
        elif overspend_ratio <= 1.3:
            discipline_score = 10
        else:
            discipline_score = 0
    else:
        discipline_score = 15

    # ── Non-essential spending control (25 pts) ──
    if monthly_income > 0:
        non_essential_ratio = (actual_total_spending - required_expenses) / monthly_income
        if non_essential_ratio <= 0:
            non_essential_score = 25
        elif non_essential_ratio <= 0.1:
            non_essential_score = 20
        elif non_essential_ratio <= 0.25:
            non_essential_score = 12
        else:
            non_essential_score = 0
    else:
        non_essential_score = 10

    # ── Emergency buffer (10 pts) ──
    if monthly_income > 0:
        months_of_buffer = actual_leftover / monthly_income if actual_leftover > 0 else 0
        if months_of_buffer >= 0.5:
            buffer_score = 10
        elif months_of_buffer >= 0.2:
            buffer_score = 6
        elif months_of_buffer > 0:
            buffer_score = 2
        else:
            buffer_score = 0
    else:
        buffer_score = 0

    total = leftover_score + discipline_score + non_essential_score + buffer_score
    return min(100, max(0, total))
