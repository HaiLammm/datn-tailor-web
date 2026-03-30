"""Invoice generation service (Story 4.4c).

Generates a printable HTML invoice without external PDF libraries.
The HTML is styled for printing and can be converted to PDF via browser print.

Note: A future upgrade can replace this with weasyprint or reportlab
for server-side PDF generation (requires adding those to requirements.txt).
"""

import html
from datetime import datetime, timezone

from src.models.order_customer import CustomerOrderDetail

_STATUS_LABELS: dict[str, str] = {
    "pending": "Chờ xác nhận",
    "confirmed": "Đã xác nhận",
    "in_progress": "Đang may",
    "checked": "Đã kiểm tra",
    "shipped": "Đã gửi",
    "delivered": "Đã giao",
    "cancelled": "Đã hủy",
    "returned": "Đã trả",
    "pending_measurement": "Chờ số đo",
    "preparing": "Đang chuẩn bị",
    "ready_to_ship": "Sẵn sàng giao",
    "ready_for_pickup": "Chờ nhận tại tiệm",
    "in_production": "Đang sản xuất",
    "renting": "Đang thuê",
    "completed": "Hoàn tất",
}

_PAYMENT_METHOD_LABELS: dict[str, str] = {
    "cod": "Thanh toán khi nhận hàng (COD)",
    "vnpay": "VNPay",
    "momo": "MoMo",
}

_PAYMENT_STATUS_LABELS: dict[str, str] = {
    "pending": "Chờ thanh toán",
    "paid": "Đã thanh toán",
    "failed": "Thanh toán thất bại",
    "refunded": "Đã hoàn tiền",
}


def _format_currency(amount) -> str:
    """Format decimal amount as Vietnamese currency string."""
    try:
        val = int(amount)
        return f"{val:,}₫".replace(",", ".")
    except (ValueError, TypeError):
        return str(amount)


