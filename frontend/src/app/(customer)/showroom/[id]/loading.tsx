import { ProductDetailSkeleton } from "@/components/client/showroom/ProductDetailSkeleton";

/**
 * Story 2.2: Next.js loading.tsx — tự động hiển thị skeleton khi page.tsx đang fetch data.
 * AC10: Skeleton placeholder thay vì spinner, duy trì spatial context.
 */
export default function Loading() {
  return <ProductDetailSkeleton />;
}
