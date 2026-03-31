---
title: 'Notification Bell in Navbar with Voucher Type'
type: 'feature'
created: '2026-03-31'
status: 'done'
baseline_commit: 'deedcc5'
context: ['_bmad-output/project-context.md']
---

# Notification Bell in Navbar with Voucher Type

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Icon thông báo hiện chỉ nằm trong `/profile/notifications` (full page) và badge trong ProfileSidebar. Khách hàng không thấy thông báo khi duyệt showroom. Thêm nữa, notification type chưa bao gồm voucher (mới/đã sử dụng).

**Approach:** (1) Tạo NotificationBell client component — bell icon + unread badge + dropdown popup hiển thị danh sách thông báo. (2) Đặt vào customer layout navbar cạnh ProfileIcon. (3) Thêm type `"voucher"` vào NotificationType. (4) Click vào thông báo chưa đọc → unread count -1 ngay (optimistic UI, reuse markNotificationRead action). (5) Xóa "Thông báo" nav item khỏi ProfileSidebar vì đã có trên navbar.

## Boundaries & Constraints

**Always:** Reuse existing server actions (getMyNotifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead). Bell icon min-h 44px. Dropdown đóng khi click ngoài hoặc Escape. Vietnamese labels.

**Ask First:** Nếu cần thay đổi backend API.

**Never:** Không tạo API endpoint mới. Không dùng WebSocket/polling (giữ fetch-on-open pattern). Không đặt client component trong app/.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Bell click (authenticated) | User clicks bell | Dropdown opens, fetches notifications | Show error message in dropdown |
| Bell click (not authenticated) | No session | Bell not rendered | N/A |
| Mark read on click | Click unread notification | is_read=true, unread count -1 (optimistic) | Revert on failure |
| Mark all read | Click "Đánh dấu tất cả đã đọc" | All marked read, count=0 | Revert on failure |
| Voucher notification | type="voucher" | Gift icon (purple), label "Voucher" | N/A |
| Click outside dropdown | Click anywhere outside | Dropdown closes | N/A |
| Empty state | No notifications | "Chưa có thông báo nào" message | N/A |

</frozen-after-approval>

## Code Map

- `components/client/profile/NotificationBell.tsx` -- NEW: Bell icon + badge + dropdown, fetches on open
- `app/(customer)/layout.tsx` -- Add NotificationBell to navbar (after CartBadge, before ProfileIcon)
- `types/notification.ts` -- Add "voucher" to NotificationType
- `components/client/profile/NotificationList.tsx` -- Add voucher TypeConfig (icon, color, label)
- `components/client/profile/ProfileSidebar.tsx` -- Remove "Thông báo" nav item (moved to navbar bell)

## Tasks & Acceptance

**Execution:**
- [ ] `types/notification.ts` -- ADD "voucher" to NotificationType union
- [ ] `components/client/profile/NotificationList.tsx` -- ADD VoucherIcon SVG + voucher entry to TYPE_CONFIG (purple, "Voucher" label)
- [ ] `components/client/profile/NotificationBell.tsx` -- CREATE: Client component with bell SVG, unread badge (red circle), click toggles dropdown. On open: fetch notifications via getMyNotifications + getUnreadNotificationCount. Dropdown renders notification items with type icons, relative time, mark-as-read on click (optimistic -1). "Đánh dấu tất cả đã đọc" button. "Xem tất cả" link to /profile/notifications. Close on outside click (useRef + useEffect) and Escape key.
- [ ] `app/(customer)/layout.tsx` -- IMPORT NotificationBell, add between CartBadge and ProfileIcon, only render when userName exists (authenticated)
- [ ] `components/client/profile/ProfileSidebar.tsx` -- REMOVE "Thông báo" nav item from navItems array

**Acceptance Criteria:**
- Given authenticated user on showroom, when they see navbar, then bell icon is visible with unread count badge
- Given user clicks bell, then dropdown opens with notification list fetched from backend
- Given user clicks unread notification, then unread count decreases by 1 immediately
- Given notification type="voucher", then purple gift icon with "Voucher" label is displayed
- Given user clicks outside dropdown or presses Escape, then dropdown closes
- Given profile sidebar, then "Thông báo" nav item no longer appears

## Spec Change Log


## Verification

**Commands:**
- `cd frontend && npx tsc --noEmit` -- expected: no new type errors

**Manual checks:**
- Visit /showroom, verify bell icon in navbar with badge
- Click bell → dropdown shows notifications
- Click unread notification → count -1
- Press Escape → dropdown closes
- Visit /profile → "Thông báo" removed from sidebar
