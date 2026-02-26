"""Tests for verifying project structure (AC: 1, 3)."""

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def test_frontend_directory_exists() -> None:
    """AC 1: /frontend directory must exist."""
    assert (PROJECT_ROOT / "frontend").is_dir()


def test_backend_directory_exists() -> None:
    """AC 1: /backend directory must exist."""
    assert (PROJECT_ROOT / "backend").is_dir()


def test_backend_src_directory_exists() -> None:
    """AC 3: backend/src must exist for layered architecture."""
    assert (PROJECT_ROOT / "backend" / "src").is_dir()


def test_backend_layered_structure() -> None:
    """AC 3: Backend must have layered directory structure."""
    src = PROJECT_ROOT / "backend" / "src"
    expected_dirs = ["api", "agents", "geometry", "constraints", "models", "services"]
    for dirname in expected_dirs:
        assert (src / dirname).is_dir(), f"Missing directory: src/{dirname}"


def test_backend_api_v1_exists() -> None:
    """AC 3: Backend must have api/v1 for versioned endpoints."""
    assert (PROJECT_ROOT / "backend" / "src" / "api" / "v1").is_dir()


def test_env_files_exist() -> None:
    """AC 5: .env files must exist at root, frontend, backend."""
    assert (PROJECT_ROOT / ".env").is_file(), "Missing root .env"
    assert (PROJECT_ROOT / "frontend" / ".env").is_file(), "Missing frontend/.env"
    assert (PROJECT_ROOT / "backend" / ".env").is_file(), "Missing backend/.env"


def test_env_contains_required_variables() -> None:
    """AC 5: .env must contain DATABASE_URL, AUTH_SECRET, NEXTAUTH_URL."""
    env_content = (PROJECT_ROOT / ".env").read_text()
    assert "DATABASE_URL" in env_content
    assert "AUTH_SECRET" in env_content
    assert "NEXTAUTH_URL" in env_content


def test_frontend_package_json_exists() -> None:
    """AC 2: Frontend package.json must exist."""
    assert (PROJECT_ROOT / "frontend" / "package.json").is_file()


def test_frontend_src_app_exists() -> None:
    """AC 2: Frontend src/app directory (App Router) must exist."""
    assert (PROJECT_ROOT / "frontend" / "src" / "app").is_dir()


def test_auth_files_exist() -> None:
    """AC 4: Auth.js files must exist."""
    assert (PROJECT_ROOT / "frontend" / "src" / "auth.ts").is_file()
    assert (PROJECT_ROOT / "frontend" / "src" / "proxy.ts").is_file()


def test_nextauth_api_route_exists() -> None:
    """AC 4: NextAuth API route must exist."""
    route_file = (
        PROJECT_ROOT / "frontend" / "src" / "app" / "api" / "auth"
        / "[...nextauth]" / "route.ts"
    )
    assert route_file.is_file()


def test_backend_main_exists() -> None:
    """AC 3: Backend main.py must exist."""
    assert (PROJECT_ROOT / "backend" / "src" / "main.py").is_file()


def test_requirements_txt_exists() -> None:
    """AC 3: Backend requirements.txt must exist."""
    assert (PROJECT_ROOT / "backend" / "requirements.txt").is_file()


def test_gitignore_exists() -> None:
    """.gitignore must exist."""
    assert (PROJECT_ROOT / ".gitignore").is_file()
