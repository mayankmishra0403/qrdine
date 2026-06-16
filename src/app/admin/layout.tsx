import type { ReactNode } from "react";
import { signOut } from "@/lib/auth";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <nav className="w-64 border-r bg-muted/30 p-4 hidden md:flex flex-col gap-2">
        <h2 className="font-bold text-lg mb-4">QRDine Admin</h2>
        <a href="/admin" className="text-sm hover:underline">Dashboard</a>
        <a href="/admin/menu" className="text-sm hover:underline">Menu</a>
        <a href="/admin/tables" className="text-sm hover:underline">Tables</a>
        <a href="/admin/orders" className="text-sm hover:underline">Orders</a>
        <a href="/admin/customers" className="text-sm hover:underline">Customers</a>
        <a href="/admin/analytics" className="text-sm hover:underline">Analytics</a>
        <a href="/admin/campaigns" className="text-sm hover:underline">Campaigns</a>
        <a href="/admin/whatsapp" className="text-sm hover:underline">WhatsApp</a>
        <a href="/admin/billing" className="text-sm hover:underline">Billing</a>
        <a href="/admin/settings" className="text-sm hover:underline">Settings</a>
        <div className="mt-auto pt-4 border-t">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button type="submit" className="text-sm text-red-600 hover:underline w-full text-left">
              Logout
            </button>
          </form>
        </div>
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
