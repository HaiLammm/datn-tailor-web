/**
 * Customer Route Group Layout
 * Story 2.1: Lựa chọn Phong cách
 * Story 4.4a: Profile Icon added to navbar
 * Story 15.1: Shared CustomerNavbar + SiteFooter (replaces inline navbar & hardcoded footers)
 *
 * Layout for customer-facing (Boutique Mode) pages.
 */

import type { ReactNode } from "react";
import { auth } from "@/auth";
import { CustomerNavbar } from "@/components/client/navigation/CustomerNavbar";
import { SiteFooter } from "@/components/client/navigation/SiteFooter";
import { FloatingContact } from "@/components/client/navigation/FloatingContact";

interface CustomerLayoutProps {
  children: ReactNode;
}

export default async function CustomerLayout({ children }: CustomerLayoutProps) {
  const session = await auth();
  const userName = session?.user?.name ?? null;

  return (
    // pb-14 trên điện thoại: chừa chỗ cho thanh Gọi/Zalo cố định đáy màn hình.
    <div className="min-h-screen flex flex-col bg-gray-50 pb-14 md:pb-0">
      <CustomerNavbar userName={userName} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <FloatingContact />
    </div>
  );
}
