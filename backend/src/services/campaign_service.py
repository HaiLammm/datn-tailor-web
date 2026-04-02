"""Campaign Service - Story 6.4: Broadcasting & Template SMS/SNS.

Manages broadcast campaign CRUD, recipient resolution, email dispatch,
and campaign analytics. Owner-only access enforced at API layer.

Channel support:
- email: Fully functional via existing SMTP (email_service.py)
- sms: Stub - logs warning, raises NotImplementedError
- zalo: Stub - logs warning, raises NotImplementedError
"""

import asyncio
import logging
import uuid
from datetime import date, datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.campaign import (
    CampaignAnalytics,
    CampaignCreateRequest,
    CampaignResponse,
    CampaignsSummary,
    CampaignUpdateRequest,
    SegmentInfo,
    SegmentType,
)
from src.models.db_models import (
    CampaignDB,
    CampaignRecipientDB,
    LeadDB,
    MessageTemplateDB,
    UserDB,
    UserVoucherDB,
    VoucherDB,
)
from src.services import template_service
from src.services.email_service import (
    create_campaign_email_html,
    send_campaign_email,
)

logger = logging.getLogger(__name__)

# Max concurrent email sends to avoid SMTP rate limits
_SEND_CONCURRENCY = 5


# ---------- Segment resolution ----------

async def resolve_segment(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    segment: SegmentType,
) -> list[dict]:
    """Resolve a segment type to a list of recipients.

    Returns:
        List of dicts: {user_id: UUID|None, email: str, name: str}
    """
    recipients: list[dict] = []
    seen_emails: set[str] = set()

    if segment == SegmentType.all_customers:
        result = await db.execute(
            select(UserDB).where(
                UserDB.tenant_id == tenant_id,
                UserDB.role == "Customer",
                UserDB.is_active == True,  # noqa: E712
                UserDB.email.isnot(None),
            )
        )
        for user in result.scalars().all():
            if user.email:
                if user.email in seen_emails:
                    continue
                seen_emails.add(user.email)
                recipients.append({
                    "user_id": user.id,
                    "email": user.email,
                    "name": user.full_name or user.email.split("@")[0],
                })

    elif segment in (SegmentType.hot_leads, SegmentType.warm_leads, SegmentType.cold_leads):
        classification_map = {
            SegmentType.hot_leads: "hot",
            SegmentType.warm_leads: "warm",
            SegmentType.cold_leads: "cold",
        }
        classification = classification_map[segment]
        result = await db.execute(
            select(LeadDB).where(
                LeadDB.tenant_id == tenant_id,
                LeadDB.classification == classification,
                LeadDB.email.isnot(None),
            )
        )
        for lead in result.scalars().all():
            if lead.email:
                if lead.email in seen_emails:
                    continue
                seen_emails.add(lead.email)
                recipients.append({
                    "user_id": None,
                    "email": lead.email,
                    "name": lead.name or lead.email.split("@")[0],
                })

    elif segment == SegmentType.voucher_holders:
        result = await db.execute(
            select(UserDB, UserVoucherDB).join(
                UserVoucherDB, UserVoucherDB.user_id == UserDB.id
            ).join(
                VoucherDB, VoucherDB.id == UserVoucherDB.voucher_id
            ).where(
                UserDB.tenant_id == tenant_id,
                VoucherDB.tenant_id == tenant_id,
                VoucherDB.is_active == True,  # noqa: E712
                UserDB.is_active == True,  # noqa: E712
                UserDB.email.isnot(None),
            ).distinct(UserDB.id)
        )
        seen: set[uuid.UUID] = set()
        for user, _ in result.all():
            if user.email and user.id not in seen:
                if user.email in seen_emails:
                    continue
                seen_emails.add(user.email)
                seen.add(user.id)
                recipients.append({
                    "user_id": user.id,
                    "email": user.email,
                    "name": user.full_name or user.email.split("@")[0],
                })

    return recipients


