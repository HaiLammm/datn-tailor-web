-- Migration 040: Add 5 extended artisan measurements to pattern_sessions (Story 11.8)
-- Optional (nullable) — required only by certain styles:
--   ha_ben_nguc, dang_nguc → bust dart (ben ngực)
--   ha_mong               → waist→hip drop (defaults to 18 in the engine if absent)
--   xuoi_vai, rong_vai    → shoulder slope/width for set-in (tay tra)

ALTER TABLE pattern_sessions
    ADD COLUMN IF NOT EXISTS ha_ben_nguc NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS dang_nguc   NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS ha_mong     NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS xuoi_vai    NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS rong_vai    NUMERIC(5,1);
