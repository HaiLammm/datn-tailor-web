# Story 11.1: DB Migration — Pattern Data Model

Status: review

## Story

As a Owner (Chu tiem),
I want he thong co so du lieu duoc thiet lap day du cho chuc nang tao ban rap ky thuat tu so do co the,
so that toi co the tao, luu tru va quan ly cac ban ve ky thuat (technical patterns) de giao cho tho may thuc hien.

## Acceptance Criteria (BDD)

1. **Given** Migration 030 duoc chay thanh cong
   **When** Schema duoc kiem tra
   **Then** Bang `pattern_sessions` ton tai voi 10 cot so do (NUMERIC 5,1), cac FK (tenant_id, customer_id, created_by), status enum, timestamps
   **And** Bang `pattern_pieces` ton tai voi session_id FK (CASCADE), piece_type check, svg_data TEXT, geometry_params JSONB
   **And** Bang `orders` co cot moi `pattern_session_id` (UUID FK nullable, ON DELETE SET NULL)
   **And** Tat ca indexes duoc tao cho cac truong query thuong xuyen

2. **Given** PatternSessionDB va PatternPieceDB SQLAlchemy models duoc tao
   **When** ORM query duoc thuc hien
   **Then** Mapped columns khop chinh xac voi migration schema
   **And** Relationships (session.pieces, piece.session) hoat dong dung voi back_populates
   **And** OrderDB co relationship toi pattern_sessions (optional)

3. **Given** Pydantic schemas duoc tao trong pattern.py
   **When** Data validation duoc kiem tra
   **Then** PatternSessionCreate validate 10 measurements voi min/max ranges
   **And** PatternSessionResponse map tu ORM model voi model_config from_attributes
   **And** PatternPieceResponse bao gom svg_data va geometry_params
   **And** GeometryParams schema dinh nghia structure cho JSONB field

4. **Given** Measurement data duoc insert vao pattern_sessions
   **When** 10 cot so do duoc populate
   **Then** Moi cot luu dung NUMERIC(5,1) — vd: 65.5, 120.0
   **And** Vietnamese column names duoc giu nguyen (do_dai_ao, ha_eo, vong_co, vong_nach, vong_nguc, vong_eo, vong_mong, do_dai_tay, vong_bap_tay, vong_co_tay)

5. **Given** Pattern pieces duoc insert vao pattern_pieces
   **When** 3 pieces duoc tao cho 1 session
   **Then** piece_type chi chap nhan: front_bodice, back_bodice, sleeve
   **And** svg_data TEXT luu SVG markup (<50KB/piece)
   **And** ON DELETE CASCADE khi session bi xoa

## Tasks / Subtasks