async def count_segment_recipients(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    segment: SegmentType,
) -> int:
    """Count recipients for a segment using COUNT queries instead of loading full rows."""
    if segment == SegmentType.all_customers:
        result = await db.execute(
            select(func.count()).where(
                UserDB.tenant_id == tenant_id,
                UserDB.role == "Customer",
                UserDB.is_active == True,  # noqa: E712
                UserDB.email.isnot(None),
            )
        )
        return result.scalar() or 0

    elif segment in (SegmentType.hot_leads, SegmentType.warm_leads, SegmentType.cold_leads):
        classification_map = {
            SegmentType.hot_leads: "hot",
            SegmentType.warm_leads: "warm",
            SegmentType.cold_leads: "cold",
        }
        classification = classification_map[segment]
        result = await db.execute(
            select(func.count()).where(
                LeadDB.tenant_id == tenant_id,
                LeadDB.classification == classification,
                LeadDB.email.isnot(None),
            )
        )
        return result.scalar() or 0

    elif segment == SegmentType.voucher_holders:
        result = await db.execute(
            select(func.count(func.distinct(UserDB.id))).select_from(
                UserDB
            ).join(
                UserVoucherDB, UserVoucherDB.user_id == UserDB.id
            ).join(
                VoucherDB, VoucherDB.id == UserVoucherDB.voucher_id
            ).where(
                UserDB.tenant_id == tenant_id,
                VoucherDB.tenant_id == tenant_id,
                VoucherDB.is_active == True,  # noqa: E712
                UserDB.is_active == True,  # noqa: E712
                UserDB.email.isnot(None),
            )
        )
        return result.scalar() or 0

    return 0


async def get_segment_infos(
    db: AsyncSession,
    tenant_id: uuid.UUID,
) -> list[SegmentInfo]:
    """Get all segment options with current recipient counts."""
    segment_labels = {
        SegmentType.all_customers: "Tat ca khach hang",
        SegmentType.hot_leads: "Lead Hot",
        SegmentType.warm_leads: "Lead Warm",
        SegmentType.cold_leads: "Lead Cold",
        SegmentType.voucher_holders: "Nguoi so huu voucher",
    }
    infos = []
    for seg_type, label in segment_labels.items():
        count = await count_segment_recipients(db, tenant_id, seg_type)
        infos.append(SegmentInfo(
            segment=seg_type,
            label=label,
            recipient_count=count,
        ))
    return infos


# ---------- CRUD ----------

def _build_campaign_response(campaign: CampaignDB) -> CampaignResponse:
    """Build CampaignResponse from ORM with joined template/voucher info."""
    return CampaignResponse(
        id=campaign.id,
        name=campaign.name,
        channel=campaign.channel,
        template_id=campaign.template_id,
        template_name=campaign.template.name if campaign.template else "",
        segment=campaign.segment,
        voucher_id=campaign.voucher_id,
        voucher_code=None,  # populated separately when needed
        status=campaign.status,
        scheduled_at=campaign.scheduled_at,
        sent_at=campaign.sent_at,
        total_recipients=campaign.total_recipients,
        sent_count=campaign.sent_count,
        failed_count=campaign.failed_count,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
    )


async def list_campaigns(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    status_filter: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[CampaignResponse], int]:
    """List campaigns for a tenant with optional status filter."""
    query = select(CampaignDB).where(CampaignDB.tenant_id == tenant_id)

    if status_filter:
        query = query.where(CampaignDB.status == status_filter)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Paginate, newest first
    query = query.order_by(CampaignDB.created_at.desc())
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    campaigns = result.scalars().all()

    # Eager load template names and voucher codes
    responses = []
    for c in campaigns:
        # Load template name
        tpl = await db.get(MessageTemplateDB, c.template_id)
        template_name = tpl.name if tpl else ""

        # Load voucher code if attached
        voucher_code = None
        if c.voucher_id:
            v = await db.get(VoucherDB, c.voucher_id)
            voucher_code = v.code if v else None

        responses.append(CampaignResponse(
            id=c.id,
            name=c.name,
            channel=c.channel,
            template_id=c.template_id,
            template_name=template_name,
            segment=c.segment,
            voucher_id=c.voucher_id,
            voucher_code=voucher_code,
            status=c.status,
            scheduled_at=c.scheduled_at,
            sent_at=c.sent_at,
            total_recipients=c.total_recipients,
            sent_count=c.sent_count,
            failed_count=c.failed_count,
            created_at=c.created_at,
            updated_at=c.updated_at,
        ))

    return responses, total


async def get_campaign(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    campaign_id: uuid.UUID,
) -> CampaignDB | None:
    """Get a single campaign by ID with tenant isolation."""
    result = await db.execute(
        select(CampaignDB).where(
            CampaignDB.id == campaign_id,
            CampaignDB.tenant_id == tenant_id,
        )
    )
    return result.scalar_one_or_none()


