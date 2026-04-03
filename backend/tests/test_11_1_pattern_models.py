"""Tests for Story 11.1: Pattern Engine Data Model.

Verifies:
- PatternSessionDB and PatternPieceDB ORM models
- Pydantic schema validation (min/max measurements, enums)
- Relationships (session.pieces, piece.session)
- OrderDB.pattern_session_id column (nullable FK)
- Check constraints (status, piece_type) via Pydantic validation
"""

import uuid
from decimal import Decimal
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import selectinload, sessionmaker

from src.models.db_models import (
    Base,
    CustomerProfileDB,
    OrderDB,
    GarmentDB,
    OrderItemDB,
    PatternPieceDB,
    PatternSessionDB,
    TenantDB,
    UserDB,
)
from src.models.pattern import (
    GeometryParams,
    PatternPieceResponse,
    PatternSessionCreate,
    PatternSessionResponse,
    PatternSessionStatus,
    PieceType,
)

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

TENANT_ID = uuid.UUID("11100000-0000-0000-0000-000000000001")
USER_ID = uuid.UUID("11100000-0000-0000-0000-000000000002")
CUSTOMER_ID = uuid.UUID("11100000-0000-0000-0000-000000000003")

SAMPLE_MEASUREMENTS = {
    "do_dai_ao": Decimal("65.0"),
    "ha_eo": Decimal("18.0"),
    "vong_co": Decimal("36.0"),
    "vong_nach": Decimal("38.0"),
    "vong_nguc": Decimal("88.0"),
    "vong_eo": Decimal("68.0"),
    "vong_mong": Decimal("92.0"),
    "do_dai_tay": Decimal("55.0"),
    "vong_bap_tay": Decimal("28.0"),
    "vong_co_tay": Decimal("16.0"),
}

SAMPLE_GEOMETRY_PARAMS = {
    "bust_width": 24.5,
    "waist_width": 22.0,
    "hip_width": 25.0,
    "armhole_drop": 18.0,
    "neck_depth": 7.2,
    "hem_width": 37.0,
    "seam_allowance": 1.0,
}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine):
    async_session = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def seed_data(db_session: AsyncSession):
    """Create tenant, user, customer profile for FK references."""
    tenant = TenantDB(id=TENANT_ID, name="Test Shop 11", slug="test-shop-11")
    user = UserDB(
        id=USER_ID,
        email="owner-11@test.com",
        role="Owner",
        tenant_id=TENANT_ID,
        full_name="Owner Test",
    )
    customer = CustomerProfileDB(
        id=CUSTOMER_ID,
        tenant_id=TENANT_ID,
        full_name="Customer Test",
        phone="0901234567",
    )
    db_session.add_all([tenant, user, customer])
    await db_session.flush()
    return {"tenant": tenant, "user": user, "customer": customer}


# ---------------------------------------------------------------------------
# AC #2: ORM Models — Insert, query, relationships
# ---------------------------------------------------------------------------


class TestPatternSessionORM:
    """Verify PatternSessionDB ORM model."""

    @pytest.mark.asyncio
    async def test_create_session_defaults(self, db_session: AsyncSession, seed_data):
        session = PatternSessionDB(
            tenant_id=TENANT_ID,
            customer_id=CUSTOMER_ID,
            created_by=USER_ID,
            **SAMPLE_MEASUREMENTS,
        )
        db_session.add(session)
        await db_session.flush()

        assert session.id is not None
        assert session.status == "draft"
        assert session.garment_type == "ao_dai"
        assert session.notes is None
        assert session.created_at is not None
        assert session.updated_at is not None

    @pytest.mark.asyncio
    async def test_measurement_columns_stored(self, db_session: AsyncSession, seed_data):
        session = PatternSessionDB(
            tenant_id=TENANT_ID,
            customer_id=CUSTOMER_ID,
            created_by=USER_ID,
            **SAMPLE_MEASUREMENTS,
        )
        db_session.add(session)
        await db_session.flush()

        assert session.do_dai_ao == Decimal("65.0")
        assert session.ha_eo == Decimal("18.0")
        assert session.vong_co == Decimal("36.0")
        assert session.vong_nach == Decimal("38.0")
        assert session.vong_nguc == Decimal("88.0")
        assert session.vong_eo == Decimal("68.0")
        assert session.vong_mong == Decimal("92.0")
        assert session.do_dai_tay == Decimal("55.0")
        assert session.vong_bap_tay == Decimal("28.0")
        assert session.vong_co_tay == Decimal("16.0")

    @pytest.mark.asyncio
    async def test_session_with_custom_garment_type(self, db_session: AsyncSession, seed_data):
        session = PatternSessionDB(
            tenant_id=TENANT_ID,
            customer_id=CUSTOMER_ID,
            created_by=USER_ID,
            garment_type="ao_ba_ba",
            notes="Custom garment type test",
            **SAMPLE_MEASUREMENTS,
        )
        db_session.add(session)
        await db_session.flush()

        assert session.garment_type == "ao_ba_ba"
        assert session.notes == "Custom garment type test"


