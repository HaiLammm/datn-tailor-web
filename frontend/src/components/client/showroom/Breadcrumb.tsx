"use client";

/**
 * Story 2.2: Breadcrumb — "Showroom > [Category] > [Tên sản phẩm]"
 * Progressive Forward Navigation
 */

import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Đường dẫn điều hướng" className="flex items-center gap-1 text-sm flex-wrap">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && (
            <span className="text-gray-400" aria-hidden="true">
              ›
            </span>
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="text-[#D4AF37] hover:text-[#F9F7F2] transition-colors"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {item.label}
            </Link>
          ) : (
            <span
              className="text-[#F9F7F2]/70"
              aria-current="page"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