async def get_campaign_response(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    campaign_id: uuid.UUID,
) -> CampaignResponse | None:
    """Get campaign with enriched response data."""
    campaign = await get_campaign(db, tenant_id, campaign_id)
    if not campaign:
        return None

    tpl = await db.get(MessageTemplateDB, campaign.template_id)
    voucher_code = None
    if campaign.voucher_id:
        v = await db.get(VoucherDB, campaign.voucher_id)
        voucher_code = v.code if v else None

    return CampaignResponse(
        id=campaign.id,
        name=campaign.name,
        channel=campaign.channel,
        template_id=campaign.template_id,
        template_name=tpl.name if tpl else "",
        segment=campaign.segment,
        voucher_id=campaign.voucher_id,
        voucher_code=voucher_code,
        status=campaign.status,
        scheduled_at=campaign.scheduled_at,
        sent_at=campaign.sent_at,
        total_recipients=campaign.total_recipients,
        sent_count=campaign.sent_count,
        failed_count=campaign.failed_count,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
    )


async def create_campaign(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    data: CampaignCreateRequest,
) -> CampaignDB:
    """Create a new campaign in draft status.

    Validates:
    - Name unique per tenant
    - Template exists and belongs to tenant
    - Voucher (if provided) is active and belongs to tenant
    - scheduled_at must be in the future if set

    Raises:
        HTTPException 400/404/409
    """
    # Check name uniqueness
    existing = await db.execute(
        select(CampaignDB).where(
            CampaignDB.tenant_id == tenant_id,
            CampaignDB.name == data.name,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Chien dich '{data.name}' da ton tai",
        )

    # Validate template
    tpl = await template_service.get_template(db, tenant_id, data.template_id)
    if not tpl:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khong tim thay template",
        )

    # Validate voucher if provided
    if data.voucher_id:
        voucher = await db.execute(
            select(VoucherDB).where(
                VoucherDB.id == data.voucher_id,
                VoucherDB.tenant_id == tenant_id,
            )
        )
        v = voucher.scalar_one_or_none()
        if not v:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Khong tim thay voucher",
            )
        if not v.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Voucher khong hoat dong",
            )
        if v.expiry_date and v.expiry_date < date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Voucher da het han su dung",
            )

    # Validate scheduled_at
    if data.scheduled_at and data.scheduled_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thoi gian lich phai o tuong lai",
        )

    campaign = CampaignDB(
        tenant_id=tenant_id,
        name=data.name,
        channel=data.channel.value,
        template_id=data.template_id,
        segment=data.segment.value,
        voucher_id=data.voucher_id,
        status="draft",
        scheduled_at=data.scheduled_at,
    )
    db.add(campaign)
    await db.flush()
    await db.commit()
    await db.refresh(campaign)
    return campaign


async def update_campaign(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    campaign_id: uuid.UUID,
    data: CampaignUpdateRequest,
) -> CampaignDB | None:
    """Update a draft campaign.

    Only draft campaigns can be updated.

    Returns:
        Updated campaign or None if not found.
    """
    campaign = await get_campaign(db, tenant_id, campaign_id)
    if not campaign:
        return None

    if campaign.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chi co the chinh sua chien dich o trang thai 'draft'",
        )

    update_data = data.model_dump(exclude_unset=True)

    # Validate new name uniqueness
    new_name = update_data.get("name")
    if new_name and new_name != campaign.name:
        existing = await db.execute(
            select(CampaignDB).where(
                CampaignDB.tenant_id == tenant_id,
                CampaignDB.name == new_name,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Chien dich '{new_name}' da ton tai",
            )

    # Validate new template
    new_template_id = update_data.get("template_id")
    if new_template_id:
        tpl = await template_service.get_template(db, tenant_id, new_template_id)
        if not tpl:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay template")

    # Validate new voucher
    new_voucher_id = update_data.get("voucher_id")
    if new_voucher_id is not None:
        v_result = await db.execute(
            select(VoucherDB).where(
                VoucherDB.id == new_voucher_id,
                VoucherDB.tenant_id == tenant_id,
                VoucherDB.is_active == True,  # noqa: E712
            )
        )
        if not v_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Khong tim thay voucher hoat dong",
            )

    for key, value in update_data.items():
        if key == "channel" and hasattr(value, "value"):
            value = value.value
        elif key == "segment" and hasattr(value, "value"):
            value = value.value
        setattr(campaign, key, value)
    campaign.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.commit()
    await db.refresh(campaign)
    return campaign


