import asyncio
import os
import sys
import re
from pathlib import Path
from dotenv import load_dotenv

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Add backend directory to sys.path to import src
backend_dir = Path(__file__).parent.parent
sys.path.append(str(backend_dir))

# FORCE LOAD .env from the backend directory
env_path = backend_dir / ".env"
load_dotenv(dotenv_path=env_path)

from src.core.config import settings

def split_sql_statements(sql):
    """Split SQL while preserving dollar-quoted functions and triggers."""
    # First, protect dollar-quoted blocks by replacing them temporarily
    dollar_blocks = []
    def protect_dollar_quotes(match):
        dollar_blocks.append(match.group(0))
        return f"__DOLLAR_BLOCK_{len(dollar_blocks) - 1}__"
    
    # Match dollar-quoted strings ($$...$$)
    protected_sql = re.sub(r'\$\$.*?\$\$', protect_dollar_quotes, sql, flags=re.DOTALL)
    
    # Now split on semicolons outside quotes
    statements = re.split(r';(?=(?:[^\'"]*[\'"][^\'"]*[\'"])*[^\'"]*$)', protected_sql)
    
    # Restore dollar-quoted blocks
    result = []
    for stmt in statements:
        for i, block in enumerate(dollar_blocks):
            stmt = stmt.replace(f"__DOLLAR_BLOCK_{i}__", block)
        if stmt.strip():
            result.append(stmt.strip())
    
    return result

async def run_migrations():
    # Use settings.DATABASE_URL which now should have the .env value
    db_url = os.getenv("DATABASE_URL") or settings.DATABASE_URL
    
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")
    
    print(f"🚀 Kết nối tới Database THỰC TẾ: {db_url.split('@')[-1]}")
    
    try:
        engine = create_async_engine(db_url, echo=False)
        
        migrations_dir = backend_dir / "migrations"
        sql_files = sorted(list(migrations_dir.glob("*.sql")))
        
        async with engine.connect() as conn:
            for sql_file in sql_files:
                print(f"📄 Đang xử lý {sql_file.name}...")
                with open(sql_file, "r", encoding="utf-8") as f:
                    sql_content = f.read()
                    statements = split_sql_statements(sql_content)
                    
                    for statement in statements:
                        if not statement:
                            continue
                        try:
                            async with conn.begin():
                                await conn.execute(text(statement))
                        except Exception as e:
                            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                                pass
                            else:
                                raise e
                print(f"✅ Đã xong {sql_file.name}")

        print(f"\n✨ XÁC NHẬN: Toàn bộ migration đã được áp dụng vào '{db_url.split('/')[-1]}'.")
        await engine.dispose()
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run_migrations())
