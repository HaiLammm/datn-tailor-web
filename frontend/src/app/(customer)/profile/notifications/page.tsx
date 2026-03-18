/**
 * Profile Notifications Page - Story 4.4f: Thông báo
 * Server Component: fetches notifications + unread count, passes to NotificationList.
 * Auth guard is handled by parent profile/layout.tsx.
 */

import { getMyNotifications, getUnreadNotificationCount } from "@/app/actions/profile-actions";
import { NotificationList } from "@/components/client/profile/NotificationList";

export default async function ProfileNotificationsPage() {
  const [notificationsResult, unreadResult] = await Promise.all([
    getMyNotifications(),
    getUnreadNotificationCount(),
  ]);

  const hasError = !notificationsResult.success;
  const initialNotifications = notificationsResult.success
    ? (notificationsResult.data?.notifications ?? [])
    : [];
  const initialUnreadCount = unreadResult.success
    ? (unreadResult.data?.unread_count ?? 0)
    : 0;

  return (
    <NotificationList
      initialNotifications={initialNotifications}
      initialUnreadCount={initialUnreadCount}
      hasError={hasError}
    />
  );
}
