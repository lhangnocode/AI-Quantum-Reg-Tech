"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NAV_ITEMS } from "./Sidebar";

const today = new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "long", year: "numeric" });

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const title = NAV_ITEMS.find((n) => n.match(pathname))?.label ?? "QuantumRegTech";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ticker = query.trim().toUpperCase();
    if (ticker) router.push(`/company/${ticker}`);
  }

  return (
    <header className="flex shrink-0 items-center gap-4 border-b bg-card px-6 py-3.5">
      <div className="min-w-0">
        <h1 className="text-base font-semibold">{title}</h1>
        <p className="truncate text-xs text-muted-foreground" suppressHydrationWarning>
          Thẩm định ESG & tối ưu danh mục F&B — {today.format(new Date())}
        </p>
      </div>

      <form onSubmit={onSubmit} className="relative ml-auto" role="search">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm mã CP (VNM, SAB…)"
          aria-label="Tìm mã cổ phiếu"
          className="h-9 w-44 bg-background pl-8 sm:w-56"
        />
      </form>
    </header>
  );
}
