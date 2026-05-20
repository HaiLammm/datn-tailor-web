import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[35%_65%]">
      <div className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-[420px] w-full rounded-3xl" />
      </div>
    </div>
  );
}
