"use client";

import { useCallback, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveOrder,
  fetchOrderDetail,
  fetchOrders,
  updateOrderStatus,
  updatePreparationStep,
} from "@/app/actions/order-actions";
import { fetchStaffData } from "@/app/actions/owner-task-actions";
import type { ApproveOrderRequest, OrderListItem, OrderListParams, OrderStatus, UpdatePreparationStepRequest } from "@/types/order";
import { RENT_PREP_STEPS, BUY_PREP_STEPS } from "@/types/order";
import OrderFilters from "./OrderFilters";
import OrderTable from "./OrderTable";
import Pagination from "./Pagination";
import OrderDetailDrawer from "./OrderDetailDrawer";
import InternalOrderDialog from "./InternalOrderDialog";

// ---------------------------------------------------------------------------
// Skeleton loading state
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-12 bg-gray-100 rounded-md" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Parse URL search params → OrderListParams
// ---------------------------------------------------------------------------

function paramsFromSearch(search: URLSearchParams): OrderListParams {
  const statusRaw = search.getAll("status") as OrderStatus[];
  const paymentRaw = search.getAll("payment_status") as import("@/types/order").PaymentStatus[];
  const isInternalRaw = search.get("is_internal");
  return {
    status: statusRaw.length ? statusRaw : undefined,
    payment_status: paymentRaw.length ? paymentRaw : undefined,
    transaction_type:
      (search.get("transaction_type") as "buy" | "rent" | null) ?? undefined,
    is_internal: isInternalRaw === null ? undefined : isInternalRaw === "true",
    search: search.get("search") ?? undefined,
    page: Number(search.get("page") ?? "1"),
    page_size: Number(search.get("page_size") ?? "20"),
    sort_by:
      (search.get("sort_by") as OrderListParams["sort_by"]) ?? "created_at",
    sort_order: (search.get("sort_order") as "asc" | "desc") ?? "desc",
  };
}

// ---------------------------------------------------------------------------
// Sync params → URL
// ---------------------------------------------------------------------------

