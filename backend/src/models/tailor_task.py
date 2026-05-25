"""Pydantic schemas for Tailor Task endpoints (Story 5.3, 5.2, 12.1)."""

import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


# ── Task Status (12 values: 11 states + cancellation_requested) ──────────────

TaskStatus = Literal[
    "unassigned",
    "assigned",
    "accepted",
    "rejected",
    "in_progress",
    "on_hold",
    "reassigning",
    "submitted_for_qc",
    "completed",
    "cancelled",
    "failed_qc",
    "cancellation_requested",
]

TaskPriority = Literal["normal", "urgent"]

RejectionCategory = Literal["overloaded", "not_specialty", "personal", "other"]

StageLogStatus = Literal["pending", "in_progress", "completed", "skipped"]


# ── New Request Schemas (Story 12.1) ─────────────────────────────────────────


class TaskAcceptRequest(BaseModel):
    expected_finish_at: datetime | None = Field(
        default=None, description="Tailor's estimated completion date"
    )

    @field_validator("expected_finish_at")
    @classmethod
    def validate_future_date(cls, v: datetime | None) -> datetime | None:
        if v is not None and v.replace(tzinfo=v.tzinfo or timezone.utc) < datetime.now(timezone.utc):
            raise ValueError("Ngày dự kiến hoàn thành phải trong tương lai")
        return v


class TaskRejectRequest(BaseModel):
    rejection_reason: str = Field(min_length=5, max_length=2000)
    rejection_category: RejectionCategory


class TaskStartRequest(BaseModel):
    notes: str | None = Field(default=None, max_length=2000)


class TaskHoldRequest(BaseModel):
    hold_reason: str = Field(min_length=5, max_length=2000)


class TaskResumeRequest(BaseModel):
    notes: str | None = Field(default=None, max_length=2000)


class TaskSubmitForQCRequest(BaseModel):
    notes: str | None = Field(default=None, max_length=2000)


class QCResultRequest(BaseModel):
    result: Literal["pass", "fail"] = Field(description="pass = completed, fail = failed_qc")
    action_on_fail: Literal["rework", "reassign", "fail"] | None = Field(
        default=None, description="Required when result='fail': rework/reassign/fail"
    )
    qc_issues: str | None = Field(
        default=None, max_length=5000, description="Required when result='fail'"
    )

    @model_validator(mode="after")
    def validate_fail_fields(self) -> "QCResultRequest":
        if self.result == "fail":
            if not self.qc_issues:
                raise ValueError("qc_issues is required when result='fail'")
            if not self.action_on_fail:
                raise ValueError("action_on_fail is required when result='fail'")
        else:
            self.action_on_fail = None
            self.qc_issues = None
        return self


class TaskReassignRequest(BaseModel):
    new_tailor_id: uuid.UUID
    reassignment_reason: str = Field(min_length=5, max_length=2000)


class StageUpdateRequest(BaseModel):
    stage: str = Field(min_length=1, max_length=100)
    status: StageLogStatus = Field(default="in_progress")
    notes: str | None = Field(default=None, max_length=2000)


# ── New Response Schemas (Story 12.1) ────────────────────────────────────────


class TaskStageLogResponse(BaseModel):
    id: str
    task_id: str
    stage: str
    stage_order: int
    status: str
    started_at: str | None = None
    completed_at: str | None = None
    notes: str | None = None
    created_at: str


class TaskHistoryResponse(BaseModel):
    id: str
    task_id: str
    actor_id: str | None = None
    actor_role: str
    action: str
    from_status: str | None = None
    to_status: str | None = None
    reason: str | None = None
    metadata: dict | None = None
    created_at: str


class TailorMatchingScore(BaseModel):
    tailor_id: str
    tailor_name: str
    score: float = Field(ge=0, le=100)
    workload_score: float = Field(ge=0, le=1)
    specialty_match: bool = True
    on_time_rate: float = Field(ge=0, le=1)
    reasons: list[str] = []


