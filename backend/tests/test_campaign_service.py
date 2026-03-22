"""Service tests for Campaign management - Story 6.4: Broadcasting & Template SMS/SNS.

Tests Owner CRUD, send, analytics, segment resolution, and validation.
Uses in-memory SQLite for isolation.
"""

import uuid
from datetime import datetime, timezone, timedelta

import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import AsyncMock, patch

from src.models.db_models import (
    Base,
    CampaignDB,
    CampaignRecipientDB,
    LeadDB,
    MessageTemplateDB,
    TenantDB,
    UserDB,
    VoucherDB,
    UserVoucherDB,
)
from src.models.campaign import (
    CampaignCreateRequest,
    CampaignStatus,
    CampaignUpdateRequest,
    ChannelType,
    SegmentType,
)
from src.services import campaign_service, template_service

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

TENANT1_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
TENANT2_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")


@pytest_asyncio.fixture
async def test_db_engine():
    """Create test database engine with all tables."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db(test_db_engine):
    """Provide a test database session."""
    async_session = sessionmaker(test_db_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def seed_data(db: AsyncSession) -> dict:
    """Seed test database with tenants, users, leads, and vouchers."""
    tenant1 = TenantDB(id=TENANT1_ID, name="Tiem May 1", slug="tiem-may-1")
    tenant2 = TenantDB(id=TENANT2_ID, name="Tiem May 2", slug="tiem-may-2")

    customer1 = UserDB(
        id=uuid.uuid4(),
        email="customer1@example.com",
        role="Customer",
        is_active=True,
        tenant_id=TENANT1_ID,
        full_name="Nguyen Thi A",
    )
    customer2 = UserDB(
        id=uuid.uuid4(),
        email="customer2@example.com",
        role="Customer",
        is_active=True,
        tenant_id=TENANT1_ID,
        full_name="Tran Van B",
    )
    customer_other_tenant = UserDB(
        id=uuid.uuid4(),
        email="other@example.com",
        role="Customer",
        is_active=True,
        tenant_id=TENANT2_ID,
        full_name="Other Customer",
    )

    hot_lead = LeadDB(
        id=uuid.uuid4(),
        tenant_id=TENANT1_ID,
        name="Lead Hot",
        email="hot@lead.com",
        classification="hot",
        source="manual",
    )
    warm_lead = LeadDB(
        id=uuid.uuid4(),
        tenant_id=TENANT1_ID,
        name="Lead Warm",
        email="warm@lead.com",
        classification="warm",
        source="manual",
    )

    from decimal import Decimal
    from datetime import date
    voucher = VoucherDB(
        id=uuid.uuid4(),
        tenant_id=TENANT1_ID,
        code="TET2026",
        type="percent",
        value=Decimal("20"),
        min_order_value=Decimal("0"),
        expiry_date=date(2026, 12, 31),
        total_uses=100,
        is_active=True,
    )

    template = MessageTemplateDB(
        id=uuid.uuid4(),
        tenant_id=TENANT1_ID,
        name="Test Template",
        channel="email",
        subject="Uu dai {{voucher_value}} cho {{name}}",
        body="Xin chao {{name}}, ma giam: {{voucher_code}}",
        is_default=False,
    )

    db.add_all([tenant1, tenant2, customer1, customer2, customer_other_tenant,
                hot_lead, warm_lead, voucher, template])
    await db.flush()
    await db.commit()

    return {
        "tenant1_id": TENANT1_ID,
        "tenant2_id": TENANT2_ID,
        "customer1": customer1,
        "customer2": customer2,
        "hot_lead": hot_lead,
        "warm_lead": warm_lead,
        "voucher": voucher,
        "template": template,
    }


# ---------- Template Service Tests ----------

class TestTemplateService:

    @pytest.mark.asyncio
    async def test_list_templates_seeds_defaults(self, db: AsyncSession, seed_data: dict):
        """Listing templates creates default templates if none exist for channel."""
        templates = await template_service.list_templates(db, TENANT1_ID)
        names = [t.name for t in templates]
        # Default templates should be seeded + test template
        assert "Khuyen mai thang" in names
        assert "Chao mung khach moi" in names
        assert "Nhac hen lich" in names
        assert "Test Template" in names

    @pytest.mark.asyncio
    async def test_create_template_success(self, db: AsyncSession, seed_data: dict):
        from src.models.campaign import TemplateCreateRequest
        data = TemplateCreateRequest(
            name="My Custom Template",
            channel=ChannelType.email,
            subject="Hello {{name}}",
            body="Body content",
        )
        tpl = await template_service.create_template(db, TENANT1_ID, data)
        assert tpl.name == "My Custom Template"
        assert tpl.channel == "email"
        assert tpl.subject == "Hello {{name}}"
        assert tpl.is_default is False

    @pytest.mark.asyncio
    async def test_create_template_duplicate_name_raises_409(self, db: AsyncSession, seed_data: dict):
        from src.models.campaign import TemplateCreateRequest
        data = TemplateCreateRequest(
            name="Test Template",  # already exists in seed_data
            channel=ChannelType.email,
            subject="Any subject",
            body="Body",
        )
        with pytest.raises(HTTPException) as exc_info:
            await template_service.create_template(db, TENANT1_ID, data)
        assert exc_info.value.status_code == 409

    @pytest.mark.asyncio
    async def test_create_email_template_without_subject_raises_400(self, db: AsyncSession, seed_data: dict):
        from src.models.campaign import TemplateCreateRequest
        data = TemplateCreateRequest(
            name="No Subject Template",
            channel=ChannelType.email,
            subject=None,
            body="Body",
        )
        with pytest.raises(HTTPException) as exc_info:
            await template_service.create_template(db, TENANT1_ID, data)
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_render_variables_substitutes_all(self):
        text = "Hello {{name}}, code: {{voucher_code}}, shop: {{shop_name}}"
        variables = {"name": "Lan", "voucher_code": "TET2026", "shop_name": "Tiem May"}
        result = template_service.render_variables(text, variables)
        assert result == "Hello Lan, code: TET2026, shop: Tiem May"

    @pytest.mark.asyncio
    async def test_render_variables_empty_value_removes_placeholder(self):
        text = "Hello {{name}}, code: {{voucher_code}}"
        variables = {"name": "Lan", "voucher_code": ""}
        result = template_service.render_variables(text, variables)
        assert result == "Hello Lan, code: "

    @pytest.mark.asyncio
    async def test_preview_template_renders_sample_data(self, db: AsyncSession, seed_data: dict):
        from src.models.campaign import TemplatePreviewRequest
        tpl_id = seed_data["template"].id
        preview_req = TemplatePreviewRequest(
            sample_name="Test User",
            sample_voucher_code="PREVIEW123",
            sample_voucher_value="15%",
            sample_expiry_date="31/12/2026",
            sample_shop_name="My Shop",
        )
        preview = await template_service.preview_template(db, TENANT1_ID, tpl_id, preview_req)
        assert preview is not None
        assert "Test User" in preview.subject
        assert "PREVIEW123" in preview.body

    @pytest.mark.asyncio
    async def test_delete_template_not_in_use(self, db: AsyncSession, seed_data: dict):
        # Create a standalone template not used by any campaign
        from src.models.campaign import TemplateCreateRequest
        data = TemplateCreateRequest(
            name="Delete Me Template",
            channel=ChannelType.email,
            subject="Delete subject",
            body="Delete body",
        )
        tpl = await template_service.create_template(db, TENANT1_ID, data)
        result = await template_service.delete_template(db, TENANT1_ID, tpl.id)
        assert result is True

    @pytest.mark.asyncio
    async def test_delete_template_used_by_campaign_raises_400(self, db: AsyncSession, seed_data: dict):
        """Cannot delete template if it's used by a campaign."""
        tpl_id = seed_data["template"].id
        # Create a campaign that uses this template
        campaign = CampaignDB(
            tenant_id=TENANT1_ID,
            name="Blocking Campaign",
            channel="email",
            template_id=tpl_id,
            segment="all_customers",
            status="draft",
        )
        db.add(campaign)
        await db.flush()
        await db.commit()

        with pytest.raises(HTTPException) as exc_info:
            await template_service.delete_template(db, TENANT1_ID, tpl_id)
        assert exc_info.value.status_code == 400


