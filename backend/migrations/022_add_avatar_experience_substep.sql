-- Tailor Assignment Tracking: add avatar, experience, and production sub-step
-- avatar_url: profile image URL for all users (nullable)
-- experience_years: years of tailoring experience for Owner/Tailor (nullable)
-- production_step: granular production tracking within tailor_tasks

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_years INTEGER;

ALTER TABLE tailor_tasks ADD COLUMN IF NOT EXISTS production_step VARCHAR(50) NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_tailor_tasks_production_step ON tailor_tasks(production_step);
