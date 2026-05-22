import datetime
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text, Enum, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    role = Column(String(50), default="user")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    missions = relationship("Mission", back_populates="user", foreign_keys="Mission.user_id")


class Mission(Base):
    __tablename__ = "missions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String(255), nullable=False)
    sponsor_name = Column(String(255), nullable=False)
    participant_name = Column(String(255), nullable=False)
    reward_amount = Column(Float, nullable=False, default=0)
    target_improvement_percentage = Column(Float, nullable=False, default=10)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    rules = Column(Text, nullable=True)
    status = Column(Enum("pending", "active", "completed", "failed"), default="pending")
    verification_method = Column(String(50), default="bank")
    photo_subject = Column(String(255), nullable=True)
    photo_frequency = Column(String(50), default="daily")
    total_photos_required = Column(Integer, default=0)
    expire_days = Column(Integer, default=15)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="missions", foreign_keys=[user_id])
    financial_setup = relationship("FinancialSetup", back_populates="mission", uselist=False, cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="mission", cascade="all, delete-orphan")
    evaluation = relationship("Evaluation", back_populates="mission", uselist=False, cascade="all, delete-orphan")


class FinancialSetup(Base):
    __tablename__ = "financial_setups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    mission_id = Column(Integer, ForeignKey("missions.id", ondelete="CASCADE"), unique=True, nullable=False)
    monthly_income = Column(Float, nullable=False, default=0)
    fixed_expenses = Column(Float, default=0)
    subscriptions = Column(Float, default=0)
    paylater_commitments = Column(Float, default=0)
    average_food_per_day = Column(Float, default=0)
    transport_cost = Column(Float, default=0)
    other_required_expenses = Column(Float, default=0)
    required_expenses = Column(Float, default=0)
    expected_leftover = Column(Float, default=0)
    safe_daily_spending = Column(Float, default=0)
    baseline_financial_score = Column(Integer, default=60)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    mission = relationship("Mission", back_populates="financial_setup")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    mission_id = Column(Integer, ForeignKey("missions.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(
        Enum("Food", "Transport", "Bills", "Subscription", "PayLater", "Shopping", "Entertainment", "Emergency", "Others"),
        default="Others",
    )
    transaction_date = Column(Date, nullable=False)
    receipt_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    mission = relationship("Mission", back_populates="transactions")


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    mission_id = Column(Integer, ForeignKey("missions.id", ondelete="CASCADE"), unique=True, nullable=False)
    expected_leftover = Column(Float, default=0)
    actual_total_spending = Column(Float, default=0)
    actual_leftover = Column(Float, default=0)
    improvement_percentage = Column(Float, default=0)
    target_improvement_percentage = Column(Float, default=10)
    final_financial_score = Column(Integer, default=60)
    status = Column(Enum("accepted", "rejected"), default="accepted")
    ai_explanation = Column(Text, nullable=True)
    reward_unlocked = Column(Integer, default=0)
    category_breakdown = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    mission = relationship("Mission", back_populates="evaluation")