# ── Existing Response Schemas (updated) ──────────────────────────────────────


class TailorTaskResponse(BaseModel):
    """Single tailor task response."""

    id: str
    tenant_id: str
    order_id: str
    order_item_id: str | None = None
    assigned_to: str | None = None
    assigned_by: str
    garment_name: str
    customer_name: str
    status: str = Field(description="Task status (11-state machine)")
    production_step: str = Field(default="pending", description="pending | cutting | sewing | finishing | quality_check | done")
    deadline: str | None = None
    notes: str | None = None
    piece_rate: float | None = None
    design_id: str | None = None
    completed_at: str | None = None
    failure_reason: str | None = None
    failure_category: str | None = None
    cancellation_resolved_at: str | None = None
    # New state machine fields
    version: int = 1
    accepted_at: str | None = None
    started_at: str | None = None
    submitted_at: str | None = None
    hold_reason: str | None = None
    on_hold_at: str | None = None
    resumed_at: str | None = None
    assignment_deadline_at: str | None = None
    expected_finish_at: str | None = None
    is_rework: bool = False
    rework_count: int = 0
    qc_issues: str | None = None
    rejection_reason: str | None = None
    rejection_category: str | None = None
    reassignment_reason: str | None = None
    priority: str = "normal"
    is_overdue: bool = False
    days_until_deadline: int | None = None
    created_at: str
    updated_at: str


class TailorTaskSummary(BaseModel):
    """Task count summary by status."""

    total: int = 0
    unassigned: int = 0
    assigned: int = 0
    accepted: int = 0
    rejected: int = 0
    in_progress: int = 0
    on_hold: int = 0
    reassigning: int = 0
    submitted_for_qc: int = 0
    completed: int = 0
    cancelled: int = 0
    failed_qc: int = 0
    cancellation_requested: int = 0
    overdue: int = 0


class OrderInfoForTask(BaseModel):
    """Order info embedded in task detail view."""

    order_id: str
    status: str
    payment_status: str
    total_amount: float
    customer_name: str
    customer_phone: str
    shipping_address: dict | None = None
    shipping_note: str | None = None


class TailorTaskDetailResponse(TailorTaskResponse):
    """Detailed task view extending base response with order, design, stages, and history."""

    order_info: OrderInfoForTask | None = None
    stage_logs: list[TaskStageLogResponse] = []
    history: list[TaskHistoryResponse] = []


class StatusUpdateRequest(BaseModel):
    """Request body for status update.

    Only allows forward transitions: in_progress or completed.
    """

    status: Literal["in_progress", "completed"] = Field(
        description="Target status: in_progress or completed (no backward transitions)"
    )


class CancellationRequestInput(BaseModel):
    """Request body for tailor requesting cancellation."""

    failure_category: Literal[
        "fabric_defect", "measurement_error", "customer_changed_mind", "overloaded", "other"
    ] = Field(description="Structured failure category")
    failure_reason: str = Field(min_length=10, max_length=2000, description="Detailed reason")


class ResolveCancellationInput(BaseModel):
    """Request body for owner resolving a cancellation request."""

    decision: Literal["approve", "reject", "reassign"] = Field(
        description="Owner decision on tailor cancellation request"
    )
    new_tailor_id: uuid.UUID | None = Field(
        default=None, description="Required when decision=reassign"
    )
    cancellation_reason: str | None = Field(
        default=None, max_length=2000,
        description="Owner override reason for order cancellation"
    )


class ProductionStepUpdateRequest(BaseModel):
    """Request body for production sub-step update (forward-only)."""

    production_step: Literal["cutting", "sewing", "finishing", "quality_check", "done"] = Field(
        description="Target production step (forward-only transitions)"
    )


class TailorTaskListResponse(BaseModel):
    """Response wrapper for task list with summary."""

    tasks: list[TailorTaskResponse] = []
    summary: TailorTaskSummary = TailorTaskSummary()


