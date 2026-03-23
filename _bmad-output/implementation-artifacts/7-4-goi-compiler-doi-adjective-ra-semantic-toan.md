# Unified Story 7.4: Gọi Compiler đổi Adjective ra Semantic toán

Status: Phase 1 only — not implemented in Phase 2

## Phase 1 — Requirements (Original)
> Nguồn: docs/2-4-dich-thuat-cam-xuc-sang-ease-delta.md

## Story

As a **He thong (AI Engine)**,
I want **chuyen doi cuong do phong cach thanh cac chi so hinh hoc (Deltas)**,
so that **co du lieu chinh xac de bien doi ban ve rap**.

## Acceptance Criteria

1. **Translate Endpoint:** API `POST /api/v1/inference/translate` nhan Style + Intensity input va tra ve Master Geometry JSON chua cac bo Delta (vd: `waist_ease: +2.0cm`).
2. **LangGraph Orchestration:** Backend su dung LangGraph de xay dung "Stateful Multi-Agent" reasoning loop cho viec dich thuat cam xuc sang hinh hoc.
3. **Smart Rules Lookup:** Agent tra cuu Smart Rules cua nghe nhan tu Local Knowledge Base (LKB) tai Backend de xac dinh Delta mapping.
4. **Master Geometry JSON Output:** Response phai tuan thu schema Master Geometry Snapshot gom: `sequence_id`, `base_hash`, `algorithm_version`, `deltas`, `geometry_hash`.
5. **Performance NFR1:** Thoi gian phan hoi suy luan trung binh Lavg < 15 giay (toan bo LangGraph inference cycle).
6. **Vietnamese Terminology:** 100% ten Delta, labels, va error messages su dung thuat ngu chuyen mon nganh may Viet Nam (NFR11).

## Phase 2 — Implementation
> Không có story Phase 2 tương ứng

## Traceability
- Phase 1 Story: 2.4 — Dịch thuật Cảm xúc sang Ease Delta (Emotional Compiler Engine)
- Phase 2 Story: N/A
- Epic: 7
