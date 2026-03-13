# Sprint Change Proposal - tailor_project

**Date:** 2026-03-12
**Prepared by:** Bob (Scrum Master)
**For:** Lem (User)

---

## 1. Issue Summary

### Problem Statement
Customer Profile page is missing from the current sprint plan. Story 4.4 only covers "View Orders / Order History" but the actual Customer Dashboard requires a comprehensive Profile Hub with 7 modules: personal info, measurements, appointments, order history, notifications, voucher wallet, and navbar profile icon.

### Discovery Context
- User (Lem) reviewed overall progress and identified that dashboards for Customer, Owner, and Tailor roles have no sprint plan
- Analysis revealed that Owner Dashboard (Epic 5) and Tailor Dashboard (Epic 5) stories are already well-defined in backlog
- However, Customer Profile Hub is significantly under-scoped in the current Story 4.4

### Evidence
- `sprint-status.yaml`: Story 4.4 titled "View Orders Lịch Sử Mua Hàng Khách Lẻ" — too narrow
- Customer layout (`(customer)/layout.tsx`): Has CartBadge but **no Profile icon** in navbar
- No `/profile` route exists in customer app directory
- PRD FR53 only covers order history, missing 6 other profile modules
- UX spec has no "My Profile" journey for customers
- Reference to `/profile/orders` exists in `OrderConfirmation.tsx` but target page not implemented

---

## 2. Impact Analysis

### 2.1 Epic Impact

| Epic | Change Type | Details |
|---|---|---|
| **Epic 4** (Order & Payment) | **Expand** | Split Story 4.4 into 7 sub-stories (4.4a-4.4g) for Customer Profile Hub |
| Epic 3 (Cart & Checkout) | No change | Continue as planned, complete review for 3-2 and 3-4 |
| Epic 5 (Operations & Tailor) | No change | Stories 5.1-5.4 already well-defined, remain in backlog |
| Epic 6 (CRM & Marketing) | No change | Remains in backlog |

### 2.2 Story Impact — New Stories for Epic 4

| Story ID | Name | Priority | Estimate | Description |
|---|---|---|---|---|
| **4.4a** | Customer Profile Layout + Navbar Icon | P0 | S | Add Profile icon to customer navbar, create `/profile` route with sidebar/tab navigation |
| **4.4b** | Thông tin cá nhân & Bảo mật | P0 | M | Avatar, email, phone, gender, password change |
| **4.4c** | Lịch sử mua hàng & Trạng thái đơn | P0 | M | Order list with status filtering, order detail view (replaces original Story 4.4 scope) |
| **4.4d** | Số đo cơ thể | P1 | S | View/edit body measurements, version history |
| **4.4e** | Lịch hẹn sắp tới | P1 | S | Upcoming appointments list with status and countdown |
| **4.4f** | Thông báo (Notifications) | P2 | M | Notifications list (order updates, appointment reminders, promotions) |
| **4.4g** | Kho Voucher | P2 | S | Available vouchers with expiry dates and usage conditions |

### 2.3 Artifact Conflicts

| Artifact | Required Changes |
|---|---|
| **PRD** | Add new FRs for Customer Profile modules (personal info, measurements in profile context, notifications, voucher wallet) |
| **Architecture** | Add API endpoints: `/api/v1/customers/me/profile`, `/api/v1/customers/me/notifications`, `/api/v1/customers/me/vouchers`. No architectural pattern changes needed. |
| **UX Design** | Add Customer Profile Hub journey flow. Follows existing Boutique Mode design. |
| **Database** | May need `notifications` and `customer_vouchers` tables |
| **Frontend** | Add Profile icon to `(customer)/layout.tsx` navbar, create `(customer)/profile/` route group |

---

## 3. Recommended Approach

### Selected: Option 1 — Direct Adjustment

**Rationale:**
- Current epic structure is sound — only Story 4.4 needs expansion
- No rollback needed — existing code works correctly
- PRD/Architecture additions are additive, not conflicting
- Code foundation already exists (auth, customer types, cart store)
- Each sub-story is independently deliverable

### Effort Estimate
- **Total new stories:** 7 (replacing 1 original)
- **Net addition:** 6 stories to Epic 4
- **Risk Level:** Low — uses established patterns, no architectural changes
- **Timeline Impact:** Epic 4 extends by ~6 stories, but P2 stories can be deferred

### Priority Phasing
- **Phase 1 (MVP Core):** 4.4a, 4.4b, 4.4c — Profile layout, personal info, order history
- **Phase 2 (Enhanced):** 4.4d, 4.4e — Measurements, appointments
- **Phase 3 (Full):** 4.4f, 4.4g — Notifications, voucher wallet

---

## 4. Detailed Change Proposals

### Proposal #1: Expand Story 4.4 into Sub-Stories (Approved ✓)

**OLD (Story 4.4):**
```
Story 4.4: View Orders Lịch Sử Mua Hàng Khách Lẻ (My Profile)
- URL: /profile/orders
- Order Cards with status
- Download Invoice PDF
```

**NEW (Stories 4.4a-4.4g):**

#### Story 4.4a: Customer Profile Layout + Navbar Icon
As a Khách hàng,
I want thấy icon Profile trên navbar và truy cập trang cá nhân tổng hợp,
So that tôi quản lý tất cả thông tin tài khoản từ một nơi.

**Acceptance Criteria:**
- **Given** Customer đã đăng nhập, đang ở bất kỳ trang nào
- **When** Nhìn navbar
- **Then** Thấy icon Profile (avatar/user icon) bên cạnh Cart icon
- **And** Click icon → navigate to `/profile`
- **And** Profile page có sidebar/tabs navigation đến các modules

