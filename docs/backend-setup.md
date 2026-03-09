# Backend Setup Guide

## Virtual Environment

Backend su dung virtual environment (venv) de quan ly dependencies.

### Cai dat Dependencies

**QUAN TRONG**: Khi cai dat thu vien cho backend, LUON su dung pip cua venv.

#### Cach 1: Su dung Makefile (KHUYÊN DÙNG)

```bash
cd backend
make install PACKAGE=ezdxf
make freeze  # Cap nhat requirements.txt
```

#### Cach 2: Su dung pip truc tiep

```bash
cd backend
./venv/bin/pip install <package-name>
./venv/bin/pip freeze > requirements.txt
```

**KHONG** su dung:
- `pip install` (global pip)
- `conda install` 
- Bat ky pip manager nao ngoai venv

### Makefile Commands

Backend co san Makefile de don gian hoa cac tac vu:

```bash
make help      # Hien thi tat ca lenh co san
make install   # Cai dat package (PACKAGE=<ten-package>)
make run       # Chay uvicorn server
make test      # Chay pytest
make freeze    # Cap nhat requirements.txt
make migrate   # Chay database migrations
make clean     # Xoa Python cache files
```

### Kich hoat venv (tuy chon)

Neu muon kich hoat venv de chay nhieu lenh:

```bash
source venv/bin/activate
```

Khi da kich hoat, co the su dung truc tiep:
```bash
pip install <package-name>
uvicorn src.main:app --reload
```

De thoat:
```bash
deactivate
```

## Chay Application

**Cach 1: Su dung Makefile (KHUYÊN DÙNG)**
```bash
cd backend
make run
```

**Cach 2: Voi venv chua kich hoat**
```bash
./venv/bin/uvicorn src.main:app --reload
```

**Cach 3: Voi venv da kich hoat**
```bash
source venv/bin/activate
uvicorn src.main:app --reload
```

## Cau truc Thu muc

```
backend/
├── venv/              # Virtual environment
├── src/               # Source code
├── tests/             # Unit tests
├── migrations/        # Database migrations
├── requirements.txt   # Python dependencies
└── scripts/          # Utility scripts
```
