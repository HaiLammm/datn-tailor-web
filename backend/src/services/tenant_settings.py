"""Per-tenant settings helper (Story 12.7).

tenants.settings is a JSONB bag (migration 045). All reads go through
get_tenant_setting() so future settings reuse the same access path and the
None/missing-key handling lives in exactly one place.
"""

from typing import Any

from src.models.db_models import TenantDB

# Default free-alteration warranty window after delivery (FR101).
# Domain research 2026-06-10: shops range 7d–6mo with no industry standard —
# 30 days is the agreed product default; tenants override via settings.
ALTERATION_WARRANTY_DAYS_KEY = "alteration_warranty_days"
DEFAULT_ALTERATION_WARRANTY_DAYS = 30


def get_tenant_setting(tenant: TenantDB | None, key: str, default: Any) -> Any:
    """Read one setting from the tenant's JSONB settings bag.

    Defensive: tolerates a missing tenant, a NULL/absent settings column
    (rows predating migration 045 in a not-yet-migrated DB), a missing key,
    and a non-dict JSONB value (scalar/array — valid JSONB, just not a bag).
    """
    if tenant is None:
        return default
    settings = getattr(tenant, "settings", None)
    if not isinstance(settings, dict):
        return default
    return settings.get(key, default)
