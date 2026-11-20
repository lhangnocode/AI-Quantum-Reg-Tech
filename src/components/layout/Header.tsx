"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GatewayBadge } from "./GatewayBadge";
import { NAV_ITEMS } from "./Sidebar";
import { logout } from "@/app/auth-actions";

const today = new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "long", year: "numeric" });

type HeaderProps = {
  user: {
    name?: string | null;
    email?: string | null;
  };
};

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  // Cổng 1 có badge trong header DN của trang; Cổng 2 hiển thị ở đây.
  const gateway = pathname.startsWith("/private") ? 2 : null;
  const title = NAV_ITEMS.find((n) => n.match(pathname))?.label ?? "QuantumRegTech";
  const isLocalDemoAccount = user.email?.endsWith("@ai-quantum-reg-tech.local") ?? false;
  const displayName = isLocalDemoAccount ? "Nhà đầu tư" : user.name || user.email?.split("@")[0] || "Tài khoản";
  const displayEmail = isLocalDemoAccount ? null : user.email;
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ticker = query.trim().toUpperCase();
    if (ticker) router.push(`/company/${ticker}`);
  }

  return (
    <header className="flex shrink-0 print:hidden items-center gap-4 border-b bg-card px-6 py-3.5">
      <div className="min-w-0">
        <h1 className="text-base font-semibold">{title}</h1>
        <p className="truncate text-xs text-muted-foreground" suppressHydrationWarning>
          Thẩm định ESG & tối ưu danh mục F&B — {today.format(new Date())}
        </p>
      </div>

      {gateway && <GatewayBadge gateway={gateway} className="hidden md:inline-flex" />}

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

      {!pathname.startsWith("/login") && (
        <>
          <div
            className="flex min-w-0 shrink-0 items-center gap-2"
            aria-label={`Tài khoản ${displayName}${displayEmail ? `, ${displayEmail}` : ""}`}
            title={displayEmail || displayName}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initials || "U"}
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-36 truncate text-xs font-semibold">{displayName}</span>
              {displayEmail && (
                <span className="block max-w-36 truncate text-[11px] text-muted-foreground">
                  {displayEmail}
                </span>
              )}
            </span>
          </div>
          <form action={logout}>
            <button
              type="submit"
              aria-label="Đăng xuất"
              title="Đăng xuất"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </>
      )}
    </header>
  );
}
