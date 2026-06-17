"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";

const navLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/pos", label: "POS Billing" },
  { href: "/admin/takeaway", label: "📦 Takeaway" },
  { href: "/waiter", label: "Waiter Panel" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/tables", label: "Tables" },
  { href: "/admin/rooms", label: "Rooms/Zones" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/analytics", label: "Analytics" },
  { type: "label", label: "--- Inventory ---" },
  { href: "/admin/inventory", label: "Stock Items" },
  { href: "/admin/inventory/recipes", label: "Recipes" },
  { href: "/admin/inventory/suppliers", label: "Suppliers" },
  { href: "/admin/inventory/purchase-orders", label: "Purchase Orders" },
  { type: "label", label: "---" },
  { href: "/admin/campaigns", label: "Campaigns" },
  { href: "/admin/whatsapp", label: "WhatsApp" },
  { href: "/admin/billing", label: "Billing" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/settings/gst", label: "GST Settings" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b flex items-center justify-between px-3 py-2.5">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted"
          aria-label="Toggle menu"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="19" y2="6" />
            <line x1="3" y1="11" x2="19" y2="11" />
            <line x1="3" y1="16" x2="19" y2="16" />
          </svg>
        </button>
        <span className="text-sm font-bold">Ritam Bharat POS</span>
        <LogoutButton className="text-xs" />
      </div>

      {/* Mobile overlay */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setMenuOpen(false)} />
      )}

      {/* Mobile slide-in nav */}
      <nav className={`md:hidden fixed top-12 left-0 bottom-0 z-50 w-64 bg-white border-r shadow-xl transform transition-transform duration-200 overflow-y-auto ${
        menuOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="p-3 flex flex-col gap-0.5">
          {navLinks.map((link, i) => {
            if ("type" in link) {
              return <p key={i} className="text-[10px] text-muted-foreground mt-2 mb-0.5">{link.label}</p>;
            }
            const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`text-sm py-2 px-2 rounded-lg transition-colors ${
                  isActive ? "bg-foreground text-background font-medium" : "hover:bg-muted"
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 border-r bg-muted/30 p-4 flex-col gap-2 overflow-y-auto">
        <h2 className="font-bold text-lg mb-4">Ritam Bharat POS</h2>
        {navLinks.map((link, i) => {
          if ("type" in link) {
            return <p key={i} className="text-[10px] text-muted-foreground mt-2 mb-0.5">{link.label}</p>;
          }
          const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
          return (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm py-1.5 px-2 rounded-lg transition-colors ${
                isActive ? "bg-foreground text-background font-medium" : "hover:bg-muted"
              }`}
            >
              {link.label}
            </a>
          );
        })}
        <div className="mt-auto pt-4 border-t">
          <LogoutButton className="w-full text-left" />
        </div>
      </nav>

      {/* Main content */}
      <main className="md:ml-64 pt-12 md:pt-0 p-4 md:p-6 min-h-screen">
        {children}
      </main>
    </div>
  );
}