# ---------- Campaign Service Tests ----------

class TestCampaignService:

    @pytest.mark.asyncio
    async def test_create_campaign_success(self, db: AsyncSession, seed_data: dict):
        data = CampaignCreateRequest(
            name="Spring Campaign",
            channel=ChannelType.email,
            template_id=seed_data["template"].id,
            segment=SegmentType.all_customers,
        )
        campaign = await campaign_service.create_campaign(db, TENANT1_ID, data)
        assert campaign.name == "Spring Campaign"
        assert campaign.status == "draft"
        assert campaign.channel == "email"
        assert campaign.segment == "all_customers"

    @pytest.mark.asyncio
    async def test_create_campaign_duplicate_name_raises_409(self, db: AsyncSession, seed_data: dict):
        data = CampaignCreateRequest(
            name="Duplicate Campaign",
            channel=ChannelType.email,
            template_id=seed_data["template"].id,
            segment=SegmentType.all_customers,
        )
        await campaign_service.create_campaign(db, TENANT1_ID, data)
        with pytest.raises(HTTPException) as exc_info:
            await campaign_service.create_campaign(db, TENANT1_ID, data)
        assert exc_info.value.status_code == 409

    @pytest.mark.asyncio
    async def test_create_campaign_nonexistent_template_raises_404(self, db: AsyncSession, seed_data: dict):
        data = CampaignCreateRequest(
            name="Bad Template Campaign",
            channel=ChannelType.email,
            template_id=uuid.uuid4(),  # non-existent
            segment=SegmentType.all_customers,
        )
        with pytest.raises(HTTPException) as exc_info:
            await campaign_service.create_campaign(db, TENANT1_ID, data)
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_create_campaign_with_voucher(self, db: AsyncSession, seed_data: dict):
        data = CampaignCreateRequest(
            name="Voucher Campaign",
            channel=ChannelType.email,
            template_id=seed_data["template"].id,
            segment=SegmentType.all_customers,
            voucher_id=seed_data["voucher"].id,
        )
        campaign = await campaign_service.create_campaign(db, TENANT1_ID, data)
        assert campaign.voucher_id == seed_data["voucher"].id

    @pytest.mark.asyncio
    async def test_update_draft_campaign(self, db: AsyncSession, seed_data: dict):
        data = CampaignCreateRequest(
            name="Campaign To Update",
            channel=ChannelType.email,
            template_id=seed_data["template"].id,
            segment=SegmentType.all_customers,
        )
        campaign = await campaign_service.create_campaign(db, TENANT1_ID, data)

        update_data = CampaignUpdateRequest(name="Updated Campaign Name")
        updated = await campaign_service.update_campaign(db, TENANT1_ID, campaign.id, update_data)
        assert updated.name == "Updated Campaign Name"

    @pytest.mark.asyncio
    async def test_delete_draft_campaign(self, db: AsyncSession, seed_data: dict):
        data = CampaignCreateRequest(
            name="Delete Me Campaign",
            channel=ChannelType.email,
            template_id=seed_data["template"].id,
            segment=SegmentType.all_customers,
        )
        campaign = await campaign_service.create_campaign(db, TENANT1_ID, data)
        result = await campaign_service.delete_campaign(db, TENANT1_ID, campaign.id)
        assert result is True

    @pytest.mark.asyncio
    async def test_delete_nonexistent_campaign_returns_false(self, db: AsyncSession, seed_data: dict):
        result = await campaign_service.delete_campaign(db, TENANT1_ID, uuid.uuid4())
        assert result is False

    @pytest.mark.asyncio
    async def test_tenant_isolation_list_campaigns(self, db: AsyncSession, seed_data: dict):
        """Campaigns from tenant1 should not appear in tenant2 list."""
        data = CampaignCreateRequest(
            name="Tenant1 Campaign",
            channel=ChannelType.email,
            template_id=seed_data["template"].id,
            segment=SegmentType.all_customers,
        )
        await campaign_service.create_campaign(db, TENANT1_ID, data)

        campaigns, total = await campaign_service.list_campaigns(db, TENANT2_ID)
        assert total == 0
        assert len(campaigns) == 0


