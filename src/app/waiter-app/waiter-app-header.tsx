"use client";

import { LogoutButton } from "@/components/logout-button";
import { usePathname } from "next/navigation";

export function WaiterAppHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/waiter-app" || pathname === "/waiter-app/";

  return (
    <header className="sticky top-0 z-50 bg-white border-b px-3 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-bold tracking-tight">📋 Waiter App</h1>
      </div>
      <div className="flex items-center gap-2">
        <LogoutButton className="text-xs text-red-600" />
      </div>
    </header>
  );
}
