-- Migration 035: Add unique constraint on pattern_pieces (session_id, piece_type)
-- Story 11.2 code review fix: prevent duplicate piece types per session

ALTER TABLE pattern_pieces
ADD CONSTRAINT uq_piece_session_type UNIQUE (session_id, piece_type);