# ---------- Segment Resolution Tests ----------

class TestSegmentResolution:

    @pytest.mark.asyncio
    async def test_resolve_all_customers(self, db: AsyncSession, seed_data: dict):
        recipients = await campaign_service.resolve_segment(db, TENANT1_ID, SegmentType.all_customers)
        emails = [r["email"] for r in recipients]
        assert "customer1@example.com" in emails
        assert "customer2@example.com" in emails
        # Other tenant customer should NOT be here
        assert "other@example.com" not in emails

    @pytest.mark.asyncio
    async def test_resolve_hot_leads(self, db: AsyncSession, seed_data: dict):
        recipients = await campaign_service.resolve_segment(db, TENANT1_ID, SegmentType.hot_leads)
        emails = [r["email"] for r in recipients]
        assert "hot@lead.com" in emails
        assert "warm@lead.com" not in emails

    @pytest.mark.asyncio
    async def test_resolve_warm_leads(self, db: AsyncSession, seed_data: dict):
        recipients = await campaign_service.resolve_segment(db, TENANT1_ID, SegmentType.warm_leads)
        emails = [r["email"] for r in recipients]
        assert "warm@lead.com" in emails
        assert "hot@lead.com" not in emails

    @pytest.mark.asyncio
    async def test_resolve_cold_leads_empty(self, db: AsyncSession, seed_data: dict):
        recipients = await campaign_service.resolve_segment(db, TENANT1_ID, SegmentType.cold_leads)
        assert len(recipients) == 0  # No cold leads in seed data

    @pytest.mark.asyncio
    async def test_resolve_voucher_holders(self, db: AsyncSession, seed_data: dict):
        """Voucher holders segment returns users with active vouchers."""
        # Assign voucher to customer1
        user_voucher = UserVoucherDB(
            tenant_id=TENANT1_ID,
            user_id=seed_data["customer1"].id,
            voucher_id=seed_data["voucher"].id,
        )
        db.add(user_voucher)
        await db.flush()
        await db.commit()

        recipients = await campaign_service.resolve_segment(db, TENANT1_ID, SegmentType.voucher_holders)
        emails = [r["email"] for r in recipients]
        assert "customer1@example.com" in emails
        assert "customer2@example.com" not in emails


