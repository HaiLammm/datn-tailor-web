"""Pydantic models for the post-delivery alteration warranty (Story 12.7, FR101).

A bespoke order's customer may request free fit alterations within the
tenant's warranty window after delivery — each request is owner-gated, and a
new one may follow once the previous alteration closes (deliberate; the owner
is the rate limiter, not the system). The request is lightweight by design:
no dedicated table — orders.alteration_requested_at marks the pending request
and the approved work becomes a TailorTask with task_type='alteration'.
All window math is computed server-side (Authoritative Server Pattern) — the
frontend renders AlterationInfo verbatim and never derives warranty state
from raw dates.
"""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class AlterationRequestCreate(BaseModel):
    """Request body for POST /api/v1/orders/{order_id}/request-alteration."""

    description: str = Field(
        min_length=10, max_length=2000,
        description="Mô tả chỗ chưa vừa (khách hàng tự viết)",
    )

    @field_validator("description")
    @classmethod
    def _strip_and_enforce_min(cls, value: str) -> str:
        """Mirror the FE Zod `.trim().min(10)`: whitespace-only padding must not
        satisfy the minimum, and the stored value is the stripped one."""
        stripped = value.strip()
        if len(stripped) < 10:
            raise ValueError("Vui lòng mô tả chỗ chưa vừa (ít nhất 10 ký tự)")
        return stripped


class AlterationRequestResponse(BaseModel):
    """Confirmation of a stored alteration request (pending owner approval)."""

    order_id: str
    alteration_requested_at: str


class ApproveAlterationRequest(BaseModel):
    """Request body for POST /api/v1/orders/{order_id}/approve-alteration."""

    tailor_id: uuid.UUID | None = Field(
        default=None,
        description="Optional tailor to assign immediately (else task stays unassigned)",
    )
    deadline: datetime | None = Field(default=None, description="Alteration deadline")
    notes: str | None = Field(default=None, max_length=2000, description="Owner notes for the tailor")


class AlterationInfo(BaseModel):
    """Server-computed warranty window state for the customer order detail.

    States:
    - available: within the window, no pending request, no open alteration task
    - pending: customer requested, waiting for owner approval
    - in_alteration: owner approved — an alteration task is open
    - expired: outside the warranty window
    """

    state: Literal["available", "pending", "in_alteration", "expired"]
    warranty_days: int
    remaining_days: int = Field(
        description="Whole days left in the window (0 on the boundary day / when expired)"
    )
    requested_at: datetime | None = None
    # The customer's own submitted description (pending state only) so they can
    # re-read what they asked for while waiting for the shop's confirmation.
    request_note: str | None = None
