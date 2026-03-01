# GEMINI.md - Project Instructional Context

This file provides critical context, architectural rules, and development guidelines for the `tailor_project`.

## Project Overview

`tailor_project` is an AI-powered bespoke tailoring platform (specializing in Vietnamese Áo dài) that bridges heritage craftsmanship with modern computational geometry. It uses AI to translate aesthetic preferences into precise tailoring patterns.

### Core Technology Stack

- **Frontend:** Next.js 16 (App Router), TypeScript (Strict Mode), Tailwind CSS v4, Auth.js v5 (Beta), Zustand (State), TanStack Query (Data Fetching).
- **Backend:** Python 3.11+, FastAPI, LangGraph (AI Orchestration), Pydantic v2 (Validation).
- **Database:** PostgreSQL 17 + pgvector 0.8.x (Tên DB: `tailor_db`).
- **Geometry Core:** Master Geometry JSON as the Single Source of Truth (SSOT).

---

## Building and Running

### Frontend (Next.js)

- **Installation:** `cd frontend && npm install`
- **Development:** `npm run dev` (Starts at http://localhost:3000)
- **Production Build:** `npm run build`
- **Linting:** `npm run lint`
- **Testing:** `npm test`

### Backend (FastAPI)

- **Setup Environment:**
  ```bash
  cd backend
  python -m venv venv
  source venv/bin/activate  # On Windows: venv\Scripts\activate
  pip install -r requirements.txt
  ```
- **Development:** `uvicorn src.main:app --reload` (Starts at http://localhost:8000)
- **Testing:** `pytest`

---

## Development Conventions & Rules

### 1. Authoritative Server Pattern
- **RULE:** The Backend is the **only source of truth** for geometry calculations and physical constraints.
- **DO NOT** perform geometry transformations or pattern-making logic on the Frontend.
- The Frontend is responsible for rendering (SVG Morphing) and user interaction only.

### 2. Naming Conventions
- **Backend (Python):**
  - Database fields, API endpoints, Variables, Functions: `snake_case`.
  - Classes, Pydantic Models: `PascalCase`.
- **Frontend (TypeScript/React):**
  - Components, Types/Interfaces: `PascalCase`.
  - Variables, Functions, Hooks: `camelCase`.
  - JSON Fields (for SSOT synchronization): `snake_case`.

### 3. Terminology Policy
- **CRITICAL:** Use 100% professional Vietnamese tailoring terminology for all UI labels, technical documentation, and AI outputs (e.g., "Hạ nách", "Cấn tay", "Vòng nách", "Sa gấu").

### 4. Validation Strategy
- **Frontend:** Use **Zod** for raw input validation (type checking, required fields).
- **Backend:** Use **Pydantic v2** for business logic and geometry validation.

### 5. Security (JWT & Cookies)
- **RULE:** Use **JWT** stored in **HttpOnly, Secure, SameSite Cookie**.
- **DO NOT** store tokens in `localStorage` or `sessionStorage`.
- Implementation via Auth.js v5.
- **Next.js 16 Strategy:** Use `proxy.ts` ONLY for auth/redirection logic. DO NOT use `middleware.ts`.

---

## Project Structure

- `/frontend/src/app`: Server Components (Layouts, Pages).
- `/frontend/src/app/proxy.ts`: Next.js 16 Proxy logic (Redirection).
- `/frontend/src/components`: Client Components (`"use client"`).
- `/backend/src/agents`: LangGraph coordination logic.
- `/backend/src/geometry`: Core geometry and pattern-making logic.
- `/_bmad-output`: Planning artifacts, PRDs, and architecture reports.
