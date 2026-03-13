-- Migration 012: Create appointments table (Story 3.4)
-- Lịch Book Appointments Tiệm & Khách (Calendar UI)

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    appointment_date DATE NOT NULL,
    slot VARCHAR(20) NOT NULL DEFAULT 'morning',  -- 'morning' | 'afternoon'
    special_requests TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending' | 'confirmed' | 'cancelled'
    reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast availability lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_date_slot
    ON appointments(tenant_id, appointment_date, slot);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id
    ON appointments(tenant_id);

CREATE INDEX IF NOT EXISTS idx_appointments_status
    ON appointments(status);

-- Index for reminder scheduler: find tomorrow's appointments
CREATE INDEX IF NOT EXISTS idx_appointments_reminder
    ON appointments(appointment_date, reminder_sent)
    WHERE status != 'cancelled';