async def delete_campaign(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    campaign_id: uuid.UUID,
) -> bool:
    """Delete a campaign — only draft or failed campaigns.

    Returns:
        True if deleted, False if not found.

    Raises:
        HTTPException 400: Campaign already sent/sending.
    """
    campaign = await get_campaign(db, tenant_id, campaign_id)
    if not campaign:
        return False

    if campaign.status not in ("draft", "failed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chi co the xoa chien dich o trang thai 'draft' hoac 'failed'",
        )

    await db.delete(campaign)
    await db.flush()
    await db.commit()
    return True


# ---------- Sending ----------

async def _dispatch_email_recipient(
    recipient: dict,
    subject: str,
    template_body: str,
    shop_name: str,
    voucher_code: str | None,
    voucher_value: str | None,
    expiry_date: str | None,
) -> bool:
    """Render template and send email to a single recipient."""
    variables = template_service.build_variables(
        recipient_name=recipient["name"],
        recipient_email=recipient["email"],
        voucher_code=voucher_code,
        voucher_value=voucher_value,
        expiry_date=expiry_date,
        shop_name=shop_name,
    )
    rendered_body = template_service.render_variables(template_body, variables)
    rendered_subject = template_service.render_variables(subject or shop_name, variables)
    html_content = create_campaign_email_html(rendered_body, shop_name)
    return await send_campaign_email(recipient["email"], rendered_subject, html_content)


async def _dispatch_sms_recipient(_recipient: dict, _body: str) -> bool:
    """SMS channel stub — not yet implemented."""
    logger.warning("SMS channel not configured. Message not sent to %s", _recipient.get("email"))
    raise NotImplementedError("Kênh SMS chua duoc cau hinh. Vui long su dung Email.")


async def _dispatch_zalo_recipient(_recipient: dict, _body: str) -> bool:
    """Zalo OA channel stub — not yet implemented."""
    logger.warning("Zalo OA channel not configured. Message not sent to %s", _recipient.get("email"))
    raise NotImplementedError("Kênh Zalo OA chua duoc cau hinh. Vui long su dung Email.")


