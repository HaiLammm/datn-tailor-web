"""Pattern service — session CRUD and pattern generation (Story 11.2).

Service layer conventions:
  - All functions are async with AsyncSession parameter
  - selectinload() for eager-loading relationships
  - await db.flush() before commit to get generated IDs
  - Raise HTTPException with detail dict for errors
  - All queries MUST filter by tenant_id for multi-tenant isolation
"""

import logging
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.db_models import CustomerProfileDB, PatternPieceDB, PatternSessionDB, UserDB
from src.models.pattern import (
    PatternPieceResponse,
    PatternSessionCreate,
    PatternSessionResponse,
    PatternSessionStatus,
)
from src.patterns.engine import generate_pattern_pieces

logger = logging.getLogger(__name__)


async def create_session(
    db: AsyncSession,
    data: PatternSessionCreate,
    user: UserDB,
    tenant_id: UUID,
) -> PatternSessionResponse:
    """Create a new pattern session with status='draft'.

    AC #1: POST /api/v1/patterns/sessions
    - Validates customer_id belongs to tenant
    - Sets tenant_id from authenticated user context
    - Sets created_by to current user's ID

    Returns:
        PatternSessionResponse with id and draft status (201).

    Raises:
        HTTPException 404: customer not found or belongs to different tenant.
    """
    # Validate customer belongs to this tenant
    customer_result = await db.execute(
        select(CustomerProfileDB).where(
            CustomerProfileDB.id == data.customer_id,
            CustomerProfileDB.tenant_id == tenant_id,
        )
    )
    customer = customer_result.scalar_one_or_none()
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "ERR_CUSTOMER_NOT_FOUND",
                "message": "Khách hàng không thuộc cửa hàng này",
            },
        )

    session = PatternSessionDB(
        tenant_id=tenant_id,
        customer_id=data.customer_id,
        created_by=user.id,
        garment_type=data.garment_type,
        notes=data.notes,
        status="draft",
        # 10 measurement snapshot
        do_dai_ao=data.do_dai_ao,
        ha_eo=data.ha_eo,
        vong_co=data.vong_co,
        vong_nach=data.vong_nach,
        vong_nguc=data.vong_nguc,
        vong_eo=data.vong_eo,
        vong_mong=data.vong_mong,
        do_dai_tay=data.do_dai_tay,
        vong_bap_tay=data.vong_bap_tay,
        vong_co_tay=data.vong_co_tay,
    )

    db.add(session)
    await db.flush()  # get session.id
    await db.commit()
    logger.info("Created pattern session %s for customer %s", session.id, data.customer_id)

    # Reload with pieces eager-loaded (db.refresh() would trigger lazy-load → MissingGreenlet)
    reload_result = await db.execute(
        select(PatternSessionDB)
        .options(selectinload(PatternSessionDB.pieces))
        .where(PatternSessionDB.id == session.id)
    )
    session = reload_result.scalar_one()

    return PatternSessionResponse.model_validate(session)


async def generate_patterns(
    db: AsyncSession,
    session_id: UUID,
    user: UserDB,
    tenant_id: UUID,
) -> PatternSessionResponse:
    """Generate 3 pattern pieces for a draft session.

    AC #2: POST /api/v1/patterns/sessions/{id}/generate
    - Loads session and verifies status='draft' and tenant ownership
    - Calls engine.generate_pattern_pieces() with session measurements
    - Creates 3 PatternPieceDB records (front_bodice, back_bodice, sleeve)
    - Updates session status to 'completed'

    Returns:
        PatternSessionResponse with nested pieces.

    Raises:
        HTTPException 404: session not found or wrong tenant.
        HTTPException 409: session already completed (cannot regenerate).
    """
    result = await db.execute(
        select(PatternSessionDB)
        .options(selectinload(PatternSessionDB.pieces))
        .where(
            PatternSessionDB.id == session_id,
            PatternSessionDB.tenant_id == tenant_id,
        )
    )
    session = result.scalar_one_or_none()

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "ERR_SESSION_NOT_FOUND",
                "message": "Phiên thiết kế không tìm thấy",
            },
        )

    if session.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "ERR_SESSION_NOT_DRAFT",
                "message": "Chỉ có thể tạo mẫu cho phiên ở trạng thái nháp",
            },
        )

    # Build measurements dict — convert Decimal to float handled in formulas._f()
    measurements = {
        "do_dai_ao": session.do_dai_ao,
        "ha_eo": session.ha_eo,
        "vong_co": session.vong_co,
        "vong_nach": session.vong_nach,
        "vong_nguc": session.vong_nguc,
        "vong_eo": session.vong_eo,
        "vong_mong": session.vong_mong,
        "do_dai_tay": session.do_dai_tay,
        "vong_bap_tay": session.vong_bap_tay,
        "vong_co_tay": session.vong_co_tay,
    }

    pieces = generate_pattern_pieces(measurements)
    logger.info("Generated %d pattern pieces for session %s", len(pieces), session_id)

    # Create PatternPieceDB records (AC #2)
    piece_db_list: list[PatternPieceDB] = []
    for piece in pieces:
        piece_db = PatternPieceDB(
            session_id=session.id,
            piece_type=piece.piece_type,
            svg_data=piece.svg_data,
            geometry_params=piece.geometry_params,
        )
        db.add(piece_db)
        piece_db_list.append(piece_db)

    # Transition status to completed
    session.status = "completed"

    await db.flush()  # assigns IDs + created_at to all piece_db records
    await db.commit()

    # Build response directly from in-memory objects (avoid lazy-load after expire_on_commit)
    # This prevents MissingGreenlet in sync TestClient context
    piece_responses = [
        PatternPieceResponse(
            id=p.id,
            session_id=p.session_id,
            piece_type=p.piece_type,
            svg_data=p.svg_data,
            geometry_params=p.geometry_params,
            created_at=p.created_at,
        )
        for p in piece_db_list
    ]

    return PatternSessionResponse(
        id=session.id,
        tenant_id=session.tenant_id,
        customer_id=session.customer_id,
        created_by=session.created_by,
        do_dai_ao=session.do_dai_ao,
        ha_eo=session.ha_eo,
        vong_co=session.vong_co,
        vong_nach=session.vong_nach,
        vong_nguc=session.vong_nguc,
        vong_eo=session.vong_eo,
        vong_mong=session.vong_mong,
        do_dai_tay=session.do_dai_tay,
        vong_bap_tay=session.vong_bap_tay,
        vong_co_tay=session.vong_co_tay,
        garment_type=session.garment_type,
        notes=session.notes,
        status=PatternSessionStatus.completed,
        pieces=piece_responses,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


async def get_session(
    db: AsyncSession,
    session_id: UUID,
    tenant_id: UUID,
) -> PatternSessionResponse:
    """Get a pattern session by ID with tenant isolation.

    AC #6: GET /api/v1/patterns/sessions/{id}
    - Eager-loads PatternPieceDB via selectinload
    - Returns 404 if not found or wrong tenant

    Returns:
        PatternSessionResponse with all measurements and nested pieces.
    """
    result = await db.execute(
        select(PatternSessionDB)
        .options(selectinload(PatternSessionDB.pieces))
        .where(
            PatternSessionDB.id == session_id,
            PatternSessionDB.tenant_id == tenant_id,
        )
    )
    session = result.scalar_one_or_none()

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "ERR_SESSION_NOT_FOUND",
                "message": "Phiên thiết kế không tìm thấy",
            },
        )

    return PatternSessionResponse.model_validate(session)
