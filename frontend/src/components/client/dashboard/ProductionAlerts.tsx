"use client";

import type { ProductionAlert } from "@/types/kpi";

interface ProductionAlertsProps {
  alerts: ProductionAlert[];
}

export default function ProductionAlerts({ alerts }: ProductionAlertsProps) {
  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Cảnh báo sản xuất</h3>
        <p className="text-xs text-gray-400">Không có đơn nào cần chú ý</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-red-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <h3 className="text-sm font-medium text-red-700">
          Cảnh báo sản xuất ({alerts.length})
        </h3>
      </div>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.order_id}
            className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
          >
            <div>
              <p className="text-sm text-gray-800 font-medium">{alert.customer_name}</p>
              <p className="text-xs text-gray-500">{alert.garment_name}</p>
            </div>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
              {alert.days_since_order} ngày
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
