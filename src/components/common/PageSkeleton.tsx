import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton chung khi trang đang tải dữ liệu. */
export function PageSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Đang tải">
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}
