"""Pydantic schemas for Campaign and Message Template management (Story 6.4).

Broadcasting & Template SMS/SNS — Owner creates bulk outreach campaigns
with template messages sent to customer segments via email (with SMS/Zalo stubs).
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, field_validator


class ChannelType(str, Enum):
    """Supported broadcast channels. Email is functional; SMS/Zalo are stubs."""
    email = "email"
    sms = "sms"
    zalo = "zalo"


class CampaignStatus(str, Enum):
    """Campaign lifecycle statuses."""
    draft = "draft"
    scheduled = "scheduled"
    sending = "sending"
    sent = "sent"
    failed = "failed"


class RecipientStatus(str, Enum):
    """Per-recipient delivery statuses."""
    pending = "pending"
    sent = "sent"
    failed = "failed"


class SegmentType(str, Enum):
    """Audience segment types for campaign targeting."""
    all_customers = "all_customers"
    hot_leads = "hot_leads"
    warm_leads = "warm_leads"
    cold_leads = "cold_leads"
    voucher_holders = "voucher_holders"


# ---------- Message Template Schemas ----------

class TemplateCreateRequest(BaseModel):
    """Request to create a new message template."""
    name: str
    channel: ChannelType = ChannelType.email
    subject: Optional[str] = None       # required for email channel
    body: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Tên template không được để trống")
        if len(v) > 100:
            raise ValueError("Tên template tối đa 100 ký tự")
        return v

    @field_validator("body")
    @classmethod
    def body_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Nội dung template không được để trống")
        return v


class TemplateUpdateRequest(BaseModel):
    """Request to update an existing template. All fields optional."""
    name: Optional[str] = None
    channel: Optional[ChannelType] = None
    subject: Optional[str] = None
    body: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Tên template không được để trống")
            if len(v) > 100:
                raise ValueError("Tên template tối đa 100 ký tự")
        return v

    @field_validator("body")
    @classmethod
    def body_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Nội dung template không được để trống")
        return v


class TemplateResponse(BaseModel):
    """Response schema for a message template."""
    id: uuid.UUID
    name: str
    channel: ChannelType
    subject: Optional[str]
    body: str
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TemplatePreviewRequest(BaseModel):
    """Request to preview a template with sample variable substitution."""
    sample_name: str = "Nguyen Van A"
    sample_voucher_code: str = "TETLUXV26"
    sample_voucher_value: str = "20%"
    sample_expiry_date: str = "31/12/2026"
    sample_shop_name: str = "Tailor Project"


class TemplatePreviewResponse(BaseModel):
    """Rendered preview of a template with sample data."""
    subject: Optional[str]
    body: str


# ---------- Campaign Schemas ----------

class CampaignCreateRequest(BaseModel):
    """Request to create a new broadcast campaign."""
    name: str
    channel: ChannelType = ChannelType.email
    template_id: uuid.UUID
    segment: SegmentType
    voucher_id: Optional[uuid.UUID] = None
    scheduled_at: Optional[datetime] = None    # null = immediate when send triggered

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Tên chiến dịch không được để trống")
        if len(v) > 200:
            raise ValueError("Tên chiến dịch tối đa 200 ký tự")
        return v


class CampaignUpdateRequest(BaseModel):
    """Request to update a draft campaign. Only draft campaigns can be updated."""
    name: Optional[str] = None
    channel: Optional[ChannelType] = None
    template_id: Optional[uuid.UUID] = None
    segment: Optional[SegmentType] = None
    voucher_id: Optional[uuid.UUID] = None
    scheduled_at: Optional[datetime] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Tên chiến dịch không được để trống")
        return v


class CampaignResponse(BaseModel):
    """Response schema for a campaign with joined template/voucher info."""
    id: uuid.UUID
    name: str
    channel: ChannelType
    template_id: uuid.UUID
    template_name: str
    segment: SegmentType
    voucher_id: Optional[uuid.UUID]
    voucher_code: Optional[str]
    status: CampaignStatus
    scheduled_at: Optional[datetime]
    sent_at: Optional[datetime]
    total_recipients: int
    sent_count: int
    failed_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CampaignAnalytics(BaseModel):
    """Per-campaign delivery and engagement analytics."""
    total_recipients: int
    sent_count: int
    failed_count: int
    opened_count: int = 0   # 0 placeholder (requires email tracking pixel)
    clicked_count: int = 0  # 0 placeholder (requires tracked links)
    open_rate: float        # 0.0 placeholder (requires email tracking pixel)
    click_rate: float       # 0.0 placeholder (requires tracked links)
    voucher_redemptions: int


class CampaignsSummary(BaseModel):
    """Aggregate summary of all campaigns for a tenant."""
    total_campaigns: int
    sent_campaigns: int
    avg_open_rate: float
    total_messages_this_month: int


class SegmentInfo(BaseModel):
    """Segment option with its current recipient count."""
    segment: SegmentType
    label: str
    recipient_count: int


class CampaignRecipientResponse(BaseModel):
    """Per-recipient record in a campaign send log."""
    id: uuid.UUID
    email: Optional[str]
    recipient_name: Optional[str]
    status: RecipientStatus
    sent_at: Optional[datetime]
    error_message: Optional[str]

    model_config = {"from_attributes": True}