class TestPatternPieceORM:
    """Verify PatternPieceDB ORM model."""

    @pytest.mark.asyncio
    async def test_create_piece(self, db_session: AsyncSession, seed_data):
        session = PatternSessionDB(
            tenant_id=TENANT_ID,
            customer_id=CUSTOMER_ID,
            created_by=USER_ID,
            **SAMPLE_MEASUREMENTS,
        )
        db_session.add(session)
        await db_session.flush()

        piece = PatternPieceDB(
            session_id=session.id,
            piece_type="front_bodice",
            svg_data="<svg>test front bodice</svg>",
            geometry_params=SAMPLE_GEOMETRY_PARAMS,
        )
        db_session.add(piece)
        await db_session.flush()

        assert piece.id is not None
        assert piece.piece_type == "front_bodice"
        assert piece.svg_data == "<svg>test front bodice</svg>"
        assert piece.geometry_params["bust_width"] == 24.5
        assert piece.created_at is not None

    @pytest.mark.asyncio
    async def test_three_pieces_per_session(self, db_session: AsyncSession, seed_data):
        session = PatternSessionDB(
            tenant_id=TENANT_ID,
            customer_id=CUSTOMER_ID,
            created_by=USER_ID,
            **SAMPLE_MEASUREMENTS,
        )
        db_session.add(session)
        await db_session.flush()

        for pt in ["front_bodice", "back_bodice", "sleeve"]:
            db_session.add(PatternPieceDB(
                session_id=session.id,
                piece_type=pt,
                svg_data=f"<svg>{pt}</svg>",
                geometry_params=SAMPLE_GEOMETRY_PARAMS,
            ))
        await db_session.flush()

        result = await db_session.execute(
            select(PatternSessionDB)
            .options(selectinload(PatternSessionDB.pieces))
            .where(PatternSessionDB.id == session.id)
        )
        loaded = result.scalars().first()
        assert loaded is not None
        assert len(loaded.pieces) == 3
        piece_types = {p.piece_type for p in loaded.pieces}
        assert piece_types == {"front_bodice", "back_bodice", "sleeve"}

    @pytest.mark.asyncio
    async def test_piece_session_back_relationship(self, db_session: AsyncSession, seed_data):
        session = PatternSessionDB(
            tenant_id=TENANT_ID,
            customer_id=CUSTOMER_ID,
            created_by=USER_ID,
            **SAMPLE_MEASUREMENTS,
        )
        db_session.add(session)
        await db_session.flush()

        piece = PatternPieceDB(
            session_id=session.id,
            piece_type="sleeve",
            svg_data="<svg>sleeve</svg>",
            geometry_params=SAMPLE_GEOMETRY_PARAMS,
        )
        db_session.add(piece)
        await db_session.flush()

        assert piece.session is not None
        assert piece.session.id == session.id


class TestOrderPatternRelationship:
    """Verify OrderDB has pattern_session_id column."""

    @pytest.mark.asyncio
    async def test_order_pattern_session_id_nullable(self, db_session: AsyncSession, seed_data):
        """Orders without patterns have NULL pattern_session_id."""
        garment = GarmentDB(
            tenant_id=TENANT_ID,
            name="Test Ao Dai",
            category="ao_dai",
            rental_price=Decimal("500000"),
            sale_price=Decimal("1200000"),
            status="available",
            size_options=["S", "M"],
        )
        db_session.add(garment)
        await db_session.flush()

        order = OrderDB(
            tenant_id=TENANT_ID,
            customer_name="Test Customer",
            customer_phone="0901234567",
            payment_method="cod",
            subtotal_amount=Decimal("1200000"),
            total_amount=Decimal("1200000"),
        )
        db_session.add(order)
        await db_session.flush()

        assert order.pattern_session_id is None
        assert order.pattern_session is None

    @pytest.mark.asyncio
    async def test_order_with_pattern_session(self, db_session: AsyncSession, seed_data):
        """Orders can link to pattern sessions."""
        session = PatternSessionDB(
            tenant_id=TENANT_ID,
            customer_id=CUSTOMER_ID,
            created_by=USER_ID,
            **SAMPLE_MEASUREMENTS,
        )
        db_session.add(session)
        await db_session.flush()

        order = OrderDB(
            tenant_id=TENANT_ID,
            customer_name="Test Customer",
            customer_phone="0901234567",
            payment_method="cod",
            subtotal_amount=Decimal("1200000"),
            total_amount=Decimal("1200000"),
            pattern_session_id=session.id,
        )
        db_session.add(order)
        await db_session.flush()

        assert order.pattern_session_id == session.id
        assert order.pattern_session is not None
        assert order.pattern_session.do_dai_ao == Decimal("65.0")


