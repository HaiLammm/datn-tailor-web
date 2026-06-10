"""Pydantic models for fitting rounds (Story 12.6, SCP 2026-06-10).

Bespoke production fitting loop: each round records an immutable outcome
(passed / needs_alteration) with optional adjustment notes.
round_number is computed server-side (Authoritative Server Pattern) —
the client never sends it.
"""

import uuid
from typing import Literal

from pydantic import BaseModel, Field


class FittingRoundCreate(BaseModel):
    """Request body for POST /api/v1/orders/{order_id}/fitting-rounds."""

    outcome: Literal["passed", "needs_alteration"]
    notes: str | None = Field(default=None, max_length=2000)
    appointment_id: uuid.UUID | None = Field(
        default=None,
        description="Informational reference to a booked appointment (no FK)",
    )
    version: int | None = Field(
        default=None, description="Client-known task version for optimistic locking"
    )


class FittingRoundResponse(BaseModel):
    """One fitting round row, ordered by round_number in list responses."""

    id: str
    order_id: str
    task_id: str
    round_number: int
    appointment_id: str | None = None
    outcome: str
    notes: str | None = None
    fitted_at: str | None = None
    created_at: str
