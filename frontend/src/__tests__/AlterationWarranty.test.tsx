/**
 * Story 12.7 — Post-Delivery Alteration Warranty (FR101).
 * Covers:
 * - Customer warranty window states + request form validation (AC5) in OrderDetailModal
 * - Owner approve panel flow (AC6) in OrderDetailDrawer
 * - "Sửa đồ" task_type badge (AC6) in ProductionTaskTable
 */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockRequestAlteration = jest.fn();
const mockFetchFittingRounds = jest.fn();
jest.mock("@/app/actions/order-actions", () => ({
  requestAlteration: (...args: unknown[]) => mockRequestAlteration(...args),
  fetchFittingRounds: (...args: unknown[]) => mockFetchFittingRounds(...args),
  downloadOrderInvoice: jest.fn(),
  payRemaining: jest.fn(),
}));

const mockApproveAlteration = jest.fn();
jest.mock("@/app/actions/tailor-task-actions", () => ({
  approveAlteration: (...args: unknown[]) => mockApproveAlteration(...args),
  resolveCancellation: jest.fn(),
}));

jest.mock("@/hooks/usePatternSession", () => ({
  usePatternSession: jest.fn(() => ({ session: null, isLoading: false, error: null })),
  useDetachPattern: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/components/client/design/PatternAttachDialog", () => ({
  __esModule: true,
  PatternAttachDialog: () => <div data-testid="pattern-attach-dialog" />,
}));

import OrderDetailModal from "@/components/client/orders/OrderDetailModal";
import OrderDetailDrawer from "@/components/client/orders/OrderDetailDrawer";
import ProductionTaskTable from "@/components/client/production/ProductionTaskTable";
import type {
  AlterationInfo,
  CustomerOrderDetail,
  OrderDetailResponse,
  OrderResponse,
} from "@/types/order";
import type { OwnerTaskItem } from "@/types/tailor-task";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeAlteration(overrides: Partial<AlterationInfo> = {}): AlterationInfo {
  return {
    state: "available",
    warranty_days: 30,
    remaining_days: 12,
    requested_at: null,
    ...overrides,
  };
}

function makeCustomerOrder(
  overrides: Partial<CustomerOrderDetail> = {}
): CustomerOrderDetail {
  return {
    id: "order-1",
    order_number: "ORD-20260601-ABC123",
    total_amount: 2000000,
    status: "delivered",
    payment_status: "paid",
    order_type: "buy",
    created_at: "2026-05-01T10:00:00Z",
    payment_method: "cod",
    shipping_note: null,
    service_type: "bespoke",
    items: [
      {
        garment_id: "g-1",
        garment_name: "Áo dài lụa",
        image_url: null,
        transaction_type: "buy",
        quantity: 1,
        unit_price: 2000000,
        total_price: 2000000,
      },
    ],
    delivery_info: {
      recipient_name: "Nguyễn Thị Linh",
      phone: "0901234567",
      address: "123 Nguyễn Huệ, Quận 1",
    },
    timeline: [],
    tailor_info: null,
    alteration: makeAlteration(),
    ...overrides,
  };
}

function makeOwnerOrder(overrides: Partial<OrderResponse> = {}): OrderResponse {
  return {
    id: "order-1",
    status: "completed",
    payment_status: "paid",
    subtotal_amount: 2000000,
    discount_amount: 0,
    total_amount: 2000000,
    applied_voucher_ids: [],
    payment_method: "cod",
    customer_name: "Nguyễn Văn A",
    customer_phone: "0901234567",
    shipping_address: null,
    items: [],
    created_at: "2026-05-01T10:00:00Z",
    service_type: "bespoke",
    alteration_requested_at: "2026-06-10T09:00:00Z",
    ...overrides,
  };
}

function makeDrawerDetail(order: OrderResponse): OrderDetailResponse {
  return { order, transactions: [] };
}

const makeTask = (overrides: Partial<OwnerTaskItem> = {}): OwnerTaskItem => ({
  id: "task-001",
  tenant_id: "tenant-001",
  order_id: "order-001",
  order_item_id: null,
  assigned_to: "tailor-001",
  assigned_by: "owner-001",
  garment_name: "Áo dài lụa",
  customer_name: "Nguyễn Thị Lan",
  assignee_name: "Thợ may A",
  status: "in_progress",
  task_type: "production",
  production_step: "cutting",
  deadline: null,
  notes: null,
  piece_rate: null,
  design_id: null,
  completed_at: null,
  is_overdue: false,
  days_until_deadline: null,
  version: 1,
  accepted_at: null,
  started_at: null,
  submitted_at: null,
  hold_reason: null,
  on_hold_at: null,
  resumed_at: null,
  assignment_deadline_at: null,
  expected_finish_at: null,
  is_rework: false,
  rework_count: 0,
  qc_issues: null,
  rejection_reason: null,
  rejection_category: null,
  reassignment_reason: null,
  priority: "normal",
  created_at: "2026-06-01T08:00:00.000Z",
  updated_at: "2026-06-01T08:00:00.000Z",
  ...overrides,
});