#### Story 4.4b: Thông tin cá nhân & Bảo mật
As a Khách hàng,
I want xem và chỉnh sửa thông tin cá nhân (ảnh đại diện, email, SĐT, giới tính) và đổi mật khẩu,
So that hồ sơ của tôi luôn cập nhật và bảo mật.

**Acceptance Criteria:**
- **Given** Customer đang ở trang Profile
- **When** Mở tab "Thông tin cá nhân"
- **Then** Hiển thị form với: avatar upload, email (read-only), SĐT, giới tính
- **And** Có section "Đổi mật khẩu" với validation Zod
- **And** Submit thành công → Toast notification

#### Story 4.4c: Lịch sử mua hàng & Trạng thái đơn
As a Khách hàng,
I want xem danh sách đơn hàng đã đặt với trạng thái và chi tiết,
So that tôi theo dõi được tình trạng đơn hàng.

**Acceptance Criteria:**
- **Given** Customer đang ở Profile → tab "Đơn hàng"
- **When** Load danh sách orders
- **Then** Hiển thị Order Cards với: mã đơn, ngày đặt, tổng tiền, StatusBadge
- **And** Filter theo trạng thái (Pending, Confirmed, Shipped, Delivered)
- **And** Click order → xem chi tiết + nút Download Invoice PDF

#### Story 4.4d: Số đo cơ thể
As a Khách hàng,
I want xem và cập nhật số đo cơ thể đã lưu,
So that tiệm may có thông tin chính xác khi may đo.

**Acceptance Criteria:**
- **Given** Customer đang ở Profile → tab "Số đo"
- **When** Load measurements
- **Then** Hiển thị bảng số đo hiện tại (Ngực, Eo, Mông, Vai, Tay, Thân, Cổ)
- **And** Có nút "Chỉnh sửa" với form cập nhật
- **And** Version history hiển thị các lần thay đổi

#### Story 4.4e: Lịch hẹn sắp tới
As a Khách hàng,
I want xem danh sách lịch hẹn đã đặt,
So that tôi không quên lịch tư vấn tại tiệm.

**Acceptance Criteria:**
- **Given** Customer đang ở Profile → tab "Lịch hẹn"
- **When** Load appointments
- **Then** Hiển thị upcoming appointments với: ngày/giờ, trạng thái, countdown
- **And** Có thể hủy lịch hẹn (nếu còn > 24h)

#### Story 4.4f: Thông báo
As a Khách hàng,
I want nhận và xem thông báo về đơn hàng, lịch hẹn, khuyến mãi,
So that tôi không bỏ lỡ thông tin quan trọng.

**Acceptance Criteria:**
- **Given** Customer đang ở Profile → tab "Thông báo"
- **When** Load notifications
- **Then** Hiển thị danh sách thông báo sorted by date, unread highlighted
- **And** Click → mark as read + navigate to relevant page

#### Story 4.4g: Kho Voucher
As a Khách hàng,
I want xem các mã giảm giá đã nhận và còn hiệu lực,
So that tôi áp dụng voucher khi mua hàng.

**Acceptance Criteria:**
- **Given** Customer đang ở Profile → tab "Voucher"
- **When** Load vouchers
- **Then** Hiển thị danh sách voucher với: mã, loại giảm (% / fixed), hạn sử dụng, điều kiện
- **And** Voucher hết hạn hiển thị mờ (disabled)

**Rationale:** Original Story 4.4 was too narrow for a complete Customer Profile experience. Shopee-style profile page requires comprehensive personal hub. Sub-stories allow incremental delivery with P0/P1/P2 prioritization.

### Proposal #2: Add Profile Icon to Customer Navbar

**OLD (customer layout.tsx):**
- Navbar: Logo + "Trang chủ" link + CartBadge

**NEW:**
- Navbar: Logo + "Trang chủ" link + CartBadge + **ProfileIcon** (avatar or user icon, links to `/profile`)

**Rationale:** Navbar must provide quick access to both Cart and Profile — standard E-commerce pattern (ref: Shopee, Zara).

---

## 5. MVP Scope Impact

| Original MVP (Epic 4) | Updated MVP (Epic 4) |
|---|---|
| 4 stories (4.1-4.4) | 4.1, 4.2, 4.3 + 7 sub-stories (4.4a-4.4g) = 10 stories |

### Priority Phasing for MVP
- **Must-have (P0):** 4.1, 4.2, 4.3, 4.4a, 4.4b, 4.4c — core order management + profile essentials
- **Should-have (P1):** 4.4d, 4.4e — measurements + appointments
- **Nice-to-have (P2):** 4.4f, 4.4g — notifications + voucher wallet (can defer to Epic 6 sprint)

---

## 6. Implementation Handoff

### Change Scope: **MODERATE**

Requires coordination between:
- Scrum Master (sprint-status update, story file creation)
- Product Manager (PRD FR additions)
- Development Team (implementation)

### Deliverables
1. ✅ Sprint Change Proposal (this document)
2. Updated sprint-status.yaml with new sub-stories
3. Story files for 4.4a-4.4g in implementation-artifacts
4. PRD update with new FRs for Customer Profile modules

### Next Steps
1. **Update sprint-status.yaml** — Replace story 4.4 with 4.4a-4.4g entries
2. **Run `/bmad-bmm-sprint-planning`** — Plan sprint for Epic 4 (after Epic 3 code reviews complete)
3. **Run `/bmad-bmm-create-story`** — Create detailed story files starting with 4.4a

---

**Approved by:** Lem
**Date:** 2026-03-12
