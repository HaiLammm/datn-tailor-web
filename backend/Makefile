.PHONY: help install run test freeze clean migrate

# Default target - show help
help:
	@echo "Backend Makefile Commands:"
	@echo "  make install PACKAGE=<name>  - Install a Python package to venv"
	@echo "  make run                     - Run uvicorn development server"
	@echo "  make test                    - Run pytest test suite"
	@echo "  make freeze                  - Update requirements.txt from venv"
	@echo "  make migrate                 - Run database migrations"
	@echo "  make clean                   - Remove Python cache files"
	@echo ""
	@echo "Examples:"
	@echo "  make install PACKAGE=ezdxf"
	@echo "  make install PACKAGE='fastapi[all]'"

# Install package to venv
install:
ifndef PACKAGE
	@echo "Error: PACKAGE not specified"
	@echo "Usage: make install PACKAGE=<package-name>"
	@exit 1
endif
	./venv/bin/pip install $(PACKAGE)
	@echo ""
	@echo "Package installed. Don't forget to run: make freeze"

# Run development server
run:
	./venv/bin/uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
test:
	./venv/bin/pytest tests/ -v

# Update requirements.txt
freeze:
	./venv/bin/pip freeze > requirements.txt
	@echo "requirements.txt updated successfully"

# Run database migrations
migrate:
	./venv/bin/python scripts/migrate.py

# Clean Python cache
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	@echo "Cache cleaned successfully"
