"""Service tests for Lead Service - Story 6.1: CRM Leads Board.

Tests lead CRUD operations with multi-tenant isolation.
"""

import uuid

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.models.db_models import Base, LeadDB, TenantDB
from src.models.lead import (
    LeadClassification,
    LeadClassificationUpdate,
    LeadCreate,
    LeadFilter,
    LeadSource,
    LeadUpdate,
)
from src.services import lead_service

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def test_db_engine():
    """Create test database engine."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def test_db_session(test_db_engine):
    """Create test database session."""
    async_session = sessionmaker(test_db_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def seed_tenants(test_db_session: AsyncSession) -> dict[str, uuid.UUID]:
    """Seed test database with two tenants for isolation tests."""
    tenant1_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    tenant2_id = uuid.UUID("00000000-0000-0000-0000-000000000002")

    tenant1 = TenantDB(id=tenant1_id, name="Tiem May 1", slug="tiem-may-1")
    tenant2 = TenantDB(id=tenant2_id, name="Tiem May 2", slug="tiem-may-2")

    test_db_session.add_all([tenant1, tenant2])
    await test_db_session.commit()

    return {"tenant1": tenant1_id, "tenant2": tenant2_id}


@pytest_asyncio.fixture
async def seed_leads(test_db_session: AsyncSession, seed_tenants: dict) -> dict:
    """Seed test database with leads for two tenants."""
    tenant1_id = seed_tenants["tenant1"]
    tenant2_id = seed_tenants["tenant2"]

    lead1_id = uuid.uuid4()
    lead2_id = uuid.uuid4()
    lead3_id = uuid.uuid4()

    leads = [
        LeadDB(id=lead1_id, tenant_id=tenant1_id, name="Nguyen Thi Lan", phone="0901111111", source="manual", classification="hot"),
        LeadDB(id=lead2_id, tenant_id=tenant1_id, name="Tran Van Nam", phone="0902222222", source="website", classification="warm"),
        LeadDB(id=lead3_id, tenant_id=tenant2_id, name="Le Thi Hoa", phone="0903333333", source="signup", classification="cold"),
    ]

    test_db_session.add_all(leads)
    await test_db_session.commit()

    return {
        "tenant1": tenant1_id,
        "tenant2": tenant2_id,
        "lead1_id": lead1_id,
        "lead2_id": lead2_id,
        "lead3_id": lead3_id,
    }


# ─── list_leads ───────────────────────────────────────────────────────────────

class TestListLeads:
    """Tests for list_leads service function."""

    @pytest.mark.asyncio
    async def test_list_leads_tenant_isolation(self, test_db_session: AsyncSession, seed_leads: dict):
        """Only leads belonging to the querying tenant are returned."""
        leads, total = await lead_service.list_leads(test_db_session, seed_leads["tenant1"])
        assert total == 2
        assert all(lead.tenant_id == seed_leads["tenant1"] for lead in leads)

    @pytest.mark.asyncio
    async def test_list_leads_empty_for_new_tenant(self, test_db_session: AsyncSession, seed_leads: dict):
        """New tenant with no leads returns empty list."""
        new_tenant_id = uuid.uuid4()
        leads, total = await lead_service.list_leads(test_db_session, new_tenant_id)
        assert total == 0
        assert leads == []

    @pytest.mark.asyncio
    async def test_list_leads_filter_by_classification(self, test_db_session: AsyncSession, seed_leads: dict):
        """Filter leads by classification returns correct subset."""
        filters = LeadFilter(classification=LeadClassification.HOT)
        leads, total = await lead_service.list_leads(test_db_session, seed_leads["tenant1"], filters)
        assert total == 1
        assert leads[0].name == "Nguyen Thi Lan"
        assert leads[0].classification == "hot"

    @pytest.mark.asyncio
    async def test_list_leads_filter_by_source(self, test_db_session: AsyncSession, seed_leads: dict):
        """Filter leads by source returns correct subset."""
        filters = LeadFilter(source=LeadSource.WEBSITE)
        leads, total = await lead_service.list_leads(test_db_session, seed_leads["tenant1"], filters)
        assert total == 1
        assert leads[0].name == "Tran Van Nam"

    @pytest.mark.asyncio
    async def test_list_leads_search_by_name(self, test_db_session: AsyncSession, seed_leads: dict):
        """Search by name returns matching leads (case-insensitive)."""
        filters = LeadFilter(search="nguyen")
        leads, total = await lead_service.list_leads(test_db_session, seed_leads["tenant1"], filters)
        assert total == 1
        assert leads[0].name == "Nguyen Thi Lan"

    @pytest.mark.asyncio
    async def test_list_leads_search_by_phone(self, test_db_session: AsyncSession, seed_leads: dict):
        """Search by phone returns matching leads."""
        filters = LeadFilter(search="0902222222")
        leads, total = await lead_service.list_leads(test_db_session, seed_leads["tenant1"], filters)
        assert total == 1
        assert leads[0].name == "Tran Van Nam"

    @pytest.mark.asyncio
    async def test_list_leads_pagination(self, test_db_session: AsyncSession, seed_leads: dict):
        """Pagination limits results correctly."""
        filters = LeadFilter(page=1, page_size=1)
        leads, total = await lead_service.list_leads(test_db_session, seed_leads["tenant1"], filters)
        assert total == 2  # total unchanged
        assert len(leads) == 1  # only 1 item returned

    @pytest.mark.asyncio
    async def test_list_leads_sort_by_name_asc(self, test_db_session: AsyncSession, seed_leads: dict):
        """Sort by name ascending returns alphabetical order."""
        filters = LeadFilter(sort_by="name", sort_order="asc")
        leads, _ = await lead_service.list_leads(test_db_session, seed_leads["tenant1"], filters)
        names = [lead.name for lead in leads]
        assert names == sorted(names)


# ─── get_lead ─────────────────────────────────────────────────────────────────

class TestGetLead:
    """Tests for get_lead service function."""

    @pytest.mark.asyncio
    async def test_get_lead_found(self, test_db_session: AsyncSession, seed_leads: dict):
        """Retrieve lead by valid ID within same tenant."""
        lead = await lead_service.get_lead(
            test_db_session, seed_leads["tenant1"], seed_leads["lead1_id"]
        )
        assert lead is not None
        assert lead.name == "Nguyen Thi Lan"

    @pytest.mark.asyncio
    async def test_get_lead_not_found(self, test_db_session: AsyncSession, seed_leads: dict):
        """Return None when lead ID does not exist."""
        lead = await lead_service.get_lead(test_db_session, seed_leads["tenant1"], uuid.uuid4())
        assert lead is None

    @pytest.mark.asyncio
    async def test_get_lead_cross_tenant_blocked(self, test_db_session: AsyncSession, seed_leads: dict):
        """Cannot retrieve lead from another tenant (isolation)."""
        # lead3_id belongs to tenant2, querying with tenant1 must return None
        lead = await lead_service.get_lead(
            test_db_session, seed_leads["tenant1"], seed_leads["lead3_id"]
        )
        assert lead is None


# ─── create_lead ──────────────────────────────────────────────────────────────

class TestCreateLead:
    """Tests for create_lead service function."""

    @pytest.mark.asyncio
    async def test_create_lead_success(self, test_db_session: AsyncSession, seed_tenants: dict):
        """Create a new lead with all fields."""
        data = LeadCreate(
            name="Pham Thi Mai",
            phone="0904444444",
            email="mai@example.com",
            source=LeadSource.MANUAL,
            classification=LeadClassification.HOT,
            notes="Interested in wedding ao dai",
        )
        lead = await lead_service.create_lead(test_db_session, seed_tenants["tenant1"], data)

        assert lead.id is not None
        assert lead.tenant_id == seed_tenants["tenant1"]
        assert lead.name == "Pham Thi Mai"
        assert lead.phone == "0904444444"
        assert lead.email == "mai@example.com"
        assert lead.source == "manual"
        assert lead.classification == "hot"
        assert lead.notes == "Interested in wedding ao dai"
        assert lead.created_at is not None
        assert lead.updated_at is not None

    @pytest.mark.asyncio
    async def test_create_lead_minimal_fields(self, test_db_session: AsyncSession, seed_tenants: dict):
        """Create a lead with only required fields (name)."""
        data = LeadCreate(name="Bui Van Tuan")
        lead = await lead_service.create_lead(test_db_session, seed_tenants["tenant1"], data)

        assert lead.name == "Bui Van Tuan"
        assert lead.phone is None
        assert lead.email is None
        assert lead.source == "manual"
        assert lead.classification == "warm"  # default


# ─── update_lead ──────────────────────────────────────────────────────────────

class TestUpdateLead:
    """Tests for update_lead service function."""

    @pytest.mark.asyncio
    async def test_update_lead_success(self, test_db_session: AsyncSession, seed_leads: dict):
        """Update lead fields successfully."""
        data = LeadUpdate(name="Nguyen Thi Lan Updated", classification=LeadClassification.WARM)
        lead = await lead_service.update_lead(
            test_db_session, seed_leads["tenant1"], seed_leads["lead1_id"], data
        )

        assert lead is not None
        assert lead.name == "Nguyen Thi Lan Updated"
        assert lead.classification == "warm"

    @pytest.mark.asyncio
    async def test_update_lead_not_found(self, test_db_session: AsyncSession, seed_leads: dict):
        """Return None when trying to update non-existent lead."""
        data = LeadUpdate(name="Ghost Lead")
        lead = await lead_service.update_lead(
            test_db_session, seed_leads["tenant1"], uuid.uuid4(), data
        )
        assert lead is None

    @pytest.mark.asyncio
    async def test_update_lead_partial_update(self, test_db_session: AsyncSession, seed_leads: dict):
        """Only updated fields change, others remain intact."""
        original = await lead_service.get_lead(
            test_db_session, seed_leads["tenant1"], seed_leads["lead1_id"]
        )
        original_phone = original.phone

        data = LeadUpdate(notes="Updated notes only")
        lead = await lead_service.update_lead(
            test_db_session, seed_leads["tenant1"], seed_leads["lead1_id"], data
        )

        assert lead.notes == "Updated notes only"
        assert lead.phone == original_phone  # unchanged


# ─── delete_lead ──────────────────────────────────────────────────────────────

class TestDeleteLead:
    """Tests for delete_lead service function."""

    @pytest.mark.asyncio
    async def test_delete_lead_success(self, test_db_session: AsyncSession, seed_leads: dict):
        """Delete lead returns True and lead is gone."""
        result = await lead_service.delete_lead(
            test_db_session, seed_leads["tenant1"], seed_leads["lead1_id"]
        )
        assert result is True

        # Verify gone
        lead = await lead_service.get_lead(
            test_db_session, seed_leads["tenant1"], seed_leads["lead1_id"]
        )
        assert lead is None

    @pytest.mark.asyncio
    async def test_delete_lead_not_found(self, test_db_session: AsyncSession, seed_leads: dict):
        """Return False when trying to delete non-existent lead."""
        result = await lead_service.delete_lead(
            test_db_session, seed_leads["tenant1"], uuid.uuid4()
        )
        assert result is False

    @pytest.mark.asyncio
    async def test_delete_cross_tenant_blocked(self, test_db_session: AsyncSession, seed_leads: dict):
        """Cannot delete lead from another tenant."""
        result = await lead_service.delete_lead(
            test_db_session, seed_leads["tenant1"], seed_leads["lead3_id"]
        )
        assert result is False


# ─── update_classification ────────────────────────────────────────────────────

class TestUpdateClassification:
    """Tests for update_classification service function."""

    @pytest.mark.asyncio
    async def test_update_classification_hot_to_cold(self, test_db_session: AsyncSession, seed_leads: dict):
        """Update classification from hot to cold."""
        data = LeadClassificationUpdate(classification=LeadClassification.COLD)
        lead = await lead_service.update_classification(
            test_db_session, seed_leads["tenant1"], seed_leads["lead1_id"], data
        )
        assert lead is not None
        assert lead.classification == "cold"

    @pytest.mark.asyncio
    async def test_update_classification_not_found(self, test_db_session: AsyncSession, seed_leads: dict):
        """Return None for non-existent lead."""
        data = LeadClassificationUpdate(classification=LeadClassification.HOT)
        lead = await lead_service.update_classification(
            test_db_session, seed_leads["tenant1"], uuid.uuid4(), data
        )
        assert lead is None


# ─── Pydantic schema validation tests ─────────────────────────────────────────

class TestLeadSchemaValidation:
    """Tests for Pydantic schema validation (LeadCreate, LeadFilter)."""

    def test_lead_create_valid_email(self):
        """Valid email passes validation."""
        data = LeadCreate(name="Test", email="test@example.com")
        assert data.email == "test@example.com"

    def test_lead_create_invalid_email(self):
        """Invalid email raises ValidationError."""
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            LeadCreate(name="Test", email="not-an-email")

    def test_lead_create_empty_email_none(self):
        """Empty/None email is allowed."""
        data = LeadCreate(name="Test", email=None)
        assert data.email is None

    def test_lead_create_empty_string_email_normalized_to_none(self):
        """Empty string email is normalized to None (P-4 fix)."""
        data = LeadCreate(name="Test", email="")
        assert data.email is None

    def test_lead_create_whitespace_email_normalized_to_none(self):
        """Whitespace-only email is normalized to None (P-4 fix)."""
        data = LeadCreate(name="Test", email="   ")
        assert data.email is None

    def test_lead_update_empty_phone_normalized_to_none(self):
        """Empty string phone is normalized to None (P-5 fix)."""
        data = LeadUpdate(phone="")
        assert data.phone is None

    def test_lead_update_empty_email_normalized_to_none(self):
        """Empty string email on update is normalized to None (P-4 fix)."""
        data = LeadUpdate(email="  ")
        assert data.email is None

    def test_lead_filter_invalid_sort_by(self):
        """Invalid sort_by field raises ValidationError."""
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            LeadFilter(sort_by="DROP TABLE leads")

    def test_lead_filter_invalid_sort_order(self):
        """Invalid sort_order raises ValidationError."""
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            LeadFilter(sort_order="sideways")

    def test_lead_create_default_classification(self):
        """Default classification is warm."""
        data = LeadCreate(name="Test")
        assert data.classification == LeadClassification.WARM

    def test_lead_create_default_source(self):
        """Default source is manual."""
        data = LeadCreate(name="Test")
        assert data.source == LeadSource.MANUAL
