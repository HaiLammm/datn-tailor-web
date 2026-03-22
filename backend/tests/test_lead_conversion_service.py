"""Service tests for Lead Conversion - Story 6.2: Lead-to-Customer Conversion.

Tests lead-to-customer conversion with multi-tenant isolation,
duplicate phone detection, email linking, and audit logging.

Note: SQLite does not support SELECT FOR UPDATE, so we patch it out in tests.
The race condition protection is tested at the integration/API level with PostgreSQL.
"""

import uuid
from datetime import date
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.security import verify_password
from src.models.db_models import (
    Base,
    CustomerProfileDB,
    LeadConversionDB,
    LeadDB,
    MeasurementDB,
    TenantDB,
    UserDB,
)
from src.services import lead_service
from src.services.lead_service import DEFAULT_CONVERSION_PASSWORD

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
async def seed_data(test_db_session: AsyncSession) -> dict:
    """Seed test database with tenants, users, and leads."""
    tenant1_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    tenant2_id = uuid.UUID("00000000-0000-0000-0000-000000000002")
    owner_id = uuid.uuid4()
    existing_user_id = uuid.uuid4()

    tenant1 = TenantDB(id=tenant1_id, name="Tiem May 1", slug="tiem-may-1")
    tenant2 = TenantDB(id=tenant2_id, name="Tiem May 2", slug="tiem-may-2")
    owner = UserDB(
        id=owner_id,
        email="owner@example.com",
        role="Owner",
        is_active=True,
        tenant_id=tenant1_id,
        full_name="Cô Lan",
    )
    existing_user = UserDB(
        id=existing_user_id,
        email="existing@example.com",
        role="Customer",
        is_active=True,
        tenant_id=tenant1_id,
        full_name="Nguyen Existing",
    )

    test_db_session.add_all([tenant1, tenant2, owner, existing_user])
    await test_db_session.commit()

    # Leads
    hot_lead_id = uuid.uuid4()
    warm_lead_id = uuid.uuid4()
    cold_lead_id = uuid.uuid4()
    lead_with_email_id = uuid.uuid4()
    tenant2_lead_id = uuid.uuid4()

    leads = [
        LeadDB(
            id=hot_lead_id,
            tenant_id=tenant1_id,
            name="Nguyen Hot",
            phone="0901111111",
            email="hot@example.com",
            source="manual",
            classification="hot",
            notes="VIP lead",
        ),
        LeadDB(
            id=warm_lead_id,
            tenant_id=tenant1_id,
            name="Tran Warm",
            phone="0902222222",
            source="website",
            classification="warm",
        ),
        LeadDB(
            id=cold_lead_id,
            tenant_id=tenant1_id,
            name="Le Cold",
            phone="0903333333",
            source="signup",
            classification="cold",
        ),
        LeadDB(
            id=lead_with_email_id,
            tenant_id=tenant1_id,
            name="Nguyen Existing Lead",
            phone="0904444444",
            email="existing@example.com",
            source="manual",
            classification="hot",
        ),
        LeadDB(
            id=tenant2_lead_id,
            tenant_id=tenant2_id,
            name="Other Tenant Lead",
            phone="0905555555",
            source="manual",
            classification="hot",
        ),
    ]

    test_db_session.add_all(leads)
    await test_db_session.commit()

    return {
        "tenant1": tenant1_id,
        "tenant2": tenant2_id,
        "owner_id": owner_id,
        "existing_user_id": existing_user_id,
        "hot_lead_id": hot_lead_id,
        "warm_lead_id": warm_lead_id,
        "cold_lead_id": cold_lead_id,
        "lead_with_email_id": lead_with_email_id,
        "tenant2_lead_id": tenant2_lead_id,
    }


def _patch_for_update():
    """Patch with_for_update for SQLite (doesn't support SELECT FOR UPDATE).

    Returns a context manager that makes with_for_update a no-op.
    """
    from sqlalchemy.sql import Select

    original_with_for_update = Select.with_for_update

    def noop_with_for_update(self, **kwargs):
        return self

    return patch.object(Select, "with_for_update", noop_with_for_update)


# ─── convert_lead_to_customer ────────────────────────────────────────────────