async def send_campaign(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    campaign_id: uuid.UUID,
    shop_name: str = "Nhà May Thanh Lộc",
) -> CampaignDB:
    """Trigger campaign dispatch to all segment recipients.

    - Resolves recipient list from segment
    - Renders template per-recipient with personalized variables
    - Dispatches via appropriate channel (Email functional; SMS/Zalo stubbed)
    - Logs each recipient result to campaign_recipients table
    - Updates campaign counters and status

    Raises:
        HTTPException 400: Campaign not in draft/scheduled, no recipients, unsupported channel
        HTTPException 404: Campaign not found
    """
    campaign = await get_campaign(db, tenant_id, campaign_id)
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay chien dich")

    if campaign.status not in ("draft", "scheduled", "failed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chi co the gui chien dich o trang thai 'draft', 'scheduled', hoac 'failed'",
        )

    # Validate channel support
    if campaign.channel in ("sms", "zalo"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Kênh '{campaign.channel}' chua duoc cau hinh. Hien tai chi ho tro Email va Account.",
        )

    # Account channel requires voucher_id
    if campaign.channel == "account" and not campaign.voucher_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kênh 'Account' yêu cầu chọn voucher để gán cho khách hàng",
        )

    # Load template
    tpl = await template_service.get_template(db, tenant_id, campaign.template_id)
    if not tpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay template")

    # Load voucher info if attached
    voucher_code = None
    voucher_value = None
    expiry_date_str = None
    if campaign.voucher_id:
        v = await db.get(VoucherDB, campaign.voucher_id)
        if v:
            voucher_code = v.code
            if v.type == "percent":
                voucher_value = f"{v.value}%"
            else:
                voucher_value = f"{int(v.value):,} VND"
            expiry_date_str = v.expiry_date.strftime("%d/%m/%Y") if v.expiry_date else ""

    # Resolve recipients
    recipients = await resolve_segment(db, tenant_id, SegmentType(campaign.segment))
    if not recipients:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phân khúc khach hang nay hien tai chua co ai. Khong the gui.",
        )

    # Mark campaign as sending
    campaign.status = "sending"
    campaign.total_recipients = len(recipients)
    campaign.sent_count = 0
    campaign.failed_count = 0
    await db.flush()
    await db.commit()

    try:
        # Delete old recipient records if re-sending a failed campaign
        old_recipients = await db.execute(
            select(CampaignRecipientDB).where(
                CampaignRecipientDB.campaign_id == campaign.id
            )
        )
        for old_rec in old_recipients.scalars().all():
            await db.delete(old_rec)
        await db.flush()
        await db.commit()

        # Create recipient log records
        for r in recipients:
            rec = CampaignRecipientDB(
                campaign_id=campaign.id,
                user_id=r.get("user_id"),
                email=r["email"],
                recipient_name=r["name"],
                status="pending",
            )
            db.add(rec)
        await db.flush()
        await db.commit()

        # Reload recipient records keyed by id for safe sequential update
        result = await db.execute(
            select(CampaignRecipientDB).where(
                CampaignRecipientDB.campaign_id == campaign.id
            )
        )
        db_records = {r.email: r for r in result.scalars().all()}

        # Account channel: assign voucher directly to customer accounts (no email)
        if campaign.channel == "account":
            sent = 0
            failed = 0
            now = datetime.now(timezone.utc)
            for r in recipients:
                rec = db_records.get(r["email"])
                if r.get("user_id") and campaign.voucher_id:
                    try:
                        existing = await db.execute(
                            select(UserVoucherDB).where(
                                UserVoucherDB.user_id == r["user_id"],
                                UserVoucherDB.voucher_id == campaign.voucher_id,
                            )
                        )
                        if not existing.scalar_one_or_none():
                            db.add(UserVoucherDB(
                                tenant_id=campaign.tenant_id,
                                user_id=r["user_id"],
                                voucher_id=campaign.voucher_id,
                            ))
                        sent += 1
                        if rec:
                            rec.status = "sent"
                            rec.sent_at = now
                    except Exception as e:
                        failed += 1
                        logger.warning("Voucher assign failed for %s: %s", r["email"], e)
                        if rec:
                            rec.status = "failed"
                            rec.error_message = str(e)
                else:
                    failed += 1
                    if rec:
                        rec.status = "failed"
                        rec.error_message = "Recipient has no account"

            campaign.sent_count = sent
            campaign.failed_count = failed
            campaign.status = "sent" if sent > 0 else "failed"
            campaign.sent_at = now
            campaign.updated_at = now
            await db.flush()
            await db.commit()
            await db.refresh(campaign)

            logger.info(
                "Campaign %s (account channel): %d assigned, %d failed",
                campaign.id, sent, failed,
            )
            return campaign

        # Send emails with concurrency limit — gather results, then update ORM sequentially
        semaphore = asyncio.Semaphore(_SEND_CONCURRENCY)

        async def send_one(recipient: dict) -> tuple[str, bool]:
            """Return (email, success) without touching ORM or shared state."""
            async with semaphore:
                try:
                    success = await _dispatch_email_recipient(
                        recipient=recipient,
                        subject=tpl.subject or shop_name,
                        template_body=tpl.body,
                        shop_name=shop_name,
                        voucher_code=voucher_code,
                        voucher_value=voucher_value,
                        expiry_date=expiry_date_str,
                    )
                    return (recipient["email"], success)
                except Exception as e:
                    logger.error("Send failed for %s: %s", recipient["email"], e)
                    return (recipient["email"], False)

        results = await asyncio.gather(*[send_one(r) for r in recipients])

        # Update ORM objects sequentially (safe for AsyncSession)
        sent = 0
        failed = 0
        voucher_assign_failures = 0
        now = datetime.now(timezone.utc)
        # Build email→recipient mapping for voucher assignment
        email_to_recipient = {r["email"]: r for r in recipients}

        for email, success in results:
            rec = db_records.get(email)
            if success:
                sent += 1
                if rec:
                    rec.status = "sent"
                    rec.sent_at = now

                # Assign voucher to recipient's account (if campaign has voucher + recipient has user_id)
                if campaign.voucher_id:
                    r_data = email_to_recipient.get(email)
                    if r_data and r_data.get("user_id"):
                        try:
                            # Check if already assigned
                            existing = await db.execute(
                                select(UserVoucherDB).where(
                                    UserVoucherDB.user_id == r_data["user_id"],
                                    UserVoucherDB.voucher_id == campaign.voucher_id,
                                )
                            )
                            if not existing.scalar_one_or_none():
                                db.add(UserVoucherDB(
                                    tenant_id=campaign.tenant_id,
                                    user_id=r_data["user_id"],
                                    voucher_id=campaign.voucher_id,
                                ))
                        except Exception as e:
                            voucher_assign_failures += 1
                            logger.error(
                                "Failed to assign voucher %s to user %s: %s",
                                campaign.voucher_id, r_data["user_id"], e
                            )
                            if rec:
                                rec.error_message = f"Email sent, voucher assign failed: {e}"
            else:
                failed += 1
                if rec:
                    rec.status = "failed"
                    rec.error_message = "SMTP send failed"

        if voucher_assign_failures > 0:
            logger.error(
                "Campaign %s: %d voucher assignment(s) failed out of %d sent emails",
                campaign.id, voucher_assign_failures, sent,
            )

        # Update campaign final state
        campaign.sent_count = sent
        campaign.failed_count = failed
        campaign.status = "sent" if sent > 0 else "failed"
        campaign.sent_at = datetime.now(timezone.utc)
        campaign.updated_at = datetime.now(timezone.utc)

        await db.flush()
        await db.commit()
        await db.refresh(campaign)

    except Exception as e:
        logger.error("Campaign %s dispatch failed: %s", campaign.id, e)
        # Rollback to failed status so campaign can be re-sent
        await db.rollback()
        campaign = await get_campaign(db, tenant_id, campaign_id)
        if campaign and campaign.status == "sending":
            campaign.status = "failed"
            campaign.updated_at = datetime.now(timezone.utc)
            await db.flush()
            await db.commit()
            await db.refresh(campaign)
        raise

    logger.info(
        "Campaign %s sent: %d recipients, %d sent, %d failed",
        campaign.id,
        len(recipients),
        sent,
        failed,
    )
    return campaign