# ── Story 5.2: Owner Task Management ──────────────────────────────────────────


class TaskCreateRequest(BaseModel):
    """Request body for Owner creating/assigning a task."""

    order_id: uuid.UUID = Field(description="Order to assign for production")
    order_item_id: uuid.UUID | None = Field(
        default=None, description="Optional: specific garment item in order"
    )
    assigned_to: uuid.UUID = Field(description="Tailor user ID to assign")
    deadline: datetime | None = Field(default=None, description="Production deadline (timezone-aware)")
    notes: str | None = Field(default=None, max_length=2000, description="Owner instructions for tailor")
    piece_rate: float | None = Field(default=None, ge=0, description="Payment amount for this task")
    garment_name: str | None = Field(
        default=None, max_length=255,
        description="Override garment name (auto-populated from order if omitted)"
    )
    customer_name: str | None = Field(
        default=None, max_length=255,
        description="Override customer name (auto-populated from order if omitted)"
    )


class TaskUpdateRequest(BaseModel):
    """Request body for Owner updating a task."""

    deadline: datetime | None = None
    notes: str | None = Field(default=None, max_length=2000)
    piece_rate: float | None = Field(default=None, ge=0)
    assigned_to: uuid.UUID | None = Field(
        default=None, description="Reassign to different tailor"
    )


class OwnerTaskItem(TailorTaskResponse):
    """Task item for Owner view — extends base with assignee name."""

    assignee_name: str = ""


class OwnerTaskListResponse(BaseModel):
    """Response wrapper for Owner task list with summary."""

    tasks: list[OwnerTaskItem] = []
    summary: TailorTaskSummary = TailorTaskSummary()


# ── Story 5.4: Tailor Income / Tính Lương ─────────────────────────────────────


class TailorMonthlyIncome(BaseModel):
    """Monthly income summary for a tailor."""

    month: int = Field(description="Month number (1-12)")
    year: int = Field(description="Year (e.g. 2026)")
    total_income: float = Field(default=0.0, description="Tổng tiền công (sum of piece_rate) cho tháng này")
    task_count: int = Field(default=0, description="Số lượng công việc hoàn thành")


class TailorIncomeResponse(BaseModel):
    """Income comparison for current month vs previous month."""

    current_month: TailorMonthlyIncome
    previous_month: TailorMonthlyIncome
    percentage_change: float | None = Field(
        default=None,
        description="% thay đổi thu nhập so với tháng trước. None nếu tháng trước = 0.",
    )


# ── Tech-Spec: Dashboard Restructure (Task 1) ─────────────────────────────────


class TaskFilterParams(BaseModel):
    """Filter parameters for task list queries."""

    status: Optional[str] = Field(
        default=None,
        description="Comma-separated status values: assigned,in_progress,completed,cancelled"
    )
    date_from: Optional[datetime] = Field(
        default=None,
        description="Filter tasks with deadline >= this date"
    )
    date_to: Optional[datetime] = Field(
        default=None,
        description="Filter tasks with deadline <= this date"
    )
    month: Optional[int] = Field(
        default=None,
        ge=1,
        le=12,
        description="Filter tasks by deadline month (1-12)"
    )
    year: Optional[int] = Field(
        default=None,
        description="Filter tasks by deadline year"
    )


# ── Tech-Spec: Dashboard Restructure (Task 2) ─────────────────────────────────


IncomePeriod = Literal["day", "week", "month", "year"]


class IncomeDetailItem(BaseModel):
    """Single task detail for daily income view."""

    task_id: str
    garment_name: str
    customer_name: str
    piece_rate: float
    completed_at: str


class TailorIncomeDetailResponse(BaseModel):
    """Detailed income response for daily view."""

    items: list[IncomeDetailItem] = []
    total_income: float = Field(default=0.0, description="Tổng tiền công trong ngày")
    task_count: int = Field(default=0, description="Số lượng công việc hoàn thành")
    date: str = Field(description="Ngày tham chiếu (ISO format)")