- [x] Task 1: Create migration `backend/migrations/030_pattern_tables.sql` (AC: #1)
  - [x] 1.1 CREATE TABLE pattern_sessions — full schema below
  - [x] 1.2 CREATE TABLE pattern_pieces — full schema below
  - [x] 1.3 ALTER TABLE orders ADD COLUMN pattern_session_id
  - [x] 1.4 Create all indexes (6 indexes total)
  - [x] 1.5 Test migration: `cd backend && make migrate`

- [x] Task 2: Add SQLAlchemy ORM models to `backend/src/models/db_models.py` (AC: #2)
  - [x] 2.1 Add PatternSessionDB class
  - [x] 2.2 Add PatternPieceDB class
  - [x] 2.3 Extend OrderDB with pattern_session_id column + relationship
  - [x] 2.4 Verify import ordering (PatternSessionDB before PatternPieceDB)

- [x] Task 3: Create Pydantic schemas `backend/src/models/pattern.py` (AC: #3, #4)
  - [x] 3.1 Define enums: PatternSessionStatus, PieceType
  - [x] 3.2 Create PatternSessionCreate schema with measurement validation
  - [x] 3.3 Create PatternSessionResponse schema
  - [x] 3.4 Create PatternPieceResponse schema
  - [x] 3.5 Create GeometryParams schema (JSONB structure)

- [x] Task 4: Verify end-to-end (AC: #1-#5)
  - [x] 4.1 Run migration locally
  - [x] 4.2 Test ORM insert/query with sample data
  - [x] 4.3 Verify FK constraints work (cascade, set null)
  - [x] 4.4 Verify check constraints (status, piece_type)

## Dev Notes

### Architecture Context

Story 11.1 la nen tang database cho **Technical Pattern Engine** (Epic 11) — he thong sinh ban rap ky thuat tu 10 so do co the bang cong thuc xac dinh (deterministic formulas). Module nay **HOAN TOAN DOC LAP** voi AI Bespoke Engine (Epics 7-9):

| Aspect | Technical Pattern Engine (Epic 11) |
|--------|-------------------------------------|
| Method | Deterministic formulas (pure math, no AI) |
| Code location | `backend/src/patterns/` (Story 11.2+) |
| Output | SVG 1:1 scale + G-code (laser cutting) |
| Users | Owner only (internal Design Session) |
| DB tables | pattern_sessions, pattern_pieces (THIS STORY) |

**CRITICAL:** Module `patterns/` KHONG import tu `geometry/` hay `agents/`. Hoan toan standalone.

### Migration SQL — Exact Schema (030_pattern_tables.sql)

**IMPORTANT:** Follow existing migration patterns exactly. Use `IF NOT EXISTS`, `gen_random_uuid()`, `TIMESTAMPTZ DEFAULT now()`, `REFERENCES ... ON DELETE`.

```sql
-- Story 11.1: Pattern Engine Data Model
-- Depends on: tenants, customers, users, orders tables

-- 1. pattern_sessions — Snapshot 10 body measurements for pattern generation
CREATE TABLE IF NOT EXISTS pattern_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 10 measurement snapshot columns (immutable at generation time)
    -- Vietnamese tailoring terminology — DO NOT translate to English
    do_dai_ao NUMERIC(5,1) NOT NULL,      -- body length (do dai ao)
    ha_eo NUMERIC(5,1) NOT NULL,           -- waist drop (ha eo)
    vong_co NUMERIC(5,1) NOT NULL,         -- neck circumference
    vong_nach NUMERIC(5,1) NOT NULL,       -- armhole circumference
    vong_nguc NUMERIC(5,1) NOT NULL,       -- bust circumference
    vong_eo NUMERIC(5,1) NOT NULL,         -- waist circumference
    vong_mong NUMERIC(5,1) NOT NULL,       -- hip circumference
    do_dai_tay NUMERIC(5,1) NOT NULL,      -- sleeve length
    vong_bap_tay NUMERIC(5,1) NOT NULL,    -- bicep circumference
    vong_co_tay NUMERIC(5,1) NOT NULL,     -- wrist circumference

    garment_type VARCHAR(50) NOT NULL DEFAULT 'ao_dai',
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT check_pattern_session_status
        CHECK (status IN ('draft', 'completed', 'exported'))
);

CREATE INDEX IF NOT EXISTS idx_pattern_sessions_tenant_customer
    ON pattern_sessions(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_pattern_sessions_tenant_created_by
    ON pattern_sessions(tenant_id, created_by);
CREATE INDEX IF NOT EXISTS idx_pattern_sessions_status
    ON pattern_sessions(status);

-- 2. pattern_pieces — Generated pattern pieces (3 per session)
CREATE TABLE IF NOT EXISTS pattern_pieces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES pattern_sessions(id) ON DELETE CASCADE,
    piece_type VARCHAR(20) NOT NULL,
    svg_data TEXT NOT NULL,
    geometry_params JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT check_piece_type
        CHECK (piece_type IN ('front_bodice', 'back_bodice', 'sleeve'))
);

CREATE INDEX IF NOT EXISTS idx_pattern_pieces_session
    ON pattern_pieces(session_id);
CREATE INDEX IF NOT EXISTS idx_pattern_pieces_session_type
    ON pattern_pieces(session_id, piece_type);

-- 3. Add pattern_session_id FK to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pattern_session_id UUID
    REFERENCES pattern_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_pattern_session
    ON orders(pattern_session_id) WHERE pattern_session_id IS NOT NULL;
```

### SQLAlchemy ORM Models — Exact Code Pattern

Follow the EXACT pattern used by existing models in `db_models.py`:

```python
# Add to backend/src/models/db_models.py

class PatternSessionDB(Base):
    """ORM model for pattern_sessions table."""
    __tablename__ = "pattern_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"), nullable=False
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    # 10 measurement snapshot columns — Vietnamese terminology
    do_dai_ao: Mapped[Decimal] = mapped_column(Numeric(5, 1), nullable=False)
    ha_eo: Mapped[Decimal] = mapped_column(Numeric(5, 1), nullable=False)
    vong_co: Mapped[Decimal] = mapped_column(Numeric(5, 1), nullable=False)
    vong_nach: Mapped[Decimal] = mapped_column(Numeric(5, 1), nullable=False)
    vong_nguc: Mapped[Decimal] = mapped_column(Numeric(5, 1), nullable=False)
    vong_eo: Mapped[Decimal] = mapped_column(Numeric(5, 1), nullable=False)
    vong_mong: Mapped[Decimal] = mapped_column(Numeric(5, 1), nullable=False)
    do_dai_tay: Mapped[Decimal] = mapped_column(Numeric(5, 1), nullable=False)
    vong_bap_tay: Mapped[Decimal] = mapped_column(Numeric(5, 1), nullable=False)
    vong_co_tay: Mapped[Decimal] = mapped_column(Numeric(5, 1), nullable=False)

    garment_type: Mapped[str] = mapped_column(String(50), nullable=False, default="ao_dai")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    pieces: Mapped[list["PatternPieceDB"]] = relationship(
        "PatternPieceDB", back_populates="session", cascade="all, delete-orphan"
    )


class PatternPieceDB(Base):
    """ORM model for pattern_pieces table."""
    __tablename__ = "pattern_pieces"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pattern_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    piece_type: Mapped[str] = mapped_column(String(20), nullable=False)
    svg_data: Mapped[str] = mapped_column(Text, nullable=False)
    geometry_params: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    session: Mapped["PatternSessionDB"] = relationship(
        "PatternSessionDB", back_populates="pieces"
    )
```

**Extend OrderDB** (add inside existing OrderDB class):
```python
    # Pattern Engine integration (Epic 11)
    pattern_session_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("pattern_sessions.id", ondelete="SET NULL"), nullable=True
    )
    pattern_session: Mapped["PatternSessionDB | None"] = relationship("PatternSessionDB")
```

### Pydantic Schemas — pattern.py

Create new file `backend/src/models/pattern.py`:

```python
from decimal import Decimal
from enum import Enum
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

class PatternSessionStatus(str, Enum):
    draft = "draft"
    completed = "completed"
    exported = "exported"

class PieceType(str, Enum):
    front_bodice = "front_bodice"
    back_bodice = "back_bodice"
    sleeve = "sleeve"

class PatternSessionCreate(BaseModel):
    """Request schema for creating a pattern session."""
    customer_id: UUID
    garment_type: str = Field(default="ao_dai", max_length=50)
    notes: str | None = Field(None, max_length=2000)

    # 10 measurements — auto-filled from customer profile, editable by Owner
    do_dai_ao: Decimal = Field(..., ge=30, le=200, description="Do dai ao (cm)")
    ha_eo: Decimal = Field(..., ge=5, le=50, description="Ha eo (cm)")
    vong_co: Decimal = Field(..., ge=20, le=60, description="Vong co (cm)")
    vong_nach: Decimal = Field(..., ge=25, le=70, description="Vong nach (cm)")
    vong_nguc: Decimal = Field(..., ge=50, le=180, description="Vong nguc (cm)")
    vong_eo: Decimal = Field(..., ge=40, le=160, description="Vong eo (cm)")
    vong_mong: Decimal = Field(..., ge=50, le=180, description="Vong mong (cm)")
    do_dai_tay: Decimal = Field(..., ge=30, le=100, description="Do dai tay (cm)")
    vong_bap_tay: Decimal = Field(..., ge=15, le=60, description="Vong bap tay (cm)")
    vong_co_tay: Decimal = Field(..., ge=10, le=35, description="Vong co tay (cm)")

class GeometryParams(BaseModel):
    """Structure for pattern_pieces.geometry_params JSONB."""
    bust_width: float
    waist_width: float
    hip_width: float
    armhole_drop: float
    neck_depth: float
    hem_width: float = 37.0  # Fixed constant
    seam_allowance: float = 1.0
    # Sleeve-specific (only for sleeve piece)
    cap_height: float | None = None
    bicep_width: float | None = None
    wrist_width: float | None = None

class PatternPieceResponse(BaseModel):
    id: UUID
    session_id: UUID
    piece_type: PieceType
    svg_data: str
    geometry_params: dict
    created_at: datetime
    model_config = {"from_attributes": True}

class PatternSessionResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    customer_id: UUID
    created_by: UUID
    do_dai_ao: Decimal
    ha_eo: Decimal
    vong_co: Decimal
    vong_nach: Decimal
    vong_nguc: Decimal
    vong_eo: Decimal
    vong_mong: Decimal
    do_dai_tay: Decimal
    vong_bap_tay: Decimal
    vong_co_tay: Decimal
    garment_type: str
    notes: str | None
    status: PatternSessionStatus
    pieces: list[PatternPieceResponse] = []
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
```

### Measurement Min/Max Validation Ranges (FR99)

| Column | Vietnamese | Min (cm) | Max (cm) |
|--------|-----------|----------|----------|
| do_dai_ao | Do dai ao | 30 | 200 |
| ha_eo | Ha eo | 5 | 50 |
| vong_co | Vong co | 20 | 60 |
| vong_nach | Vong nach | 25 | 70 |
| vong_nguc | Vong nguc | 50 | 180 |
| vong_eo | Vong eo | 40 | 160 |
| vong_mong | Vong mong | 50 | 180 |
| do_dai_tay | Do dai tay | 30 | 100 |
| vong_bap_tay | Vong bap tay | 15 | 60 |
| vong_co_tay | Vong co tay | 10 | 35 |

### Design Decisions to Follow

1. **10 individual columns, NOT JSONB** — Direct SQL queries + Pydantic per-field validation
2. **svg_data as TEXT** — SVG < 50KB/piece, no external file storage needed
3. **geometry_params as JSONB** — Flexible, extensible computed parameters
4. **Status: draft → completed → exported** — Lifecycle tracking
5. **pattern_session_id on orders: NULLABLE** — Only for bespoke orders with patterns
6. **ON DELETE SET NULL for orders FK** — Deleting session doesn't delete the order
7. **ON DELETE CASCADE for pieces** — Deleting session deletes all its pieces

### Existing Codebase Patterns — MUST FOLLOW

**Imports needed in db_models.py** (verify these exist):
- `from sqlalchemy import ForeignKey, String, Text, Numeric, JSON, DateTime`
- `from sqlalchemy.orm import Mapped, mapped_column, relationship`
- `from decimal import Decimal`

**Migration execution:** `cd backend && make migrate` (runs `scripts/migrate.py`)

**API response wrapper (for future stories):** `{"data": ..., "meta": {}}`

**Auth dependencies (for future stories):** `OwnerOnly`, `OwnerOrTailor`, `TenantId` from `src.api.dependencies`

### Project Structure Notes

```
backend/
  migrations/
    030_pattern_tables.sql          ← NEW (this story)
  src/
    models/
      db_models.py                  ← MODIFY (add PatternSessionDB, PatternPieceDB, extend OrderDB)
      pattern.py                    ← NEW (Pydantic schemas)
    patterns/                       ← NOT YET — created in Story 11.2
```

**DO NOT create `backend/src/patterns/` directory in this story.** That module is for Story 11.2 (Pattern Engine Core API).

**DO NOT create API router endpoints in this story.** Those are for Story 11.2.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Technical Pattern Engine (Epic 11)]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 11]
- [Source: _bmad-output/planning-artifacts/prd/functional-requirements.md#FR91-FR99]
- [Source: backend/migrations/028_add_rental_lifecycle_columns.sql — Migration pattern reference]
- [Source: backend/src/models/db_models.py — ORM model pattern reference]
- [Source: backend/src/models/order.py — Pydantic schema pattern reference]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Migration initially failed: FK referenced `customers` table but actual table name is `customer_profiles`. Fixed and re-ran successfully.
- Test `test_three_pieces_per_session` failed due to async lazy loading. Fixed with `selectinload()` eager loading.

### Completion Notes List

- Migration 030_pattern_tables.sql creates 2 new tables + 1 FK column with 6 indexes
- PatternSessionDB has 10 Vietnamese measurement columns (NUMERIC 5,1) + status/garment_type/notes
- PatternPieceDB stores SVG data (TEXT) + geometry_params (JSONB) per piece
- OrderDB extended with nullable pattern_session_id FK (ON DELETE SET NULL)
- Pydantic schemas include min/max validation for all 10 measurements (FR99)
- 18 tests covering ORM models, Pydantic validation, relationships, and constraints
- No regressions introduced (pre-existing failures in test_production_step.py and test_rental_service.py are unrelated)

### Change Log

- 2026-04-03: Story 11.1 implemented — migration, ORM models, Pydantic schemas, 18 tests

### File List

- `backend/migrations/030_pattern_tables.sql` — NEW: Migration for pattern_sessions, pattern_pieces tables + orders FK
- `backend/src/models/db_models.py` — MODIFIED: Added PatternSessionDB, PatternPieceDB classes; extended OrderDB with pattern_session_id
- `backend/src/models/pattern.py` — NEW: Pydantic schemas (PatternSessionCreate, PatternSessionResponse, PatternPieceResponse, GeometryParams, enums)
- `backend/tests/test_11_1_pattern_models.py` — NEW: 18 tests for ORM models, Pydantic validation, relationships, constraints