class TestConvertLeadToCustomer:
    """Tests for convert_lead_to_customer service function."""

    @pytest.mark.asyncio
    async def test_convert_hot_lead_success(self, test_db_session: AsyncSession, seed_data: dict):
        """7.1: Successful Hot lead conversion — customer created, measurement created, lead deleted."""
        with _patch_for_update():
            customer = await lead_service.convert_lead_to_customer(
                db=test_db_session,
                tenant_id=seed_data["tenant1"],
                lead_id=seed_data["hot_lead_id"],
                converted_by=seed_data["owner_id"],
            )

        # Customer profile created
        assert customer is not None
        assert customer.full_name == "Nguyen Hot"
        assert customer.phone == "0901111111"
        assert customer.email == "hot@example.com"
        assert customer.tenant_id == seed_data["tenant1"]
        assert "Chuyển từ Lead" in customer.notes

        # Default measurement created
        result = await test_db_session.execute(
            select(MeasurementDB).where(
                MeasurementDB.customer_profile_id == customer.id,
            )
        )
        measurement = result.scalar_one_or_none()
        assert measurement is not None
        assert measurement.is_default is True
        assert measurement.measured_date == date.today()
        assert measurement.neck is None  # All measurement values default null

        # Lead deleted
        lead = await lead_service.get_lead(
            test_db_session, seed_data["tenant1"], seed_data["hot_lead_id"]
        )
        assert lead is None

        # Audit log created
        result = await test_db_session.execute(
            select(LeadConversionDB).where(
                LeadConversionDB.customer_profile_id == customer.id,
            )
        )
        conversion = result.scalar_one_or_none()
        assert conversion is not None
        assert conversion.lead_name == "Nguyen Hot"
        assert conversion.converted_by == seed_data["owner_id"]

    @pytest.mark.asyncio
    async def test_convert_warm_lead_success(self, test_db_session: AsyncSession, seed_data: dict):
        """7.2: Warm/Cold lead conversion — still succeeds (no restriction on classification)."""
        with _patch_for_update():
            customer = await lead_service.convert_lead_to_customer(
                db=test_db_session,
                tenant_id=seed_data["tenant1"],
                lead_id=seed_data["warm_lead_id"],
                converted_by=seed_data["owner_id"],
            )

        assert customer is not None
        assert customer.full_name == "Tran Warm"

    @pytest.mark.asyncio
    async def test_convert_cold_lead_success(self, test_db_session: AsyncSession, seed_data: dict):
        """7.2: Cold lead conversion still succeeds."""
        with _patch_for_update():
            customer = await lead_service.convert_lead_to_customer(
                db=test_db_session,
                tenant_id=seed_data["tenant1"],
                lead_id=seed_data["cold_lead_id"],
                converted_by=seed_data["owner_id"],
            )

        assert customer is not None
        assert customer.full_name == "Le Cold"

    @pytest.mark.asyncio
    async def test_convert_duplicate_phone_reuses_existing_customer(self, test_db_session: AsyncSession, seed_data: dict):
        """7.3: Duplicate phone — reuses existing customer profile, merges notes, deletes lead."""
        # First, create a customer with the same phone as warm_lead
        existing_customer = CustomerProfileDB(
            tenant_id=seed_data["tenant1"],
            full_name="Existing Customer",
            phone="0902222222",  # Same as warm_lead
            notes="Original notes",
        )
        test_db_session.add(existing_customer)
        await test_db_session.commit()

        with _patch_for_update():
            customer = await lead_service.convert_lead_to_customer(
                db=test_db_session,
                tenant_id=seed_data["tenant1"],
                lead_id=seed_data["warm_lead_id"],
                converted_by=seed_data["owner_id"],
            )

        # Should return the existing customer (same id)
        assert customer.id == existing_customer.id
        assert customer.full_name == "Existing Customer"
        # Notes merged
        assert "Original notes" in customer.notes
        assert "Chuyển từ Lead" in customer.notes

        # Lead should be deleted
        lead = await lead_service.get_lead(
            test_db_session, seed_data["tenant1"], seed_data["warm_lead_id"]
        )
        assert lead is None

        # Audit log should still be created
        result = await test_db_session.execute(
            select(LeadConversionDB).where(
                LeadConversionDB.customer_profile_id == customer.id,
            )
        )
        assert result.scalar_one_or_none() is not None

    @pytest.mark.asyncio
    async def test_convert_email_links_existing_user(self, test_db_session: AsyncSession, seed_data: dict):
        """7.4: Email auto-linking to existing user — customer_profiles.user_id set."""
        with _patch_for_update():
            customer = await lead_service.convert_lead_to_customer(
                db=test_db_session,
                tenant_id=seed_data["tenant1"],
                lead_id=seed_data["lead_with_email_id"],
                converted_by=seed_data["owner_id"],
            )

        assert customer.user_id == seed_data["existing_user_id"]

    @pytest.mark.asyncio
    async def test_convert_nonexistent_lead_returns_404(self, test_db_session: AsyncSession, seed_data: dict):
        """7.5: Second conversion attempt returns 404 (lead already deleted)."""
        fake_lead_id = uuid.uuid4()
        with _patch_for_update():
            with pytest.raises(HTTPException) as exc_info:
                await lead_service.convert_lead_to_customer(
                    db=test_db_session,
                    tenant_id=seed_data["tenant1"],
                    lead_id=fake_lead_id,
                    converted_by=seed_data["owner_id"],
                )

        assert exc_info.value.status_code == 404
        assert "không tồn tại" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_convert_cross_tenant_blocked(self, test_db_session: AsyncSession, seed_data: dict):
        """7.6: Tenant isolation — cannot convert lead from different tenant."""
        with _patch_for_update():
            with pytest.raises(HTTPException) as exc_info:
                await lead_service.convert_lead_to_customer(
                    db=test_db_session,
                    tenant_id=seed_data["tenant1"],  # tenant1 trying to convert tenant2's lead
                    lead_id=seed_data["tenant2_lead_id"],
                    converted_by=seed_data["owner_id"],
                )

        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_convert_creates_audit_log(self, test_db_session: AsyncSession, seed_data: dict):
        """7.7: Audit log creation — lead_conversions record with all fields."""
        with _patch_for_update():
            customer = await lead_service.convert_lead_to_customer(
                db=test_db_session,
                tenant_id=seed_data["tenant1"],
                lead_id=seed_data["hot_lead_id"],
                converted_by=seed_data["owner_id"],
            )

        result = await test_db_session.execute(
            select(LeadConversionDB).where(
                LeadConversionDB.customer_profile_id == customer.id,
            )
        )
        conversion = result.scalar_one()

        assert conversion.tenant_id == seed_data["tenant1"]
        assert conversion.lead_id == seed_data["hot_lead_id"]
        assert conversion.lead_name == "Nguyen Hot"
        assert conversion.lead_phone == "0901111111"
        assert conversion.lead_email == "hot@example.com"
        assert conversion.lead_source == "manual"
        assert conversion.converted_by == seed_data["owner_id"]
        assert conversion.created_at is not None

    @pytest.mark.asyncio
    async def test_convert_create_account_with_email(self, test_db_session: AsyncSession, seed_data: dict):
        """Create account with email as login and default password 'camonquykhach'."""
        with _patch_for_update():
            customer = await lead_service.convert_lead_to_customer(
                db=test_db_session,
                tenant_id=seed_data["tenant1"],
                lead_id=seed_data["hot_lead_id"],
                converted_by=seed_data["owner_id"],
                create_account=True,
            )

        # Customer linked to new user
        assert customer.user_id is not None

        # Verify the user account
        result = await test_db_session.execute(
            select(UserDB).where(UserDB.id == customer.user_id)
        )
        user = result.scalar_one()
        assert user.email == "hot@example.com"
        assert user.is_active is True
        assert user.role == "Customer"
        assert user.full_name == "Nguyen Hot"
        assert user.phone == "0901111111"
        # Verify default password
        assert verify_password(DEFAULT_CONVERSION_PASSWORD, user.hashed_password)

    @pytest.mark.asyncio
    async def test_convert_create_account_with_phone_only(self, test_db_session: AsyncSession, seed_data: dict):
        """Create account with phone@local when lead has no email, default password 'camonquykhach'."""
        with _patch_for_update():
            customer = await lead_service.convert_lead_to_customer(
                db=test_db_session,
                tenant_id=seed_data["tenant1"],
                lead_id=seed_data["warm_lead_id"],  # Tran Warm: phone=0902222222, no email
                converted_by=seed_data["owner_id"],
                create_account=True,
            )

        # Customer linked to new user
        assert customer.user_id is not None

        # Verify the user account uses phone@local
        result = await test_db_session.execute(
            select(UserDB).where(UserDB.id == customer.user_id)
        )
        user = result.scalar_one()
        assert user.email == "0902222222@local"
        assert user.is_active is True
        assert user.role == "Customer"
        assert user.full_name == "Tran Warm"
        assert verify_password(DEFAULT_CONVERSION_PASSWORD, user.hashed_password)