# ---------- Campaign Analytics Tests ----------

class TestCampaignAnalytics:

    @pytest.mark.asyncio
    async def test_get_campaigns_summary_empty(self, db: AsyncSession, seed_data: dict):
        summary = await campaign_service.get_campaigns_summary(db, TENANT2_ID)
        assert summary.total_campaigns == 0
        assert summary.sent_campaigns == 0

    @pytest.mark.asyncio
    async def test_get_campaign_analytics_not_found(self, db: AsyncSession, seed_data: dict):
        analytics = await campaign_service.get_campaign_analytics(db, TENANT1_ID, uuid.uuid4())
        assert analytics is None

    @pytest.mark.asyncio
    async def test_get_campaign_analytics_draft_has_zero_counts(self, db: AsyncSession, seed_data: dict):
        data = CampaignCreateRequest(
            name="Analytics Test Campaign",
            channel=ChannelType.email,
            template_id=seed_data["template"].id,
            segment=SegmentType.all_customers,
        )
        campaign = await campaign_service.create_campaign(db, TENANT1_ID, data)
        analytics = await campaign_service.get_campaign_analytics(db, TENANT1_ID, campaign.id)
        assert analytics is not None
        assert analytics.total_recipients == 0
        assert analytics.sent_count == 0
        assert analytics.open_rate == 0.0


# ---------- Send Campaign Tests ----------

