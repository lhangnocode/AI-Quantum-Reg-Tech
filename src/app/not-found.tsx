import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getCompanies } from "@/lib/api";

export default async function NotFound() {
  const tickers = (await getCompanies()).map((company) => company.ticker).join(", ");
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-20 text-center">
      <SearchX className="size-8 text-muted-foreground" />
      <p className="text-sm font-semibold">Không tìm thấy trang</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Mã cổ phiếu không có trong danh sách giám sát ({tickers}) hoặc đường dẫn không tồn tại.
      </p>
      <Link href="/" className={buttonVariants({ size: "sm" })}>
        Về Tổng quan
      </Link>
    </div>
  );
}
