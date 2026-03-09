-- 009_add_rental_tracking_to_garments.sql
-- Story 5.4: Add renter tracking and reminder fields for automatic return reminders

ALTER TABLE garments ADD COLUMN renter_id UUID REFERENCES customer_profiles(id) ON DELETE SET NULL;
ALTER TABLE garments ADD COLUMN renter_name VARCHAR(255);
ALTER TABLE garments ADD COLUMN renter_email VARCHAR(255);
ALTER TABLE garments ADD COLUMN reminder_sent_at TIMESTAMPTZ;

-- Composite index for efficient reminder queries
CREATE INDEX idx_garments_rental_reminder ON garments (status, expected_return_date) WHERE status = 'rented';

COMMENT ON COLUMN garments.renter_id IS 'Story 5.4: FK to customer who rented this garment';
COMMENT ON COLUMN garments.renter_name IS 'Story 5.4: Cached renter name for display';
COMMENT ON COLUMN garments.renter_email IS 'Story 5.4: Cached renter email for notifications';
COMMENT ON COLUMN garments.reminder_sent_at IS 'Story 5.4: When return reminder was sent (null = not sent)';
