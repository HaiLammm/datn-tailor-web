"""Pydantic schemas for Tailor Task endpoints (Story 5.3)."""

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
    shipping_address: dict
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