# ---------------------------------------------------------------------------
# AC #3: Pydantic Schemas — Validation
# ---------------------------------------------------------------------------


class TestPydanticSchemas:
    """Verify Pydantic schema validation for pattern models."""

    def test_create_valid_session(self):
        data = PatternSessionCreate(
            customer_id=uuid.uuid4(),
            **{k: v for k, v in SAMPLE_MEASUREMENTS.items()},
        )
        assert data.do_dai_ao == Decimal("65.0")
        assert data.garment_type == "ao_dai"

    def test_measurement_too_low_rejected(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError) as exc_info:
            PatternSessionCreate(
                customer_id=uuid.uuid4(),
                do_dai_ao=Decimal("10"),  # min is 30
                ha_eo=Decimal("18.0"),
                vong_co=Decimal("36.0"),
                vong_nach=Decimal("38.0"),
                vong_nguc=Decimal("88.0"),
                vong_eo=Decimal("68.0"),
                vong_mong=Decimal("92.0"),
                do_dai_tay=Decimal("55.0"),
                vong_bap_tay=Decimal("28.0"),
                vong_co_tay=Decimal("16.0"),
            )
        assert "do_dai_ao" in str(exc_info.value)

    def test_measurement_too_high_rejected(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError) as exc_info:
            PatternSessionCreate(
                customer_id=uuid.uuid4(),
                do_dai_ao=Decimal("250"),  # max is 200
                ha_eo=Decimal("18.0"),
                vong_co=Decimal("36.0"),
                vong_nach=Decimal("38.0"),
                vong_nguc=Decimal("88.0"),
                vong_eo=Decimal("68.0"),
                vong_mong=Decimal("92.0"),
                do_dai_tay=Decimal("55.0"),
                vong_bap_tay=Decimal("28.0"),
                vong_co_tay=Decimal("16.0"),
            )
        assert "do_dai_ao" in str(exc_info.value)

    def test_each_measurement_has_range_validation(self):
        """Each of 10 measurements must have ge/le constraints."""
        from pydantic import ValidationError
        # Test vong_co_tay max = 35
        with pytest.raises(ValidationError):
            PatternSessionCreate(
                customer_id=uuid.uuid4(),
                do_dai_ao=Decimal("65.0"),
                ha_eo=Decimal("18.0"),
                vong_co=Decimal("36.0"),
                vong_nach=Decimal("38.0"),
                vong_nguc=Decimal("88.0"),
                vong_eo=Decimal("68.0"),
                vong_mong=Decimal("92.0"),
                do_dai_tay=Decimal("55.0"),
                vong_bap_tay=Decimal("28.0"),
                vong_co_tay=Decimal("99.0"),  # max is 35
            )

    def test_geometry_params_schema(self):
        params = GeometryParams(**SAMPLE_GEOMETRY_PARAMS)
        assert params.bust_width == 24.5
        assert params.hem_width == 37.0
        assert params.seam_allowance == 1.0
        assert params.cap_height is None

    def test_geometry_params_with_sleeve_fields(self):
        params = GeometryParams(
            **SAMPLE_GEOMETRY_PARAMS,
            cap_height=18.0,
            bicep_width=16.5,
            wrist_width=9.5,
        )
        assert params.cap_height == 18.0
        assert params.bicep_width == 16.5
        assert params.wrist_width == 9.5

    def test_piece_type_enum_values(self):
        assert PieceType.front_bodice.value == "front_bodice"
        assert PieceType.back_bodice.value == "back_bodice"
        assert PieceType.sleeve.value == "sleeve"
        assert len(PieceType) == 3

    def test_session_status_enum_values(self):
        assert PatternSessionStatus.draft.value == "draft"
        assert PatternSessionStatus.completed.value == "completed"
        assert PatternSessionStatus.exported.value == "exported"
        assert len(PatternSessionStatus) == 3

    def test_response_schemas_from_attributes(self):
        assert PatternSessionResponse.model_config["from_attributes"] is True
        assert PatternPieceResponse.model_config["from_attributes"] is True

    def test_session_response_includes_pieces(self):
        """PatternSessionResponse has pieces list field."""
        response = PatternSessionResponse(
            id=uuid.uuid4(),
            tenant_id=uuid.uuid4(),
            customer_id=uuid.uuid4(),
            created_by=uuid.uuid4(),
            do_dai_ao=Decimal("65.0"),
            ha_eo=Decimal("18.0"),
            vong_co=Decimal("36.0"),
            vong_nach=Decimal("38.0"),
            vong_nguc=Decimal("88.0"),
            vong_eo=Decimal("68.0"),
            vong_mong=Decimal("92.0"),
            do_dai_tay=Decimal("55.0"),
            vong_bap_tay=Decimal("28.0"),
            vong_co_tay=Decimal("16.0"),
            garment_type="ao_dai",
            notes=None,
            status=PatternSessionStatus.draft,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        assert response.pieces == []
        assert response.status == PatternSessionStatus.draft