function buildURL(pathname: string, params: OrderListParams): string {
  const sp = new URLSearchParams();
  params.status?.forEach((s) => sp.append("status", s));
  params.payment_status?.forEach((p) => sp.append("payment_status", p));
  if (params.transaction_type) sp.set("transaction_type", params.transaction_type);
  if (params.is_internal !== undefined) sp.set("is_internal", String(params.is_internal));
  if (params.search) sp.set("search", params.search);
  if (params.page && params.page !== 1) sp.set("page", String(params.page));
  if (params.page_size && params.page_size !== 20)
    sp.set("page_size", String(params.page_size));
  if (params.sort_by && params.sort_by !== "created_at")
    sp.set("sort_by", params.sort_by);
  if (params.sort_order && params.sort_order !== "desc")
    sp.set("sort_order", params.sort_order);
  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

// ---------------------------------------------------------------------------
// Bespoke tailor selection dialog (Story 10.4)
// ---------------------------------------------------------------------------

interface BespokeTailorDialogProps {
  order: OrderListItem;
  tailors: { id: string; full_name: string | null }[];
  tailorId: string;
  onTailorChange: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

function BespokeTailorDialog({
  order,
  tailors,
  tailorId,
  onTailorChange,
  onConfirm,
  onCancel,
  isLoading,
}: BespokeTailorDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Phê duyệt đơn đặt may</h3>
        <p className="text-xs text-gray-500 font-mono mb-4">
          #{order.id.slice(0, 8).toUpperCase()} — {order.customer_name}
        </p>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Chỉ định thợ may <span className="text-red-500">*</span>
        </label>
        <select
          value={tailorId}
          onChange={(e) => onTailorChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">-- Chọn thợ may --</option>
          {tailors.map((t) => (
            <option key={t.id} value={t.id}>
              {t.full_name ?? t.id.slice(0, 8)}
            </option>
          ))}
        </select>
        <div className="flex gap-3 justify-end mt-5">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={!tailorId || isLoading}
            className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Đang xử lý..." : "Phê duyệt"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Decision 3A: Confirmation dialog for intermediate step advance
// ---------------------------------------------------------------------------

interface ConfirmStepDialogProps {
  order: OrderListItem;
  nextStepLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

function ConfirmStepDialog({ order, nextStepLabel, onConfirm, onCancel, isLoading }: ConfirmStepDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Xác nhận chuyển bước</h3>
        <p className="text-xs text-gray-500 font-mono mb-4">
          #{order.id.slice(0, 8).toUpperCase()} — {order.customer_name}
        </p>
        <p className="text-sm text-gray-700 mb-4">
          Chuyển sang bước <strong>{nextStepLabel}</strong>? Thao tác này không thể hoàn tác.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Đang xử lý..." : "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Story 10.5: Delivery mode selection dialog (ship/pickup)
// ---------------------------------------------------------------------------

interface DeliveryModeDialogProps {
  order: OrderListItem;
  onConfirm: (mode: "ship" | "pickup") => void;
  onCancel: () => void;
  isLoading: boolean;
}

function DeliveryModeDialog({ order, onConfirm, onCancel, isLoading }: DeliveryModeDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Đơn hàng sẵn sàng</h3>
        <p className="text-xs text-gray-500 font-mono mb-4">
          #{order.id.slice(0, 8).toUpperCase()} — {order.customer_name}
        </p>
        <p className="text-sm text-gray-700 mb-4">Chọn hình thức giao hàng:</p>
        <div className="flex gap-3">
          <button
            onClick={() => onConfirm("ship")}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "..." : "Giao hàng"}
          </button>
          <button
            onClick={() => onConfirm("pickup")}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "..." : "Nhận tại tiệm"}
          </button>
        </div>
        <button
          onClick={onCancel}
          className="w-full mt-3 px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Hủy
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function OrderBoardClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const params = paramsFromSearch(searchParams);

  // Selected order for drawer
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showInternalDialog, setShowInternalDialog] = useState(false);

  // Story 10.4: approve dialog state (bespoke orders)
  const [approveDialog, setApproveDialog] = useState<{
    open: boolean;
    order: OrderListItem | null;
    tailorId: string;
    tailorName: string;
  }>({ open: false, order: null, tailorId: "", tailorName: "" });

  // Story 10.5: delivery mode dialog state
  const [deliveryDialog, setDeliveryDialog] = useState<{
    open: boolean;
    order: OrderListItem | null;
    nextStep: string;
  }>({ open: false, order: null, nextStep: "" });

  // Decision 3A: confirmation dialog for intermediate step advance
  const [confirmStepDialog, setConfirmStepDialog] = useState<{
    open: boolean;
    order: OrderListItem | null;
    nextStep: string;
    nextStepLabel: string;
  }>({ open: false, order: null, nextStep: "", nextStepLabel: "" });

  // Story 10.4: toast state
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: "",
    visible: false,
  });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, visible: true });
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  }

  // ---- staff query (lazy — only when bespoke approve dialog is open) ----
  const { data: staffData } = useQuery({
    queryKey: ["staff"],
    queryFn: fetchStaffData,
    staleTime: 5 * 60_000,
    enabled: approveDialog.open,
  });
  const activeTailors = staffData?.active_staff.filter((s) => s.role === "Tailor") ?? [];

  // ---- orders query ----
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["owner-orders", params],
    queryFn: () => fetchOrders(params),
    staleTime: 60_000,
  });

  // ---- order detail query (lazy, driven by selectedOrderId) ----
  const {
    data: detailData,
    isLoading: isDetailLoading,
  } = useQuery({
    queryKey: ["owner-order-detail", selectedOrderId],
    queryFn: () => fetchOrderDetail(selectedOrderId!),
    enabled: !!selectedOrderId,
    staleTime: 30_000,
  });

  // ---- status update mutation with optimistic update ----
  const mutation = useMutation({
    mutationFn: ({
      orderId,
      newStatus,
    }: {
      orderId: string;
      newStatus: OrderStatus;
    }) => updateOrderStatus(orderId, newStatus),

    onMutate: async ({ orderId, newStatus }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["owner-orders"] });

      // Snapshot previous data
      const previousData = queryClient.getQueriesData({ queryKey: ["owner-orders"] });

      // Optimistically update the list
      queryClient.setQueriesData(
        { queryKey: ["owner-orders"] },
        (old: import("@/types/order").OrderListResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((order: OrderListItem) =>
              order.id === orderId ? { ...order, status: newStatus } : order
            ),
          };
        }
      );

      return { previousData };
    },

    onError: (_err, _vars, context) => {
      // Rollback on failure
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, queryData]) => {
          queryClient.setQueryData(queryKey, queryData);
        });
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-orders"] });
      if (selectedOrderId) {
        queryClient.invalidateQueries({
          queryKey: ["owner-order-detail", selectedOrderId],
        });
      }
    },
  });

  // ---- Story 10.4: approve mutation ----
  const approveMutation = useMutation({
    mutationFn: ({
      orderId,
      request,
    }: {
      orderId: string;
      request: ApproveOrderRequest;
      tailorName?: string;
    }) => approveOrder(orderId, request),

    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["owner-orders"] });
      if (selectedOrderId) {
        queryClient.invalidateQueries({
          queryKey: ["owner-order-detail", selectedOrderId],
        });
      }
      // Close dialog on success (P-5: avoid double-submit)
      setApproveDialog({ open: false, order: null, tailorId: "", tailorName: "" });
      const code = variables.orderId.slice(0, 8).toUpperCase();
      const message =
        result.routing_destination === "tailor"
          ? `Đơn hàng #${code} đã giao cho ${variables.tailorName || "thợ may"}`
          : `Đơn hàng #${code} đã chuyển xuống kho chuẩn bị`;
      showToast(message);
    },

    onError: (err) => {
      setApproveDialog({ open: false, order: null, tailorId: "", tailorName: "" });
      showToast(err instanceof Error ? err.message : "Phê duyệt đơn hàng thất bại");
    },
  });

  // ---- Story 10.5: preparation step mutation ----
  const prepMutation = useMutation({
    mutationFn: ({
      orderId,
      request,
    }: {
      orderId: string;
      request: UpdatePreparationStepRequest;
    }) => updatePreparationStep(orderId, request),

    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["owner-orders"] });
      if (selectedOrderId) {
        queryClient.invalidateQueries({ queryKey: ["owner-order-detail", selectedOrderId] });
      }
      setDeliveryDialog({ open: false, order: null, nextStep: "" });
      setConfirmStepDialog({ open: false, order: null, nextStep: "", nextStepLabel: "" });
      if (result.is_completed) {
        const mode = result.status === "ready_to_ship" ? "giao hàng" : "nhận tại tiệm";
        showToast(`Đơn hàng sẵn sàng ${mode}`);
      } else {
        const steps = result.service_type === "rent" ? RENT_PREP_STEPS : BUY_PREP_STEPS;
        const stepLabel = steps.find((s) => s.key === result.preparation_step)?.label ?? result.preparation_step;
        showToast(`Đã chuyển bước: ${stepLabel}`);
      }
    },

    onError: (err) => {
      setDeliveryDialog({ open: false, order: null, nextStep: "" });
      setConfirmStepDialog({ open: false, order: null, nextStep: "", nextStepLabel: "" });
      showToast(err instanceof Error ? err.message : "Cập nhật bước chuẩn bị thất bại");
    },
  });

  // ---- handlers ----
  const handleParamsChange = useCallback(
    (updated: Partial<OrderListParams>) => {
      const next = { ...params, ...updated };
      router.push(buildURL(pathname, next));
    },
    [params, pathname, router]
  );

  const handleSortChange = useCallback(
    (col: string) => {
      if (params.sort_by === col) {
        handleParamsChange({
          sort_order: params.sort_order === "desc" ? "asc" : "desc",
        });
      } else {
        handleParamsChange({ sort_by: col as OrderListParams["sort_by"], sort_order: "desc" });
      }
    },
    [params.sort_by, params.sort_order, handleParamsChange]
  );

  const handleStatusUpdate = useCallback(
    async (orderId: string, newStatus: OrderStatus) => {
      await mutation.mutateAsync({ orderId, newStatus });
    },
    [mutation]
  );

  // Story 10.4: approve handlers
  const handleApprove = useCallback(
    (order: OrderListItem) => {
      if (order.service_type === "bespoke") {
        setApproveDialog({ open: true, order, tailorId: "", tailorName: "" });
      } else {
        // Rent / Buy: direct approve without tailor assignment
        approveMutation.mutate({ orderId: order.id, request: {} });
      }
    },
    [approveMutation]
  );

  // Story 10.5: advance preparation step handler (Decision 3A: always confirm)
  const handleAdvancePrep = useCallback(
    (order: OrderListItem) => {
      if (!order.preparation_step) return;
      const steps = order.service_type === "rent" ? RENT_PREP_STEPS : BUY_PREP_STEPS;
      const currentIndex = steps.findIndex((s) => s.key === order.preparation_step);
      if (currentIndex < 0 || currentIndex >= steps.length - 1) return;

      const nextStep = steps[currentIndex + 1].key;
      const nextStepLabel = steps[currentIndex + 1].label;
      const isLastStep = currentIndex + 1 === steps.length - 1;

      if (isLastStep) {
        // Show delivery mode dialog for last step
        setDeliveryDialog({ open: true, order, nextStep });
      } else {
        // Show confirmation dialog for intermediate steps
        setConfirmStepDialog({ open: true, order, nextStep, nextStepLabel });
      }
    },
    []
  );

  const handleDeliveryConfirm = useCallback(
    (mode: "ship" | "pickup") => {
      if (!deliveryDialog.order) return;
      prepMutation.mutate({
        orderId: deliveryDialog.order.id,
        request: { preparation_step: deliveryDialog.nextStep, delivery_mode: mode },
      });
    },
    [deliveryDialog, prepMutation]
  );

  // Decision 3A: confirm intermediate step advance
  const handleConfirmStep = useCallback(() => {
    if (!confirmStepDialog.order) return;
    prepMutation.mutate({
      orderId: confirmStepDialog.order.id,
      request: { preparation_step: confirmStepDialog.nextStep },
    });
  }, [confirmStepDialog, prepMutation]);

  const handleApproveConfirm = useCallback(() => {
    if (!approveDialog.order || !approveDialog.tailorId) return;
    const { order, tailorId, tailorName } = approveDialog;
    // Dialog closes in onSuccess/onError — not here (P-5: prevent double-submit)
    approveMutation.mutate({
      orderId: order.id,
      request: { assigned_to: tailorId },
      tailorName,
    });
  }, [approveDialog, approveMutation]);

  // ---- render ----
  const orders = data?.data ?? [];
  const pagination = data?.meta.pagination;

  return (
    <div className="space-y-4">
      {/* Header with filters and internal order button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <OrderFilters params={params} onChange={handleParamsChange} />
        </div>
        <button
          onClick={() => setShowInternalDialog(true)}
          className="flex-shrink-0 px-4 py-2 text-sm font-medium text-white bg-[#D4AF37] rounded-lg hover:bg-[#C4A030] transition-colors whitespace-nowrap"
        >
          Tạo đơn nội bộ
        </button>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600 text-sm">
              {error instanceof Error
                ? error.message
                : "Không thể tải danh sách đơn hàng."}
            </p>
            <button
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["owner-orders"] })
              }
              className="mt-3 text-sm text-indigo-600 hover:underline"
            >
              Thử lại
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500 text-sm">
              Không tìm thấy đơn hàng nào phù hợp với bộ lọc.
            </p>
          </div>
        ) : (
          <>
            <OrderTable
              orders={orders}
              sortBy={params.sort_by ?? "created_at"}
              sortOrder={params.sort_order ?? "desc"}
              onSortChange={handleSortChange}
              onStatusUpdate={handleStatusUpdate}
              onRowClick={(order) => setSelectedOrderId(order.id)}
              onApprove={handleApprove}
              onAdvancePrep={handleAdvancePrep}
            />
            {pagination && (
              <Pagination
                meta={pagination}
                onPageChange={(page) => handleParamsChange({ page })}
              />
            )}
          </>
        )}
      </div>

      {/* Detail drawer */}
      {selectedOrderId && (
        <OrderDetailDrawer
          detail={detailData ?? null}
          isLoading={isDetailLoading}
          onClose={() => setSelectedOrderId(null)}
        />
      )}

      {/* Internal order dialog */}
      <InternalOrderDialog
        open={showInternalDialog}
        onClose={() => setShowInternalDialog(false)}
      />

      {/* Story 10.4: Bespoke tailor selection dialog */}
      {approveDialog.open && approveDialog.order && (
        <BespokeTailorDialog
          order={approveDialog.order}
          tailors={activeTailors}
          tailorId={approveDialog.tailorId}
          onTailorChange={(id) => {
            const name = activeTailors.find((t) => t.id === id)?.full_name ?? "";
            setApproveDialog((d) => ({ ...d, tailorId: id, tailorName: name }));
          }}
          onConfirm={handleApproveConfirm}
          onCancel={() => setApproveDialog({ open: false, order: null, tailorId: "", tailorName: "" })}
          isLoading={approveMutation.isPending}
        />
      )}

      {/* Decision 3A: Confirmation dialog for intermediate step advance */}
      {confirmStepDialog.open && confirmStepDialog.order && (
        <ConfirmStepDialog
          order={confirmStepDialog.order}
          nextStepLabel={confirmStepDialog.nextStepLabel}
          onConfirm={handleConfirmStep}
          onCancel={() => setConfirmStepDialog({ open: false, order: null, nextStep: "", nextStepLabel: "" })}
          isLoading={prepMutation.isPending}
        />
      )}

      {/* Story 10.5: Delivery mode dialog */}
      {deliveryDialog.open && deliveryDialog.order && (
        <DeliveryModeDialog
          order={deliveryDialog.order}
          onConfirm={handleDeliveryConfirm}
          onCancel={() => setDeliveryDialog({ open: false, order: null, nextStep: "" })}
          isLoading={prepMutation.isPending}
        />
      )}

      {/* Story 10.4: Toast notification */}
      {toast.visible && (
        <div className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg max-w-sm animate-in fade-in slide-in-from-bottom-2">
          {toast.message}
        </div>
      )}
    </div>
  );
}
