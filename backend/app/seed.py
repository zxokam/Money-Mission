"""
Seed demo data for MoneyMission AI.

Run:
    python -m app.seed
"""

import datetime
from .database import SessionLocal, engine, Base
from .models import User, Mission, FinancialSetup, Transaction

Base.metadata.create_all(bind=engine)


def seed():
    db = SessionLocal()

    if db.query(Mission).first():
        print("Database already seeded. Skipping.")
        db.close()
        return

    # ── User ──
    user = User(name="Aiman", email="aiman@example.com", role="participant")
    db.add(user)
    db.flush()

    # ── Mission ──
    mission = Mission(
        user_id=user.id,
        title="Cut wasteful spending by 10%",
        sponsor_name="Faris",
        participant_name="Aiman",
        reward_amount=20,
        target_improvement_percentage=10,
        start_date=datetime.date(2026, 5, 1),
        end_date=datetime.date(2026, 5, 31),
        rules="Reduce unnecessary shopping and food delivery. Track every expense.",
        status="completed",
        verification_method="bank",
        expire_days=15,
    )
    db.add(mission)
    db.flush()

    # ── Financial Setup ──
    setup = FinancialSetup(
        mission_id=mission.id,
        monthly_income=1000,
        fixed_expenses=300,
        subscriptions=40,
        paylater_commitments=80,
        average_food_per_day=15,
        transport_cost=60,
        other_required_expenses=50,
        required_expenses=980,
        expected_leftover=20,
        safe_daily_spending=0.65,
        baseline_financial_score=62,
    )
    db.add(setup)

    # ── Transactions (results in success: spending reduced) ──
    txs = [
        ("Grocery run", 55, "Food", "2026-05-02"),
        ("Netflix", 40, "Subscription", "2026-05-03"),
        ("Bus to work", 4, "Transport", "2026-05-04"),
        ("Mamak dinner", 8, "Food", "2026-05-05"),
        ("SPayLater payment", 80, "PayLater", "2026-05-06"),
        ("TnG top-up", 30, "Transport", "2026-05-07"),
        ("Lunch at cafe", 12, "Food", "2026-05-08"),
        ("Phone bill", 40, "Bills", "2026-05-09"),
        ("Kopitiam breakfast", 6, "Food", "2026-05-10"),
        ("Grocery run", 48, "Food", "2026-05-12"),
        ("Bus to work", 4, "Transport", "2026-05-13"),
        ("Mamak dinner", 7, "Food", "2026-05-15"),
        ("Spotify", 15, "Subscription", "2026-05-16"),
        ("TnG top-up", 25, "Transport", "2026-05-18"),
        ("Lunch at cafe", 10, "Food", "2026-05-20"),
        ("Grocery run", 42, "Food", "2026-05-22"),
        ("Bus to work", 4, "Transport", "2026-05-25"),
        ("Kopitiam breakfast", 5, "Food", "2026-05-27"),
        ("Mamak dinner", 9, "Food", "2026-05-29"),
    ]
    for name, amount, cat, d in txs:
        db.add(Transaction(
            mission_id=mission.id,
            name=name,
            amount=amount,
            category=cat,
            transaction_date=datetime.date.fromisoformat(d),
        ))

    db.commit()
    db.close()

    total = sum(a for _, a, _, _ in txs)
    income = 1000
    leftover = income - total
    print(f"Seed complete!")
    print(f"  Mission: {mission.title}")
    print(f"  Income: RM{income}")
    print(f"  Total spent: RM{total}")
    print(f"  Leftover: RM{leftover} (was RM20 baseline)")
    print(f"  Improvement: {((leftover - 20) / 20 * 100):.1f}%")


if __name__ == "__main__":
    seed()
