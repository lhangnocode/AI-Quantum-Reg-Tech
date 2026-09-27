"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Atom,
  Briefcase,
  FileBarChart2,
  LayoutDashboard,
  Lock,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard, match: (p: string) => p === "/" },
  { href: "/company/VNM", label: "Tra cứu", icon: Search, match: (p: string) => p.startsWith("/company") },
  { href: "/private", label: "Nạp DL bảo mật", icon: Lock, match: (p: string) => p.startsWith("/private") },
  { href: "/portfolio", label: "Danh mục", icon: Briefcase, match: (p: string) => p.startsWith("/portfolio") },
  { href: "/report/VNM", label: "Báo cáo", icon: FileBarChart2, match: (p: string) => p.startsWith("/report") },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full print:hidden w-16 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:w-60">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-sidebar-border px-4 py-5 lg:px-5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Atom className="size-4" strokeWidth={2} />
        </div>
        <div className="hidden lg:block">
          <div className="text-xs leading-tight font-bold">QuantumReg</div>
          <div className="text-xs leading-tight font-bold text-primary">Tech</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 px-3 pt-4 pb-5">
        <p className="mb-2 hidden px-3 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase lg:block">
          Menu chính
        </p>
        {NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
          const isActive = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:justify-start",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="hidden lg:inline">{label}</span>
              {isActive && <span className="ml-auto hidden size-1.5 rounded-full bg-primary lg:block" />}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