class TestSendCampaign:

    @pytest.mark.asyncio
    async def test_send_campaign_unsupported_channel_raises_400(self, db: AsyncSession, seed_data: dict):
        # Create template for sms
        sms_template = MessageTemplateDB(
            tenant_id=TENANT1_ID,
            name="SMS Template",
            channel="sms",
            body="SMS body {{name}}",
            is_default=False,
        )
        db.add(sms_template)
        await db.flush()
        await db.commit()

        # Create SMS campaign
        sms_campaign = CampaignDB(
            tenant_id=TENANT1_ID,
            name="SMS Campaign",
            channel="sms",
            template_id=sms_template.id,
            segment="all_customers",
            status="draft",
        )
        db.add(sms_campaign)
        await db.flush()
        await db.commit()

        with pytest.raises(HTTPException) as exc_info:
            await campaign_service.send_campaign(db, TENANT1_ID, sms_campaign.id)
        assert exc_info.value.status_code == 400
        assert "sms" in exc_info.value.detail.lower() or "kenh" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_send_campaign_no_recipients_raises_400(self, db: AsyncSession, seed_data: dict):
        """Cold leads segment is empty so send should fail with 400."""
        data = CampaignCreateRequest(
            name="Cold Leads Campaign",
            channel=ChannelType.email,
            template_id=seed_data["template"].id,
            segment=SegmentType.cold_leads,  # no cold leads in seed data
        )
        campaign = await campaign_service.create_campaign(db, TENANT1_ID, data)

        with pytest.raises(HTTPException) as exc_info:
            await campaign_service.send_campaign(db, TENANT1_ID, campaign.id)
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    @patch("src.services.campaign_service.send_campaign_email", new_callable=AsyncMock)
    async def test_send_campaign_email_success(
        self, mock_send, db: AsyncSession, seed_data: dict
    ):
        """Full send cycle with mocked SMTP."""
        mock_send.return_value = True

        data = CampaignCreateRequest(
            name="Email Send Test",
            channel=ChannelType.email,
            template_id=seed_data["template"].id,
            segment=SegmentType.all_customers,
        )
        campaign = await campaign_service.create_campaign(db, TENANT1_ID, data)
        result = await campaign_service.send_campaign(db, TENANT1_ID, campaign.id)

        assert result.status == "sent"
        assert result.sent_count == 2  # customer1 + customer2
        assert result.failed_count == 0
        assert result.sent_at is not None

    @pytest.mark.asyncio
    @patch("src.services.campaign_service.send_campaign_email", new_callable=AsyncMock)
    async def test_send_campaign_partial_failure(
        self, mock_send, db: AsyncSession, seed_data: dict
    ):
        """When some sends fail, campaign is still 'sent' with mixed counts."""
        # First call succeeds, second fails
        mock_send.side_effect = [True, False]

        data = CampaignCreateRequest(
            name="Partial Fail Campaign",
            channel=ChannelType.email,
            template_id=seed_data["template"].id,
            segment=SegmentType.all_customers,
        )
        campaign = await campaign_service.create_campaign(db, TENANT1_ID, data)
        result = await campaign_service.send_campaign(db, TENANT1_ID, campaign.id)

        # Mixed: 1 sent, 1 failed - status should be 'sent' (some went through)
        assert result.sent_count + result.failed_count == 2
        assert result.sent_at is not None

    @pytest.mark.asyncio
    async def test_send_campaign_not_found_raises_404(self, db: AsyncSession, seed_data: dict):
        with pytest.raises(HTTPException) as exc_info:
            await campaign_service.send_campaign(db, TENANT1_ID, uuid.uuid4())
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    @patch("src.services.campaign_service.send_campaign_email", new_callable=AsyncMock)
    async def test_send_creates_recipient_log_records(
        self, mock_send, db: AsyncSession, seed_data: dict
    ):
        """Ensure CampaignRecipientDB records are created per recipient."""
        mock_send.return_value = True

        data = CampaignCreateRequest(
            name="Recipient Log Test",
            channel=ChannelType.email,
            template_id=seed_data["template"].id,
            segment=SegmentType.all_customers,
        )
        campaign = await campaign_service.create_campaign(db, TENANT1_ID, data)
        await campaign_service.send_campaign(db, TENANT1_ID, campaign.id)

        result = await db.execute(
            select(CampaignRecipientDB).where(CampaignRecipientDB.campaign_id == campaign.id)
        )
        records = result.scalars().all()
        assert len(records) == 2  # customer1 + customer2
        statuses = {r.status for r in records}
        assert "sent" in statuses