// ── Customer window states + form (AC5) ──────────────────────────────────────

describe("OrderDetailModal — alteration warranty states (AC5)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows the remaining-window strip and the request button when available", () => {
    render(
      <OrderDetailModal order={makeCustomerOrder()} isOpen={true} onClose={jest.fn()} />
    );
    expect(screen.getByTestId("alteration-window-strip")).toHaveTextContent(
      "Còn 12 ngày để yêu cầu chỉnh sửa miễn phí"
    );
    expect(screen.getByTestId("alteration-request-btn")).toHaveTextContent(
      "Yêu cầu chỉnh sửa"
    );
  });

  it("shows the contact CTA only (no request button) when expired", () => {
    render(
      <OrderDetailModal
        order={makeCustomerOrder({
          alteration: makeAlteration({ state: "expired", remaining_days: 0 }),
        })}
        isOpen={true}
        onClose={jest.fn()}
      />
    );
    const cta = screen.getByTestId("alteration-contact-cta");
    expect(cta).toHaveTextContent("Liên hệ tiệm");
    expect(cta).toHaveAttribute("href", "/contact");
    expect(screen.getByTestId("alteration-expired")).toHaveTextContent("30 ngày");
    expect(screen.queryByTestId("alteration-request-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("alteration-window-strip")).not.toBeInTheDocument();
  });

  it("shows the pending strip when a request is awaiting confirmation", () => {
    render(
      <OrderDetailModal
        order={makeCustomerOrder({
          alteration: makeAlteration({
            state: "pending",
            requested_at: "2026-06-10T09:00:00Z",
          }),
        })}
        isOpen={true}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByTestId("alteration-pending-strip")).toHaveTextContent(
      "Đã gửi yêu cầu — chờ tiệm xác nhận"
    );
    expect(screen.queryByTestId("alteration-request-btn")).not.toBeInTheDocument();
  });

  it("shows the customer's own description in the pending strip when the server returns it", () => {
    render(
      <OrderDetailModal
        order={makeCustomerOrder({
          alteration: makeAlteration({
            state: "pending",
            requested_at: "2026-06-10T09:00:00Z",
            request_note: "Phần eo hơi rộng, xin chỉnh lại",
          }),
        })}
        isOpen={true}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByTestId("alteration-pending-note")).toHaveTextContent(
      "Bạn đã mô tả: Phần eo hơi rộng, xin chỉnh lại"
    );
  });

  it("shows the in-progress strip while the shop is altering", () => {
    render(
      <OrderDetailModal
        order={makeCustomerOrder({
          alteration: makeAlteration({ state: "in_alteration" }),
        })}
        isOpen={true}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByTestId("alteration-in-progress-strip")).toBeInTheDocument();
  });

  it("renders no section when the server sends no alteration info (non-bespoke / pre-handover)", () => {
    render(
      <OrderDetailModal
        order={makeCustomerOrder({ alteration: null })}
        isOpen={true}
        onClose={jest.fn()}
      />
    );
    expect(screen.queryByTestId("alteration-section")).not.toBeInTheDocument();
  });

  it("validates min 10 chars before calling the server action", async () => {
    render(
      <OrderDetailModal order={makeCustomerOrder()} isOpen={true} onClose={jest.fn()} />
    );
    fireEvent.click(screen.getByTestId("alteration-request-btn"));
    fireEvent.change(screen.getByTestId("alteration-desc-input"), {
      target: { value: "ngắn quá" },
    });
    fireEvent.click(screen.getByTestId("alteration-submit-btn"));

    expect(await screen.findByTestId("alteration-error")).toHaveTextContent(
      "Vui lòng mô tả chỗ chưa vừa (ít nhất 10 ký tự)"
    );
    expect(mockRequestAlteration).not.toHaveBeenCalled();
  });

  it("submits a valid description and flips to the pending state", async () => {
    mockRequestAlteration.mockResolvedValue({
      success: true,
      data: { order_id: "order-1", alteration_requested_at: "2026-06-11T08:00:00Z" },
    });
    render(
      <OrderDetailModal order={makeCustomerOrder()} isOpen={true} onClose={jest.fn()} />
    );
    fireEvent.click(screen.getByTestId("alteration-request-btn"));
    fireEvent.change(screen.getByTestId("alteration-desc-input"), {
      target: { value: "Phần eo hơi rộng, xin chỉnh lại giúp em" },
    });
    fireEvent.click(screen.getByTestId("alteration-submit-btn"));

    await waitFor(() => {
      expect(mockRequestAlteration).toHaveBeenCalledWith(
        "order-1",
        "Phần eo hơi rộng, xin chỉnh lại giúp em"
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId("alteration-pending-strip")).toHaveTextContent(
        "Đã gửi yêu cầu — chờ tiệm xác nhận"
      );
    });
    expect(screen.queryByTestId("alteration-form")).not.toBeInTheDocument();
  });

  it("surfaces the server's Vietnamese error verbatim on failure", async () => {
    mockRequestAlteration.mockResolvedValue({
      success: false,
      error: "Đã quá thời hạn chỉnh sửa miễn phí (30 ngày). Vui lòng liên hệ tiệm.",
    });
    render(
      <OrderDetailModal order={makeCustomerOrder()} isOpen={true} onClose={jest.fn()} />
    );
    fireEvent.click(screen.getByTestId("alteration-request-btn"));
    fireEvent.change(screen.getByTestId("alteration-desc-input"), {
      target: { value: "Phần eo hơi rộng, xin chỉnh lại" },
    });
    fireEvent.click(screen.getByTestId("alteration-submit-btn"));

    expect(await screen.findByTestId("alteration-error")).toHaveTextContent(
      "Đã quá thời hạn chỉnh sửa miễn phí (30 ngày). Vui lòng liên hệ tiệm."
    );
    expect(screen.queryByTestId("alteration-pending-strip")).not.toBeInTheDocument();
  });
});

