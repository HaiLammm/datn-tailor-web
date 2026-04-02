"""Template Service - Story 6.4: Broadcasting & Template SMS/SNS.

CRUD for message templates used in broadcast campaigns.
Templates support variable interpolation: {{name}}, {{voucher_code}}, etc.
"""

import html
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.db_models import CampaignDB, MessageTemplateDB
from src.models.campaign import (
    TemplateCreateRequest,
    TemplatePreviewRequest,
    TemplatePreviewResponse,
    TemplateUpdateRequest,
)

# ---------- Default templates seeded per tenant ----------

DEFAULT_TEMPLATES = [
    {
        "name": "Khuyen mai thang",
        "channel": "email",
        "subject": "Uu dai dac biet danh rieng cho ban - {{shop_name}}",
        "body": (
            "Xin chao {{name}},\n\n"
            "{{shop_name}} gui ban ma giam gia dac biet: {{voucher_code}}\n"
            "Giam: {{voucher_value}}\n"
            "Han su dung: {{expiry_date}}\n\n"
            "Ap dung khi mua hang tai {{shop_name}}.\n\n"
            "Tran trong,\n{{shop_name}}"
        ),
        "is_default": True,
    },
    {
        "name": "Chao mung khach moi",
        "channel": "email",
        "subject": "Chao mung ban den voi {{shop_name}}!",
        "body": (
            "Xin chao {{name}},\n\n"
            "Cam on ban da tin tuong chon {{shop_name}}!\n"
            "Chung toi rat vui duoc phuc vu ban.\n\n"
            "Neu can ho tro, vui long lien he chung toi.\n\n"
            "Tran trong,\n{{shop_name}}"
        ),
        "is_default": True,
    },
    {
        "name": "Nhac hen lich",
        "channel": "email",
        "subject": "Nhac nho lich hen tai {{shop_name}}",
        "body": (
            "Xin chao {{name}},\n\n"
            "Day la nhac nho lich hen cua ban tai {{shop_name}} vao ngay mai.\n\n"
            "Chung toi mong duoc gap ban!\n\n"
            "Tran trong,\n{{shop_name}}"
        ),
        "is_default": True,
    },
    {
        "name": "Gan voucher tai khoan",
        "channel": "account",
        "subject": None,
        "body": (
            "Voucher {{voucher_code}} ({{voucher_value}}) da duoc gan vao tai khoan cua {{name}}.\n"
            "Han su dung: {{expiry_date}}"
        ),
        "is_default": True,
    },
]


async def ensure_default_templates(db: AsyncSession, tenant_id: uuid.UUID) -> None:
    """Seed default templates for a tenant if not yet created."""
    for tpl in DEFAULT_TEMPLATES:
        existing = await db.execute(
            select(MessageTemplateDB).where(
                MessageTemplateDB.tenant_id == tenant_id,
                MessageTemplateDB.name == tpl["name"],
            )
        )
        if existing.scalar_one_or_none() is None:
            db.add(MessageTemplateDB(
                tenant_id=tenant_id,
                name=tpl["name"],
                channel=tpl["channel"],
                subject=tpl.get("subject"),
                body=tpl["body"],
                is_default=tpl["is_default"],
            ))
    try:
        await db.flush()
        await db.commit()
    except IntegrityError:
        await db.rollback()


def render_variables(text: str, variables: dict[str, str]) -> str:
    """Replace {{variable}} placeholders with values.

    If variable value is empty string, placeholder is removed.
    """
    for key, value in variables.items():
        text = text.replace(f"{{{{{key}}}}}", value)
    return text


def build_variables(
    recipient_name: str,
    recipient_email: str,
    voucher_code: str | None,
    voucher_value: str | None,
    expiry_date: str | None,
    shop_name: str,
) -> dict[str, str]:
    """Build variable substitution map for template rendering.

    All values are HTML-escaped to prevent XSS in email content.
    """
    return {
        "name": html.escape(recipient_name or ""),
        "email": html.escape(recipient_email or ""),
        "voucher_code": html.escape(voucher_code or ""),
        "voucher_value": html.escape(voucher_value or ""),
        "expiry_date": html.escape(expiry_date or ""),
        "shop_name": html.escape(shop_name or "Nhà May Thanh Lộc"),
    }