def generate_invoice_html(order: CustomerOrderDetail) -> str:
    """Generate a printable HTML invoice for the given order.

    Returns an HTML string suitable for browser printing or PDF conversion.
    """
    generated_at = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M")
    order_date = order.created_at.strftime("%d/%m/%Y")
    status_label = _STATUS_LABELS.get(order.status, order.status)
    payment_method_label = _PAYMENT_METHOD_LABELS.get(order.payment_method, order.payment_method)
    payment_status_label = _PAYMENT_STATUS_LABELS.get(order.payment_status, order.payment_status)

    # Build items rows HTML
    items_rows = ""
    subtotal = sum(item.total_price for item in order.items)
    for idx, item in enumerate(order.items, 1):
        tx_label = "Thuê" if item.transaction_type == "rent" else "Mua"
        rental_info = ""
        if item.transaction_type == "rent" and item.start_date:
            rental_info = f"<br><small style='color:#6b7280'>Thuê: {html.escape(str(item.start_date))} → {html.escape(str(item.end_date or '?'))}</small>"

        items_rows += f"""
        <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 8px; font-size: 13px;">{idx}</td>
            <td style="padding: 10px 8px; font-size: 13px;">
                {html.escape(item.garment_name or '')}
                {f'<br><small style="color:#6b7280">Size: {html.escape(item.size or "")}</small>' if item.size else ''}
                {rental_info}
            </td>
            <td style="padding: 10px 8px; font-size: 13px; text-align:center;">{tx_label}</td>
            <td style="padding: 10px 8px; font-size: 13px; text-align:center;">{item.quantity}</td>
            <td style="padding: 10px 8px; font-size: 13px; text-align:right;">{_format_currency(item.unit_price)}</td>
            <td style="padding: 10px 8px; font-size: 13px; text-align:right; font-weight:600;">{_format_currency(item.total_price)}</td>
        </tr>
        """

    # Build timeline HTML
    timeline_html = ""
    if order.timeline:
        timeline_rows = ""
        for entry in order.timeline:
            ts = entry.timestamp.strftime("%d/%m/%Y %H:%M")
            label = _STATUS_LABELS.get(entry.status, entry.description)
            timeline_rows += f"""
            <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 8px; font-size: 13px; color: #6b7280; white-space: nowrap;">{ts}</td>
                <td style="padding: 8px; font-size: 13px;">{html.escape(label)}</td>
            </tr>"""
        timeline_html = f"""
      <div style="margin-bottom: 24px;">
        <h4 style="font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; margin-bottom: 10px; font-weight: 600;">Lịch sử trạng thái</h4>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>{timeline_rows}
          </tbody>
        </table>
      </div>"""

    # Build tailor info HTML
    tailor_html = ""
    if order.tailor_info:
        tailor_rows = ""
        for t in order.tailor_info:
            exp = f" ({t.experience_years} năm KN)" if t.experience_years else ""
            step_label = _STATUS_LABELS.get(t.production_step, t.production_step)
            tailor_rows += f"""
            <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 8px; font-size: 13px; font-weight: 600;">{html.escape(t.full_name)}{exp}</td>
                <td style="padding: 8px; font-size: 13px;">{html.escape(t.garment_name)}</td>
                <td style="padding: 8px; font-size: 13px; color: #6b7280;">{html.escape(step_label)}</td>
            </tr>"""
        tailor_html = f"""
      <div style="margin-bottom: 24px;">
        <h4 style="font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; margin-bottom: 10px; font-weight: 600;">Thợ may phụ trách</h4>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
              <th style="padding: 8px; font-size: 12px; text-align: left; color: #6b7280;">Thợ may</th>
              <th style="padding: 8px; font-size: 12px; text-align: left; color: #6b7280;">Sản phẩm</th>
              <th style="padding: 8px; font-size: 12px; text-align: left; color: #6b7280;">Công đoạn</th>
            </tr>
          </thead>
          <tbody>{tailor_rows}
          </tbody>
        </table>
      </div>"""

    shipping_fee = 0  # MVP: no separate shipping fee tracked
    total = order.total_amount

    html_content = f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hóa đơn {order.order_number}</title>
  <style>
    @media print {{
      body {{ margin: 0; }}
      .no-print {{ display: none !important; }}
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f9fafb;
      color: #111827;
      padding: 24px;
    }}
    .invoice-wrapper {{
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }}
    .header {{
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
      color: white;
      padding: 32px 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }}
    .shop-name {{
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }}
    .shop-tagline {{
      font-size: 13px;
      opacity: 0.85;
      margin-top: 4px;
    }}
    .invoice-title {{
      text-align: right;
    }}
    .invoice-title h2 {{
      font-size: 20px;
      font-weight: 600;
    }}
    .invoice-title .order-num {{
      font-size: 14px;
      opacity: 0.9;
      margin-top: 4px;
    }}
    .invoice-title .date {{
      font-size: 13px;
      opacity: 0.8;
      margin-top: 2px;
    }}
    .body {{ padding: 32px 40px; }}
    .info-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 28px;
    }}
    .info-box {{
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
    }}
    .info-box h4 {{
      font-size: 11px;
      text-transform: uppercase;
      color: #6b7280;
      letter-spacing: 0.05em;
      margin-bottom: 10px;
      font-weight: 600;
    }}
    .info-box p {{
      font-size: 14px;
      color: #111827;
      line-height: 1.6;
    }}
    .status-badge {{
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      background: #dbeafe;
      color: #1d4ed8;
    }}
    table {{ width: 100%; border-collapse: collapse; margin-bottom: 24px; }}
    thead tr {{
      background: #f3f4f6;
      border-bottom: 2px solid #e5e7eb;
    }}
    thead th {{
      padding: 10px 8px;
      font-size: 12px;
      text-transform: uppercase;
      color: #6b7280;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-align: left;
    }}
    thead th:last-child, thead th:nth-last-child(2) {{ text-align: right; }}
    thead th:nth-child(3), thead th:nth-child(4) {{ text-align: center; }}
    .totals {{ margin-left: auto; max-width: 280px; }}
    .total-row {{ display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }}
    .total-row.grand {{
      border-top: 2px solid #4f46e5;
      margin-top: 8px;
      padding-top: 12px;
      font-size: 16px;
      font-weight: 700;
      color: #4f46e5;
    }}
    .footer {{
      border-top: 1px solid #e5e7eb;
      padding: 20px 40px;
      text-align: center;
      font-size: 13px;
      color: #6b7280;
    }}
    .print-btn {{
      display: block;
      margin: 20px auto 0;
      padding: 10px 28px;
      background: #4f46e5;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }}
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <div class="header">
      <div>
        <div class="shop-name">Tiệm Áo Dài</div>
        <div class="shop-tagline">Thời trang may đo cao cấp</div>
      </div>
      <div class="invoice-title">
        <h2>HÓA ĐƠN</h2>
        <div class="order-num">{order.order_number}</div>
        <div class="date">Ngày: {order_date}</div>
      </div>
    </div>

    <div class="body">
      <div class="info-grid">
        <div class="info-box">
          <h4>Thông tin khách hàng</h4>
          <p><strong>{html.escape(order.delivery_info.recipient_name or '')}</strong></p>
          <p>{html.escape(order.delivery_info.phone or '')}</p>
          <p>{html.escape(order.delivery_info.address or '')}</p>
          {f'<p style="margin-top:6px;color:#6b7280;font-size:13px">Ghi chú: {html.escape(order.delivery_info.notes or "")}</p>' if order.delivery_info.notes else ''}
        </div>
        <div class="info-box">
          <h4>Thông tin đơn hàng</h4>
          <p><strong>Mã đơn:</strong> {order.order_number}</p>
          <p><strong>Ngày đặt:</strong> {order_date}</p>
          <p><strong>Trạng thái:</strong> <span class="status-badge">{status_label}</span></p>
          <p><strong>Thanh toán:</strong> {payment_method_label}</p>
          <p><strong>TT thanh toán:</strong> {payment_status_label}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Sản phẩm</th>
            <th>Loại</th>
            <th>SL</th>
            <th>Đơn giá</th>
            <th>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {items_rows}
        </tbody>
      </table>

      {timeline_html}
      {tailor_html}

      <div class="totals">
        <div class="total-row">
          <span>Tạm tính:</span>
          <span>{_format_currency(subtotal)}</span>
        </div>
        <div class="total-row">
          <span>Phí vận chuyển:</span>
          <span>{_format_currency(shipping_fee)}</span>
        </div>
        <div class="total-row grand">
          <span>Tổng cộng:</span>
          <span>{_format_currency(total)}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Cảm ơn quý khách đã tin tưởng và sử dụng dịch vụ của chúng tôi!</p>
      <p style="margin-top:6px;font-size:12px">Hóa đơn được tạo lúc: {generated_at} UTC</p>
    </div>
  </div>

  <div class="no-print" style="text-align:center;margin-top:16px">
    <button class="print-btn" onclick="window.print()">🖨 In hóa đơn</button>
  </div>
</body>
</html>"""

    return html_content
