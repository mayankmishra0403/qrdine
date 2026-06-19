"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getWaiterAppData, requestWaiterBill } from "@/lib/actions/waiter-app";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useEvents } from "@/hooks/use-events";

type OrderItem = { name: string; quantity: number; unitPrice: number };

type OrderSummary = {
  id: string; status: string; type: string; total: number;
  tableNumber: number | null;
  customerName: string | null; customerPhone: string | null;
  itemCount: number; items: OrderItem[];
  createdAt: string;
};

export default function WaiterAppHome() {
  const router = useRouter();
  const [data, setData] = useState<{
    restaurant: string; tables: Array<{ id: string; tableNumber: number; status: string; capacity: number }>;
    categories: Array<{ id: string; name: string }>;
    orders: OrderSummary[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const { lastEvent, connected } = useEvents();

  const fetch = useCallback(async () => {
    const r = await getWaiterAppData();
    if (r.success) setData(r.data as unknown as typeof data);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    const fallback = setInterval(() => {
      if (!connected) fetch();
    }, 30000);
    return () => clearInterval(fallback);
  }, [fetch, connected]);

  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.type === "order-ready" || lastEvent.type === "table-update" || lastEvent.type === "status-update") {
      fetch();
      if (lastEvent.type === "order-ready") {
        toast("🛎️ Order ready!", {
          description: `Order is ready for pickup`,
        });
      }
    }
  }, [lastEvent, fetch]);

  const occupiedTables = data?.tables.filter((t) => t.status === "occupied").length || 0;
  const vacantTables = data?.tables.filter((t) => t.status === "vacant").length || 0;
  const pendingOrders = data?.orders.filter((o) => o.status === "pending").length || 0;

  if (loading) return (
    <div className="flex items-center justify-center min-h-dvh bg-gray-50">
      <p className="text-muted-foreground animate-pulse">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-dvh bg-gray-50 p-4 pb-28 space-y-3 max-w-lg mx-auto">
      <div className="text-center py-2">
        <h1 className="text-lg font-bold">{data?.restaurant || "Restaurant"}</h1>
        <p className="text-xs text-muted-foreground">{data?.tables.length || 0} tables · {occupiedTables} occupied · {vacantTables} vacant</p>
      </div>

      {/* Two Big Cards */}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => router.push("/waiter-app/takeaway")}
          className="aspect-square rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white flex flex-col items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
          <span className="text-4xl">📦</span>
          <span className="text-lg font-bold">Takeaway</span>
          <span className="text-xs opacity-80">Walk-in customer</span>
        </button>

        <button type="button" onClick={() => router.push("/waiter-app/table/select")}
          className="aspect-square rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex flex-col items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
          <span className="text-4xl">🍽️</span>
          <span className="text-lg font-bold">Dine-in</span>
          <span className="text-xs opacity-80">Table service</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
          <p className="text-xl font-bold">{data?.orders.length || 0}</p>
          <p className="text-[10px] text-muted-foreground">Active Orders</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
          <p className="text-xl font-bold">{occupiedTables}</p>
          <p className="text-[10px] text-muted-foreground">Tables Used</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
          <p className="text-xl font-bold">{vacantTables}</p>
          <p className="text-[10px] text-muted-foreground">Tables Free</p>
        </div>
      </div>

      {/* Active Orders */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Active Orders</h2>
          <button className="text-xs text-blue-600" onClick={() => router.push("/waiter-app/orders")}>
            View All →
          </button>
        </div>
        <div className="space-y-1.5">
          {data?.orders.slice(0, 10).map((order) => (
            <button key={order.id} type="button" onClick={() => router.push(`/waiter-app/orders?order=${order.id}`)}
              className="w-full flex items-center justify-between bg-white rounded-xl p-3 shadow-sm active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg shrink-0">{order.type === "takeaway" ? "📦" : "🍽️"}</span>
                <div className="text-left min-w-0">
                  <p className="text-xs font-medium truncate">
                    {order.type === "takeaway" ? `TAKE-${order.id.slice(-6).toUpperCase()}` : `Table ${order.tableNumber}`}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {order.customerName || order.customerPhone || ""} · {order.itemCount} items
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold">₹{order.total.toFixed(2)}</span>
                <Badge variant="outline" className={`text-[9px] ${
                  order.status === "pending" ? "border-yellow-300 text-yellow-700" :
                  order.status === "ready" ? "border-green-300 text-green-700" :
                  "border-blue-300 text-blue-700"
                }`}>{order.status}</Badge>
              </div>
            </button>
          ))}
          {(!data?.orders || data.orders.length === 0) && (
            <p className="text-center text-xs text-muted-foreground py-8">No active orders</p>
          )}
        </div>
      </div>
    </div>
  );
}