async def list_templates(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    channel: str | None = None,
) -> list[MessageTemplateDB]:
    """List all templates for a tenant, optionally filtered by channel."""
    # Ensure default templates exist for this tenant
    await ensure_default_templates(db, tenant_id)

    query = select(MessageTemplateDB).where(
        MessageTemplateDB.tenant_id == tenant_id
    )
    if channel:
        query = query.where(MessageTemplateDB.channel == channel)

    query = query.order_by(MessageTemplateDB.is_default.desc(), MessageTemplateDB.created_at.asc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_template(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    template_id: uuid.UUID,
) -> MessageTemplateDB | None:
    """Get a single template by ID with tenant isolation."""
    result = await db.execute(
        select(MessageTemplateDB).where(
            MessageTemplateDB.id == template_id,
            MessageTemplateDB.tenant_id == tenant_id,
        )
    )
    return result.scalar_one_or_none()


async def create_template(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    data: TemplateCreateRequest,
) -> MessageTemplateDB:
    """Create a new message template (Owner only).

    Validates:
    - Name unique per tenant
    - Email templates must have subject

    Raises:
        HTTPException 400: Validation errors
        HTTPException 409: Duplicate name
    """
    if data.channel.value == "email" and not data.subject:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Template Email phai co tieu de (subject)",
        )

    # Check name uniqueness
    existing = await db.execute(
        select(MessageTemplateDB).where(
            MessageTemplateDB.tenant_id == tenant_id,
            MessageTemplateDB.name == data.name,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Template '{data.name}' da ton tai",
        )

    template = MessageTemplateDB(
        tenant_id=tenant_id,
        name=data.name,
        channel=data.channel.value,
        subject=data.subject,
        body=data.body,
        is_default=False,
    )
    db.add(template)
    await db.flush()
    await db.commit()
    await db.refresh(template)
    return template


async def update_template(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    template_id: uuid.UUID,
    data: TemplateUpdateRequest,
) -> MessageTemplateDB | None:
    """Update an existing template.

    Returns:
        Updated template or None if not found.
    """
    template = await get_template(db, tenant_id, template_id)
    if not template:
        return None

    update_data = data.model_dump(exclude_unset=True)

    # Check name uniqueness if name is changing
    new_name = update_data.get("name")
    if new_name and new_name != template.name:
        existing = await db.execute(
            select(MessageTemplateDB).where(
                MessageTemplateDB.tenant_id == tenant_id,
                MessageTemplateDB.name == new_name,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Template '{new_name}' da ton tai",
            )

    # Validate email subject
    effective_channel = update_data.get("channel", template.channel)
    if hasattr(effective_channel, "value"):
        effective_channel = effective_channel.value
    effective_subject = update_data.get("subject", template.subject)
    if effective_channel == "email" and not effective_subject:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Template Email phai co tieu de (subject)",
        )

    for key, value in update_data.items():
        if key == "channel" and hasattr(value, "value"):
            value = value.value
        setattr(template, key, value)
    template.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.commit()
    await db.refresh(template)
    return template


async def delete_template(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    template_id: uuid.UUID,
) -> bool:
    """Delete a template — only if not used in active/sent campaigns.

    Returns:
        True if deleted, False if not found.

    Raises:
        HTTPException 400: Template is used by campaigns.
    """
    template = await get_template(db, tenant_id, template_id)
    if not template:
        return False

    # Check if used by any campaign
    campaign_count_result = await db.execute(
        select(func.count()).select_from(
            select(CampaignDB).where(CampaignDB.template_id == template_id).subquery()
        )
    )
    if (campaign_count_result.scalar() or 0) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khong the xoa template dang duoc su dung boi chien dich",
        )

    await db.delete(template)
    await db.flush()
    await db.commit()
    return True


async def preview_template(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    template_id: uuid.UUID,
    data: TemplatePreviewRequest,
) -> TemplatePreviewResponse | None:
    """Render template with sample data for preview.

    Returns:
        Rendered subject and body, or None if template not found.
    """
    template = await get_template(db, tenant_id, template_id)
    if not template:
        return None

    variables = {
        "name": data.sample_name,
        "voucher_code": data.sample_voucher_code,
        "voucher_value": data.sample_voucher_value,
        "expiry_date": data.sample_expiry_date,
        "shop_name": data.sample_shop_name,
        "email": "khach@example.com",
    }

    rendered_body = render_variables(template.body, variables)
    rendered_subject = render_variables(template.subject, variables) if template.subject else None

    return TemplatePreviewResponse(subject=rendered_subject, body=rendered_body)
