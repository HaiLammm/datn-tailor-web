/**
 * Profile Orders Page — Story 4.4c: Lịch sử mua hàng & Trạng thái đơn
 * Server Component: fetches order list at render time.
 * Client-side pagination, filtering, and detail modal handled by OrdersClient.
 */

import { getCustomerOrders } from "@/app/actions/order-actions";
import OrdersClient from "./OrdersClient";

export const metadata = {
  title: "Lịch sử mua hàng | Hồ sơ",
};

export default async function ProfileOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string>>;
}) {
  const params = await (searchParams ?? Promise.resolve({}));
  const page = parseInt(params.page ?? "1", 10);
  const status = params.status ?? undefined;
  const orderType = (params.order_type as "buy" | "rental") ?? undefined;

  const result = await getCustomerOrders(
    { status, order_type: orderType },
    { page, limit: 10 }
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-6 py-5 border-b border-gray-200">
        <h2 className="text-xl font-serif font-bold text-gray-900">
          Lịch sử mua hàng
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Theo dõi các đơn hàng và tải hoá đơn của bạn
        </p>
      </div>

      <OrdersClient
        initialData={result.success ? result.data ?? null : null}
        initialPage={page}
        initialStatus={status}
        initialOrderType={orderType}
        error={result.success ? undefined : result.error}
      />
    </div>
  );
}
