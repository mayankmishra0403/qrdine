"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getWaiterAppData, addWaiterAppItems, requestWaiterBill, markTakeawayReady } from "@/lib/actions/waiter-app";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Suspense } from "react";
import { useEvents } from "@/hooks/use-events";

type OrderSummary = {
  id: string; status: string; type: string; total: number;
  tableNumber: number | null; customerPhone: string | null;
  itemCount: number; items: Array<{ name: string; quantity: number; unitPrice: number }>;
};

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("order");

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [addMore, setAddMore] = useState<Record<string, Array<{ name: string; price: number; qty: number }>>>({});
  const { lastEvent, connected } = useEvents();

  const fetch = useCallback(async () => {
    const r = await getWaiterAppData();
    if (r.success) setOrders((r.data as unknown as { orders: OrderSummary[] }).orders);
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
    if (["order-ready", "table-update", "status-update", "new-order"].includes(lastEvent.type)) {
      fetch();
      if (lastEvent.type === "order-ready") {
        const tableInfo = lastEvent.tableNumber ? `Table ${lastEvent.tableNumber}` : "Takeaway";
        toast("🛎️ Order ready!", {
          description: `${tableInfo} — ready for service`,
        });
      }
    }
  }, [lastEvent, fetch]);

  const filtered = activeTab === "all" ? orders : orders.filter((o) => o.type === activeTab);
  const selectedOrder = selectedId ? orders.find((o) => o.id === selectedId) : null;

  async function handleAddMore(orderId: string) {
    const items = addMore[orderId];
    if (!items || items.length === 0) return;
    const result = await addWaiterAppItems(orderId, items.map((i) => ({ itemId: i.name, quantity: i.qty, unitPrice: i.price })));
    if (result.success) { toast.success("Added!"); setAddMore({ ...addMore, [orderId]: [] }); await fetch(); }
    else toast.error(result.error || "Failed");
  }

  async function handleBill(orderId: string) {
    const r = await requestWaiterBill(orderId);
    if (r.success) { toast.success("Bill sent!"); router.push(`/waiter-app/bill/${orderId}`); }
    else toast.error(r.error || "Failed");
  }

  if (loading) return <div className="flex items-center justify-center min-h-dvh bg-gray-50"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="min-h-dvh bg-gray-50 p-4 max-w-lg mx-auto pb-28">
      <div className="flex items-center gap-2 mb-3">
        <button className="text-lg" onClick={() => router.push("/waiter-app")}>←</button>
        <h1 className="text-base font-bold">Active Orders</h1>
        <span className="text-xs text-muted-foreground">{orders.length} total</span>
      </div>

      <div className="flex gap-1.5 mb-3 overflow-x-auto">
        {["all", "dine-in", "takeaway"].map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border ${activeTab === t ? "bg-foreground text-background border-foreground font-medium" : "bg-white"}`}>
            {t === "all" ? "All" : t === "dine-in" ? "🍽️ Dine-in" : "📦 Takeaway"}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((order) => (
          <div key={order.id} className="bg-white rounded-xl p-3 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{order.type === "takeaway" ? "📦" : "🍽️"}</span>
                <span className="text-xs font-bold">
                  {order.type === "takeaway" ? `TAKE-${order.id.slice(-6).toUpperCase()}` : `Table ${order.tableNumber}`}
                </span>
                <Badge variant="outline" className={`text-[9px] ${
                  order.status === "pending" ? "border-yellow-300 text-yellow-700" :
                  order.status === "ready" ? "border-green-300 text-green-700" :
                  "border-blue-300 text-blue-700"
                }`}>{order.status}</Badge>
              </div>
              <span className="text-xs font-bold">₹{order.total.toFixed(2)}</span>
            </div>
            {order.customerPhone && <p className="text-[10px] text-muted-foreground">📞 {order.customerPhone}</p>}
            {order.items.map((i, idx) => (
              <p key={idx} className="text-[11px] flex justify-between">
                <span>{i.name} ×{i.quantity}</span>
                <span className="tabular-nums">₹{(i.unitPrice * i.quantity).toFixed(2)}</span>
              </p>
            ))}
            <div className="flex gap-1.5 pt-0.5">
              <Button size="sm" className="text-[10px] h-7 flex-1" onClick={() => handleBill(order.id)}>🧾 Bill</Button>
              {order.type === "takeaway" && order.status !== "ready" && (
                <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={async () => {
                  await markTakeawayReady(order.id); toast.success("Marked ready!"); await fetch();
                }}>✅ Ready</Button>
              )}
              <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => router.push(`/waiter-app/bill/${order.id}`)}>🖨️ Print</Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center py-10 text-xs text-muted-foreground">No orders</p>}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return <Suspense fallback={<div className="flex items-center justify-center min-h-dvh bg-gray-50"><p className="text-muted-foreground">Loading...</p></div>}>
    <OrdersContent />
  </Suspense>;
}
