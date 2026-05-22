from __future__ import annotations
import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ── Mission ──────────────────────────────────────────────

class MissionCreate(BaseModel):
    title: str
    sponsor: str = Field(..., alias="sponsor_name")
    participant: str = Field(default="", alias="participant_name")
    reward: float = Field(..., alias="reward_amount")
    targetImprovement: float = Field(default=0, alias="target_improvement_percentage")
    startDate: str = Field(..., alias="start_date")
    endDate: str = Field(..., alias="end_date")
    rules: Optional[str] = None
    verificationMethod: str = Field(default="bank", alias="verification_method")
    photoSubject: Optional[str] = Field(None, alias="photo_subject")
    photoFrequency: str = Field(default="daily", alias="photo_frequency")
    totalPhotosRequired: int = Field(default=0, alias="total_photos_required")
    expireDays: int = Field(default=15, alias="expire_days")

    class Config:
        populate_by_name = True


class MissionOut(BaseModel):
    id: int
    title: str
    sponsor: str = Field(..., alias="sponsor_name")
    participant: str = Field(..., alias="participant_name")
    reward: float = Field(..., alias="reward_amount")
    targetImprovement: float = Field(..., alias="target_improvement_percentage")
    startDate: str = Field(..., alias="start_date")
    endDate: str = Field(..., alias="end_date")
    rules: Optional[str] = None
    status: str
    verificationMethod: str = Field(default="bank", alias="verification_method")
    photoSubject: Optional[str] = Field(None, alias="photo_subject")
    photoFrequency: str = Field(default="daily", alias="photo_frequency")
    totalPhotosRequired: int = Field(default=0, alias="total_photos_required")
    expireDays: int = Field(default=15, alias="expire_days")
    daysLeft: int = Field(default=0, alias="days_left")
    createdAt: str = Field(..., alias="created_at")

    class Config:
        populate_by_name = True


class MissionUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    rules: Optional[str] = None


# ── Financial Setup ──────────────────────────────────────

class FinancialSetupCreate(BaseModel):
    income: float = Field(..., alias="monthly_income")
    fixedExpenses: float = Field(default=0, alias="fixed_expenses")
    subscriptions: float = Field(default=0)
    payLater: float = Field(default=0, alias="paylater_commitments")
    foodPerDay: float = Field(default=0, alias="average_food_per_day")
    transport: float = Field(default=0, alias="transport_cost")
    otherExpenses: float = Field(default=0, alias="other_required_expenses")

    class Config:
        populate_by_name = True


class FinancialSetupOut(BaseModel):
    id: int
    mission_id: int
    monthly_income: float
    fixed_expenses: float
    subscriptions: float
    paylater_commitments: float
    average_food_per_day: float
    transport_cost: float
    other_required_expenses: float
    required_expenses: float
    expected_leftover: float
    safe_daily_spending: float
    baseline_financial_score: int
    created_at: str

    class Config:
        from_attributes = True


# ── Transactions ─────────────────────────────────────────

class TransactionCreate(BaseModel):
    name: str
    amount: float
    category: str = "Others"
    transactionDate: str = Field(..., alias="transaction_date")
    receiptUrl: Optional[str] = Field(None, alias="receipt_url")

    class Config:
        populate_by_name = True


class TransactionOut(BaseModel):
    id: int
    mission_id: int
    name: str
    amount: float
    category: str
    transaction_date: str
    receipt_url: Optional[str] = None

    class Config:
        from_attributes = True


class TransactionSummary(BaseModel):
    total_spent: float
    transaction_count: int
    by_category: dict


# ── Evaluation ───────────────────────────────────────────

class EvaluationOut(BaseModel):
    id: int
    mission_id: int
    status: str
    aiVerdict: str = Field(..., alias="ai_verdict")
    expectedLeftover: float = Field(..., alias="expected_leftover")
    actualTotalSpending: float = Field(..., alias="actual_total_spending")
    actualLeftover: float = Field(..., alias="actual_leftover")
    improvementPercent: float = Field(..., alias="improvement_percentage")
    targetPercent: float = Field(..., alias="target_improvement_percentage")
    rewardUnlocked: bool = Field(..., alias="reward_unlocked")
    reward: float = Field(default=0)
    explanation: str = Field(..., alias="ai_explanation")
    verdictReason: str = Field(default="", alias="verdict_reason")
    passedChecks: list = Field(default_factory=list)
    categoryBreakdown: list = Field(default_factory=list)
    healthHistory: list = Field(default_factory=list)
    created_at: str

    class Config:
        populate_by_name = True


# ── Health ───────────────────────────────────────────────

class HealthOut(BaseModel):
    status: str
    version: str
