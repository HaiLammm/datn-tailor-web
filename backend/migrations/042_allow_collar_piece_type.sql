-- Migration 042: Allow 'collar' piece_type in pattern_pieces (Story 11.8 follow-up)
-- Story 11.8 added the collar (lá cổ) piece to the deterministic pattern engine and to
-- the PieceType enum, but the original check_piece_type constraint (migration 030) was
-- never widened. Generating pieces therefore fails with a CheckViolationError on 'collar'.
-- This migration recreates the constraint to include 'collar'. Idempotent (DROP IF EXISTS).

ALTER TABLE pattern_pieces DROP CONSTRAINT IF EXISTS check_piece_type;

ALTER TABLE pattern_pieces
    ADD CONSTRAINT check_piece_type
        CHECK (piece_type IN ('front_bodice', 'back_bodice', 'sleeve', 'collar'));