# ---------- Analytics ----------

async def get_campaign_analytics(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    campaign_id: uuid.UUID,
) -> CampaignAnalytics | None:
    """Get delivery analytics for a specific campaign."""
    campaign = await get_campaign(db, tenant_id, campaign_id)
    if not campaign:
        return None

    # Count voucher redemptions if campaign has voucher
    voucher_redemptions = 0
    if campaign.voucher_id:
        v = await db.get(VoucherDB, campaign.voucher_id)
        voucher_redemptions = v.used_count if v else 0

    return CampaignAnalytics(
        total_recipients=campaign.total_recipients,
        sent_count=campaign.sent_count,
        failed_count=campaign.failed_count,
        opened_count=0,  # Requires email tracking pixel (future enhancement)
        clicked_count=0,  # Requires tracked links (future enhancement)
        open_rate=0.0,  # Requires email tracking pixel (future enhancement)
        click_rate=0.0,  # Requires tracked links (future enhancement)
        voucher_redemptions=voucher_redemptions,
    )


async def get_campaigns_summary(
    db: AsyncSession,
    tenant_id: uuid.UUID,
) -> CampaignsSummary:
    """Get aggregate campaign stats for a tenant."""
    # Total campaigns
    total_result = await db.execute(
        select(func.count()).where(CampaignDB.tenant_id == tenant_id)
    )
    total_campaigns = total_result.scalar() or 0

    # Sent campaigns
    sent_result = await db.execute(
        select(func.count()).where(
            CampaignDB.tenant_id == tenant_id,
            CampaignDB.status == "sent",
        )
    )
    sent_campaigns = sent_result.scalar() or 0

    # Total messages sent this month
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_result = await db.execute(
        select(func.coalesce(func.sum(CampaignDB.sent_count), 0)).where(
            CampaignDB.tenant_id == tenant_id,
            CampaignDB.sent_at >= month_start,
        )
    )
    total_messages_this_month = int(monthly_result.scalar() or 0)

    return CampaignsSummary(
        total_campaigns=total_campaigns,
        sent_campaigns=sent_campaigns,
        avg_open_rate=0.0,  # Requires tracking (future enhancement)
        total_messages_this_month=total_messages_this_month,
    )


async def get_campaign_recipients(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    campaign_id: uuid.UUID,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[CampaignRecipientDB], int]:
    """Get paginated recipient log for a campaign."""
    # Verify campaign belongs to tenant
    campaign = await get_campaign(db, tenant_id, campaign_id)
    if not campaign:
        return [], 0

    query = select(CampaignRecipientDB).where(
        CampaignRecipientDB.campaign_id == campaign_id
    )

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar() or 0

    query = query.order_by(CampaignRecipientDB.created_at.asc())
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    return list(result.scalars().all()), total
