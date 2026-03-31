"""Upload API Router - Image upload for garment products.

Owner-only endpoint for uploading product images to local storage.
"""

import logging
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status

from src.api.dependencies import require_roles

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/uploads", tags=["uploads"])

# Resolve upload dir relative to backend project root (backend/)
_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent.parent
UPLOAD_DIR = _BACKEND_ROOT / "uploads" / "garments"

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_FILES = 10
CHUNK_SIZE = 64 * 1024  # 64KB for chunked reading

EXTENSION_MAP = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

# Magic byte signatures for image validation
MAGIC_BYTES = {
    b"\xff\xd8\xff": "jpeg",
    b"\x89PNG\r\n\x1a\n": "png",
    b"RIFF": "webp",  # WebP starts with RIFF....WEBP
}


def _validate_magic_bytes(content: bytes) -> str | None:
    """Validate file content via magic bytes. Returns detected type or None."""
    if content[:3] == b"\xff\xd8\xff":
        return "jpeg"
    if content[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if content[:4] == b"RIFF" and len(content) >= 12 and content[8:12] == b"WEBP":
        return "webp"
    return None


@router.post(
    "/images",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Upload garment images (Owner only)",
    description="Upload one or more images for garment products. Returns URLs for uploaded files.",
)
async def upload_images(
    request: Request,
    files: list[UploadFile],
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Upload images to local storage.

    Validates file type via magic bytes (not just content_type), size (<=5MB).
    Validates ALL files before writing ANY to prevent orphaned files.
    Saves with UUID filenames to prevent collisions.

    Returns:
        {"data": {"urls": ["/uploads/garments/{uuid}.jpg", ...]}}
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Vui long chon it nhat mot file anh",
        )

    if len(files) > MAX_FILES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Toi da {MAX_FILES} file moi lan upload.",
        )

    # Phase 1: Read and validate ALL files before writing any (F3)
    validated_files: list[tuple[bytes, str]] = []  # (content, extension)

    for file in files:
        # Read in chunks to avoid loading huge files into memory (F5)
        chunks: list[bytes] = []
        total_size = 0
        while True:
            chunk = await file.read(CHUNK_SIZE)
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"File '{file.filename}' vuot qua kich thuoc toi da 5MB.",
                )
            chunks.append(chunk)

        content = b"".join(chunks)

        if not content:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"File '{file.filename}' rong.",
            )

        # Validate magic bytes instead of trusting content_type (F1)
        detected_type = _validate_magic_bytes(content)
        if detected_type is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"File '{file.filename}' khong phai anh hop le. Chi chap nhan JPEG, PNG, WebP.",
            )

        ext_map = {"jpeg": ".jpg", "png": ".png", "webp": ".webp"}
        ext = ext_map[detected_type]
        validated_files.append((content, ext))

    # Phase 2: Write all validated files (F3 — no orphans on validation failure)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    urls: list[str] = []

    for content, ext in validated_files:
        filename = f"{uuid.uuid4()}{ext}"
        filepath = UPLOAD_DIR / filename
        try:
            filepath.write_bytes(content)
        except OSError as e:
            logger.error("Failed to write upload file %s: %s", filepath, e)
            # Cleanup already-written files in this batch
            for url in urls:
                written_file = UPLOAD_DIR / url.split("/")[-1]
                written_file.unlink(missing_ok=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Loi he thong khi luu file. Vui long thu lai.",
            )
        urls.append(f"/uploads/garments/{filename}")

    return {"data": {"urls": urls}}
