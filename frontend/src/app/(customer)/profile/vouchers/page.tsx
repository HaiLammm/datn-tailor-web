/**
 * Profile Vouchers Page — Story 4.4g: Kho Voucher
 *
 * Server Component: authenticates, fetches voucher list, passes to VoucherList.
 * Auth guard is handled by both auth() here and parent profile/layout.tsx.
 */

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getMyVouchers } from "@/app/actions/profile-actions";
import { VoucherList } from "@/components/client/profile/VoucherList";

export default async function ProfileVouchersPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const result = await getMyVouchers();
  const vouchers = result.success ? (result.data?.vouchers ?? []) : [];
  const fetchError = result.success ? undefined : result.error;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <VoucherList initialVouchers={vouchers} initialError={fetchError} />
    </div>
  );
}
