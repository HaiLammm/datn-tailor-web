"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchOrderDetail,
  fetchOrders,
  updateOrderStatus,
} from "@/app/actions/order-actions";
import type { OrderListItem, OrderListParams, OrderStatus } from "@/types/order";
import OrderFilters from "./OrderFilters";
import OrderTable from "./OrderTable";
import Pagination from "./Pagination";
import OrderDetailDrawer from "./OrderDetailDrawer";

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
  return {
    status: statusRaw.length ? statusRaw : undefined,
    payment_status: paymentRaw.length ? paymentRaw : undefined,
    transaction_type:
      (search.get("transaction_type") as "buy" | "rent" | null) ?? undefined,
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

  // ---- render ----
  const orders = data?.data ?? [];
  const pagination = data?.meta.pagination;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <OrderFilters params={params} onChange={handleParamsChange} />

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
    </div>
  );
}
