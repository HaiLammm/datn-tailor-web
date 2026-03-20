"""Pydantic schemas for Tailor Task endpoints (Story 5.3, 5.2)."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class TailorTaskResponse(BaseModel):
    """Single tailor task response."""

    id: str
    tenant_id: str
    order_id: str
    order_item_id: str | None = None
    assigned_to: str
    assigned_by: str
    garment_name: str
    customer_name: str
    status: str = Field(description="assigned | in_progress | completed")
    deadline: str | None = None
    notes: str | None = None
    piece_rate: float | None = None
    design_id: str | None = None
    completed_at: str | None = None
    is_overdue: bool = False
    days_until_deadline: int | None = None
    created_at: str
    updated_at: str


class TailorTaskSummary(BaseModel):
    """Task count summary by status."""

    total: int = 0
    assigned: int = 0
    in_progress: int = 0
    completed: int = 0
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
    """Detailed task view extending base response with order and design info."""

    order_info: OrderInfoForTask | None = None


class StatusUpdateRequest(BaseModel):
    """Request body for status update.

    Only allows forward transitions: in_progress or completed.
    """

    status: Literal["in_progress", "completed"] = Field(
        description="Target status: in_progress or completed (no backward transitions)"
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
