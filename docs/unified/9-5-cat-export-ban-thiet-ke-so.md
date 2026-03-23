# Unified Story 9-5: Cat Export Ban thiet ke So

Status: done

## Phase 1 — Requirements (Original)
> Nguon: docs/4-4-xuat-ban-ve-san-xuat.md

### Story

As a **Tho may (Minh)**,
I want **xuat ban ve ky thuat chi tiet duoi dang SVG hoac DXF**,
so that **toi co the in rap hoac chieu len vai de bat dau cat che tac**.

### Acceptance Criteria

1. **Given** Thiet ke da duoc phe duyet va vuot qua cac Guardrails (design status = "locked")
   **When** Tho Minh nhan "Export for Production" tren Tailor Review page
   **Then** Backend tao file SVG (hien thi truc quan) va file DXF (chuan CAD cho may cat)
   **And** Tra ve file download truc tiep (StreamingResponse)

2. **Given** Ban ve duoc tao thanh cong
   **When** Render noi dung ban ve
   **Then** Ban ve bao gom cac thong so gia giam (+/- cm) chi tiet cho tung vi tri rap
   **And** Su dung 100% thuat ngu chuyen nganh may Viet Nam tren ban ve (NFR11)
   **And** Annotation vi tri: Vong co, Rong vai, Vong nguc, Vong eo, Vong mong, Dai ao, Dai tay, Vong co tay

3. **Given** Thiet ke co vi pham Guardrails chua duoc giai quyet
   **When** Minh nhan "Export for Production"
   **Then** He thong tu choi xuat va hien thi loi (FR10: ngan chan xuat Blueprint neu vi pham Golden Rules)
   **And** Redirect ve Sanity Check Dashboard de review

4. **Given** Nguoi dung co role = Customer
   **When** Truy cap export endpoint
   **Then** He thong tra ve 403 Forbidden (chi Owner va Tailor duoc phep xuat)

5. **Given** File SVG duoc xuat
   **When** Mo file bang trinh duyet hoac phan mem vector
   **Then** Tat ca cac PatternPart duoc hien thi chinh xac (coordinates mm)
   **And** Sai so hinh hoc tuyet doi <= 1mm so voi tinh toan ly thuyet (NFR3)

6. **Given** File DXF duoc xuat
   **When** Mo file bang phan mem CAD (AutoCAD, LibreCAD)
   **Then** Tat ca cac entity (LINE, LWPOLYLINE, SPLINE) hien thi dung
   **And** Annotations bang tieng Viet hien thi chinh xac
   **And** Don vi la mm (millimeters)

### Tasks / Subtasks

- [x] Task 1: Backend -- Add ezdxf dependency (AC: #6)
- [x] Task 2: Backend -- Export Pydantic Models (AC: #1, #2)
- [x] Task 3: Backend -- Blueprint Export Service (AC: #1, #2, #5, #6)
- [x] Task 4: Backend -- Export API Endpoint (AC: #1, #3, #4)
- [x] Task 5: Frontend -- Export TypeScript Types (AC: #1)
- [x] Task 6: Frontend -- Export Server Action (AC: #1, #3)
- [x] Task 7: Frontend -- Export Button UI on Tailor Review Page (AC: #1, #3)
- [x] Task 8: Tests (AC: #1-#6)

## Phase 2 — Implementation
> Phase 2 file khong ton tai — story hoan thanh truoc khi co workflow implementation-artifacts

## Traceability
- Phase 1 Story: 4.4 - Xuat Ban ve San xuat (Manufacturing Blueprint & DXF/SVG Export)
- Phase 2 Story: 9-5-cat-export-ban-thiet-ke-so
- Epic: 9
