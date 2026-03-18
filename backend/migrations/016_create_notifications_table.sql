-- Migration 016: Create notifications table (Story 4.4f)
-- In-app notification system for customers.
-- Links to users.id (not customer_profiles.id) since notifications target authenticated accounts.
-- Soft delete via deleted_at; unread tracking via is_read + read_at.

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_notification_type CHECK (
        type IN ('order_status', 'appointment', 'return_reminder', 'payment', 'system')
    )
);

-- Fast query: list all undeleted notifications for a user, newest first
CREATE INDEX idx_notifications_user_created
    ON notifications (user_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- Fast query: count unread notifications for badge
CREATE INDEX idx_notifications_user_unread
    ON notifications (user_id, is_read)
    WHERE deleted_at IS NULL;

-- Tenant scoping for multi-tenant queries
CREATE INDEX idx_notifications_tenant
    ON notifications (tenant_id);
