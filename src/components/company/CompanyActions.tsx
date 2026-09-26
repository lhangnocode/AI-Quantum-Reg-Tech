"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { usePortfolioStore } from "@/store/portfolio";

export function CompanyActions({ ticker }: { ticker: string }) {
  const router = useRouter();
  const added = usePortfolioStore((s) => s.watchlist.includes(ticker));
  const add = usePortfolioStore((s) => s.addToWatchlist);

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        disabled={added}
        onClick={() => {
          add(ticker);
          toast.success(`Đã thêm ${ticker} vào danh mục theo dõi`, {
            action: { label: "Xem danh mục", onClick: () => router.push("/portfolio") },
          });
        }}
      >
        <Plus /> {added ? "Đã thêm vào danh mục" : "Thêm vào danh mục"}
      </Button>
      <Link href={`/report/${ticker}`} className={buttonVariants()}>
        <FileDown /> Xuất báo cáo thẩm định
      </Link>
    </div>
  );
}
