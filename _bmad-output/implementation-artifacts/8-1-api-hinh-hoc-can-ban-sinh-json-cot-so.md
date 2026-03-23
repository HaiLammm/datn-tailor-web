# Unified Story 8-1: API Hinh hoc Can ban Sinh JSON Cot so

Status: done

## Phase 1 — Requirements (Original)
> Nguon: docs/3-1-adaptive-canvas-khoi-tao-rap-chuan.md

### Story

As a **Khach hang hoac Tho may**,
I want **thay ban ve rap chuan (Baseline) hien thi tren man hinh thiet ke**,
so that **toi co mot diem tua truc quan truoc khi bat dau chinh sua**.

### Acceptance Criteria

1. **AC1 - Canvas Initialization:** Given nguoi dung bat dau mot phien thiet ke (Design Session), When giao dien Adaptive Canvas duoc tai, Then he thong hien thi ban ve Rap chuan (Baseline Pattern) duoi dang SVG nam chinh giua va duoc ty le hoa (scaled) phu hop voi viewport.
2. **AC2 - Measurement Integration:** Given so do co ban cua khach hang (Co, Nguc, Eo, Mong...) da duoc nap, When rap chuan duoc sinh ra, Then cac diem nut (nodes) cua rap phai phan anh chinh xac cac thong so nay voi sai so tuyet doi <= 1mm (NFR3).
3. **AC3 - Visual Standards:** Ban ve phai tuan thu he mau Heritage Palette: Net ve (Stroke) mau Indigo Depth, Nen rap (Fill) trong suot hoac Silk Ivory nhat, Nen Canvas mau Heritage Gold (hoac texture giay do).
4. **AC4 - Performance:** Thoi gian tu luc nhan du lieu den khi hien thi ban ve (First Paint) phai < 200ms de dam bao trai nghiem muot ma (NFR10).
5. **AC5 - Component Architecture:** Adaptive Canvas phai la mot Client Component (`use client`) de ho tro tuong tac sau nay, nhung du lieu hinh hoc ban dau (Initial Geometry) phai duoc fetch tu Server (SSR/Server Action) de dam bao SSOT.

### Tasks / Subtasks

- [x] Task 1: Backend - Geometry Engine Foundation (Python)
  - [x] 1.1 Tao module `backend/src/geometry/` va class `GeometryEngine`.
  - [x] 1.2 Dinh nghia Pydantic Models cho `Point`, `Segment` (Curve/Line), `Path`, va `PatternPart` trong `backend/src/models/geometry.py`.
  - [x] 1.3 Cai dat logic tinh toan toa do co ban (P_base) tu so do khach hang trong `BasePatternService`.
  - [x] 1.4 Tao endpoint `POST /api/v1/geometry/baseline` nhan `MeasurementProfile` va tra ve `MasterGeometryJSON`.

Note: This P1 story was split into two P2 stories. Story 8-1 covers the backend API and geometry engine (Tasks 1, parts of Task 3), while Story 8-2 covers the frontend rendering (Task 2, parts of Task 3, Task 4).

## Phase 2 — Implementation
> Phase 2 file khong ton tai — story hoan thanh truoc khi co workflow implementation-artifacts

## Traceability
- Phase 1 Story: 3.1 - Adaptive Canvas & Khoi tao Rap chuan (Baseline Rendering)
- Phase 2 Story: 8-1-api-hinh-hoc-can-ban-sinh-json-cot-so
- Epic: 8