// ── Owner approve panel (AC6) ────────────────────────────────────────────────

describe("OrderDetailDrawer — alteration approve panel (AC6)", () => {
  const tailorStaff = [
    { id: "tailor-1", name: "Thợ A" },
    { id: "tailor-2", name: "Thợ B" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the panel when the order has a pending alteration request", () => {
    render(
      <OrderDetailDrawer
        detail={makeDrawerDetail(makeOwnerOrder())}
        isLoading={false}
        onClose={jest.fn()}
        tailorStaff={tailorStaff}
      />
    );
    expect(screen.getByTestId("alteration-approve-panel")).toHaveTextContent(
      "Khách yêu cầu chỉnh sửa sau giao"
    );
    expect(screen.getByTestId("alteration-approve-btn")).toBeInTheDocument();
  });

  it("does not render the panel without a pending request", () => {
    render(
      <OrderDetailDrawer
        detail={makeDrawerDetail(makeOwnerOrder({ alteration_requested_at: null }))}
        isLoading={false}
        onClose={jest.fn()}
        tailorStaff={tailorStaff}
      />
    );
    expect(screen.queryByTestId("alteration-approve-panel")).not.toBeInTheDocument();
  });

  it("approves with the selected tailor and refreshes", async () => {
    mockApproveAlteration.mockResolvedValue({
      success: true,
      data: { id: "task-9", task_type: "alteration", status: "assigned" },
    });
    const onRefresh = jest.fn();
    render(
      <OrderDetailDrawer
        detail={makeDrawerDetail(makeOwnerOrder())}
        isLoading={false}
        onClose={jest.fn()}
        onRefresh={onRefresh}
        tailorStaff={tailorStaff}
      />
    );

    fireEvent.change(screen.getByTestId("alteration-tailor-select"), {
      target: { value: "tailor-2" },
    });
    fireEvent.click(screen.getByTestId("alteration-approve-btn"));

    await waitFor(() => {
      expect(mockApproveAlteration).toHaveBeenCalledWith("order-1", {
        tailor_id: "tailor-2",
      });
    });
    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it("approves without a tailor (task stays unassigned server-side)", async () => {
    mockApproveAlteration.mockResolvedValue({
      success: true,
      data: { id: "task-9", task_type: "alteration", status: "unassigned" },
    });
    const onRefresh = jest.fn();
    render(
      <OrderDetailDrawer
        detail={makeDrawerDetail(makeOwnerOrder())}
        isLoading={false}
        onClose={jest.fn()}
        onRefresh={onRefresh}
        tailorStaff={tailorStaff}
      />
    );
    fireEvent.click(screen.getByTestId("alteration-approve-btn"));

    await waitFor(() => {
      expect(mockApproveAlteration).toHaveBeenCalledWith("order-1", {});
    });
    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it("shows the error and does not refresh on failure", async () => {
    mockApproveAlteration.mockResolvedValue({
      success: false,
      error: "Đơn hàng không có yêu cầu chỉnh sửa đang chờ xử lý",
    });
    const onRefresh = jest.fn();
    render(
      <OrderDetailDrawer
        detail={makeDrawerDetail(makeOwnerOrder())}
        isLoading={false}
        onClose={jest.fn()}
        onRefresh={onRefresh}
        tailorStaff={tailorStaff}
      />
    );
    fireEvent.click(screen.getByTestId("alteration-approve-btn"));

    expect(await screen.findByTestId("alteration-approve-error")).toHaveTextContent(
      "Đơn hàng không có yêu cầu chỉnh sửa đang chờ xử lý"
    );
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("surfaces the backend's 409 copy AND refreshes on conflict", async () => {
    mockApproveAlteration.mockResolvedValue({
      success: false,
      conflict: true,
      error: "Đơn hàng đã có công việc chỉnh sửa đang thực hiện",
    });
    const onRefresh = jest.fn();
    render(
      <OrderDetailDrawer
        detail={makeDrawerDetail(makeOwnerOrder())}
        isLoading={false}
        onClose={jest.fn()}
        onRefresh={onRefresh}
        tailorStaff={tailorStaff}
      />
    );
    fireEvent.click(screen.getByTestId("alteration-approve-btn"));

    expect(await screen.findByTestId("alteration-approve-error")).toHaveTextContent(
      "Đơn hàng đã có công việc chỉnh sửa đang thực hiện"
    );
    expect(onRefresh).toHaveBeenCalled();
  });

  it("displays the customer's persisted description in the panel", () => {
    render(
      <OrderDetailDrawer
        detail={makeDrawerDetail(
          makeOwnerOrder({ alteration_request_note: "Phần eo hơi rộng, xin chỉnh lại" })
        )}
        isLoading={false}
        onClose={jest.fn()}
        tailorStaff={tailorStaff}
      />
    );
    expect(screen.getByTestId("alteration-request-note")).toHaveTextContent(
      "Phần eo hơi rộng, xin chỉnh lại"
    );
  });

  it("resets the approve-panel fields when another order is shown", () => {
    const { rerender } = render(
      <OrderDetailDrawer
        detail={makeDrawerDetail(makeOwnerOrder({ id: "order-A" }))}
        isLoading={false}
        onClose={jest.fn()}
        tailorStaff={tailorStaff}
      />
    );
    fireEvent.change(screen.getByTestId("alteration-tailor-select"), {
      target: { value: "tailor-2" },
    });
    fireEvent.change(screen.getByTestId("alteration-deadline-input"), {
      target: { value: "2026-06-20" },
    });
    expect(screen.getByTestId("alteration-tailor-select")).toHaveValue("tailor-2");
    expect(screen.getByTestId("alteration-deadline-input")).toHaveValue("2026-06-20");

    rerender(
      <OrderDetailDrawer
        detail={makeDrawerDetail(makeOwnerOrder({ id: "order-B" }))}
        isLoading={false}
        onClose={jest.fn()}
        tailorStaff={tailorStaff}
      />
    );
    expect(screen.getByTestId("alteration-tailor-select")).toHaveValue("");
    expect(screen.getByTestId("alteration-deadline-input")).toHaveValue("");
  });
});

// ── Task table badge (AC6) ───────────────────────────────────────────────────

describe("ProductionTaskTable — 'Sửa đồ' task_type badge (AC6)", () => {
  const noop = jest.fn();

  it("shows the amber badge for alteration tasks", () => {
    render(
      <ProductionTaskTable
        tasks={[makeTask({ task_type: "alteration" })]}
        sortBy="deadline"
        sortOrder="asc"
        onSort={noop}
        onTaskClick={noop}
      />
    );
    expect(screen.getByTestId("task-type-alteration-badge")).toHaveTextContent("Sửa đồ");
  });

  it("shows no badge for production tasks", () => {
    render(
      <ProductionTaskTable
        tasks={[makeTask()]}
        sortBy="deadline"
        sortOrder="asc"
        onSort={noop}
        onTaskClick={noop}
      />
    );
    expect(screen.queryByTestId("task-type-alteration-badge")).not.toBeInTheDocument();
  });
});
