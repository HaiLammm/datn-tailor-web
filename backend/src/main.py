"""Nhà May Thanh Lộc Backend - FastAPI Application Entry Point."""

import logging
import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from src.api.v1.auth import router as auth_router
from src.api.v1.customers import router as customers_router
from src.api.v1.designs import router as designs_router
from src.api.v1.overrides import router as overrides_router
from src.api.v1.export import router as export_router
from src.api.v1.guardrails import router as guardrails_router
from src.api.v1.fabrics import router as fabrics_router
from src.api.v1.garments import router as garments_router
from src.api.v1.appointments import router as appointments_router
from src.api.v1.orders import router as orders_router
from src.api.v1.payments import router as payments_router
from src.api.v1.rentals import router as rentals_router
from src.api.v1.geometry import router as geometry_router
from src.api.v1.inference import router as inference_router
from src.api.v1.notifications import router as notifications_router
from src.api.v1.rules import router as rules_router
from src.api.v1.kpi import router as kpi_router
from src.api.v1.staff import router as staff_router
from src.api.v1.styles import router as styles_router
from src.api.v1.tailor_tasks import router as tailor_tasks_router
from src.api.v1.customer_profile import router as customer_profile_router
from src.api.v1.order_customer import router as order_customer_router
from src.api.v1.leads import router as leads_router
from src.api.v1.owner_appointments import router as owner_appointments_router
from src.api.v1.vouchers import router as vouchers_router
from src.api.v1.campaigns import router as campaigns_router
from src.api.v1.templates import router as templates_router
from src.api.v1.uploads import router as uploads_router
from src.api.v1.patterns import router as patterns_router
from src.core.seed import seed_owner_account

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: run startup tasks and background scheduler."""
    await seed_owner_account()

    # Start reminder scheduler (Story 5.4)
    scheduler_task = None
    try:
        from src.services.scheduler_service import start_reminder_scheduler
        scheduler_task = await start_reminder_scheduler()
        logger.info("Reminder scheduler started successfully")
    except Exception as e:
        logger.error(f"Failed to start reminder scheduler: {e}")

    yield

    # Shutdown: cancel scheduler
    if scheduler_task and not scheduler_task.done():
        scheduler_task.cancel()
        logger.info("Reminder scheduler cancelled")


app = FastAPI(
    title="Nhà May Thanh Lộc API",
    description="Backend API for the Nhà May Thanh Lộc - AI-powered tailoring platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration — allow frontend to call backend across ports
allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Vietnamese measurement validation labels (FR99)
_MEASUREMENT_INFO_VI: dict[str, tuple[str, int, int]] = {
    "do_dai_ao": ("Độ dài áo", 30, 200),
    "ha_eo": ("Hạ eo", 5, 50),
    "vong_co": ("Vòng cổ", 20, 60),
    "vong_nach": ("Vòng nách", 25, 70),
    "vong_nguc": ("Vòng ngực", 50, 180),
    "vong_eo": ("Vòng eo", 40, 160),
    "vong_mong": ("Vòng mông", 50, 180),
    "do_dai_tay": ("Độ dài tay", 30, 100),
    "vong_bap_tay": ("Vòng bắp tay", 15, 60),
    "vong_co_tay": ("Vòng cổ tay", 10, 35),
}


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    if not request.url.path.startswith("/api/v1/patterns/"):
        return JSONResponse(status_code=422, content={"detail": exc.errors()})

    errors_vi: list[str] = []
    other_errors: list[dict] = []

    for error in exc.errors():
        loc = error.get("loc", ())
        field_name = loc[-1] if loc else None

        if field_name in _MEASUREMENT_INFO_VI:
            label, min_val, max_val = _MEASUREMENT_INFO_VI[field_name]
            error_type = error.get("type", "")
            if "missing" in error_type:
                errors_vi.append(f"{label} là bắt buộc")
            elif any(k in error_type for k in ("greater_than", "less_than", "decimal")):
                errors_vi.append(f"{label} phải từ {min_val} đến {max_val} cm")
            else:
                errors_vi.append(f"{label} phải là số hợp lệ")
        else:
            other_errors.append(error)

    if errors_vi:
        return JSONResponse(
            status_code=422,
            content={
                "detail": {
                    "code": "ERR_INVALID_MEASUREMENTS",
                    "message": "; ".join(errors_vi),
                    "errors": errors_vi,
                }
            },
        )

    return JSONResponse(status_code=422, content={"detail": other_errors or exc.errors()})


# Register routers
app.include_router(auth_router)
# customer_profile_router MUST come before customers_router so that
# GET /api/v1/customers/me/measurements (self-service) is matched
# before GET /api/v1/customers/{customer_id}/measurements (owner-only).
app.include_router(customer_profile_router)
app.include_router(customers_router)
app.include_router(designs_router)
app.include_router(overrides_router)
app.include_router(export_router)
app.include_router(fabrics_router)
app.include_router(garments_router)
app.include_router(owner_appointments_router)
app.include_router(appointments_router)
app.include_router(orders_router)
app.include_router(payments_router)
app.include_router(rentals_router)
app.include_router(geometry_router)
app.include_router(guardrails_router)
app.include_router(inference_router)
app.include_router(kpi_router)
app.include_router(notifications_router)
app.include_router(rules_router)
app.include_router(staff_router)
app.include_router(styles_router)
app.include_router(tailor_tasks_router)
app.include_router(order_customer_router)
app.include_router(leads_router)
app.include_router(vouchers_router)
app.include_router(templates_router)
app.include_router(campaigns_router)
app.include_router(uploads_router)
app.include_router(patterns_router)

# Mount static files for uploaded images (must be AFTER include_router calls)
from pathlib import Path as _Path
_UPLOADS_DIR = _Path(__file__).resolve().parent.parent / "uploads"
_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_UPLOADS_DIR)), name="uploads")


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint to verify the API is running."""
    return {"status": "healthy"}
