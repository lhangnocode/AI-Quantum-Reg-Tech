"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <AlertTriangle className="size-8 text-risk-distress" />
      <p className="text-sm font-semibold">Không tải được dữ liệu</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Đã xảy ra lỗi khi gọi lớp dữ liệu. Vui lòng thử lại.
      </p>
      <Button size="sm" onClick={() => retry()}>
        Thử lại
      </Button>
    </div>
  );
}
