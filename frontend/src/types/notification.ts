/**
 * TypeScript types for in-app notifications (Story 4.4f).
 */

export type NotificationType =
  | "order_status"
  | "appointment"
  | "return_reminder"
  | "payment"
  | "system";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationsData {
  notifications: NotificationItem[];
  notification_count: number;
}

export interface UnreadCountData {
  unread_count: number;
}
