"use client";

import { LogoutButton } from "@/components/logout-button";
import { NotificationCenter } from "@/components/notification-center";
import { usePathname } from "next/navigation";

export function KitchenHeader() {
  const pathname = usePathname();
  const title = pathname?.includes("orders") ? "Orders" : "Kitchen Display";

  return (
    <header className="sticky top-0 z-50 bg-gray-900 text-white px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-bold tracking-tight">👨‍🍳 {title}</h1>
      </div>
      <div className="flex items-center gap-1">
        <NotificationCenter />
        <LogoutButton className="text-xs text-gray-300 hover:text-white" />
      </div>
    </header>
  );
}
