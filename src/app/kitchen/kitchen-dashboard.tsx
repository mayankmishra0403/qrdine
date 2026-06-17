"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { updateOrderStatus } from "@/lib/actions/orders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type OrderItem = {
  id: string;
  quantity: number;
  unitPrice: number;
  item: { id: string; name: string };
  variant: { id: string; name: string } | null;
};

type Customer = { phone: string; name: string | null } | null;

type Order = {
  id: string;
  status: string;
  notes: string | null;
  createdAt: string;
  table: { id: string; tableNumber: number };
  customer: Customer;
  items: OrderItem[];
};

type OrderWithTimer = Order & { elapsed: number; isUrgent: boolean };

const statusFlow: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready"],
  ready: ["served"],
};

const actionLabels: Record<string, string> = {
  confirmed: "Accept",
  preparing: "Start Prep",
  ready: "Mark Ready",
  served: "Served",
  cancelled: "Cancel",
};

const statusGroupLabels: Record<string, string> = {
  pending: "New Orders",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready to Serve",
};

const statusGroupIcons: Record<string, string> = {
  pending: "🆕",
  confirmed: "✅",
  preparing: "👨‍🍳",
  ready: "🍽️",
};

const statusGroups = ["pending", "confirmed", "preparing", "ready"];

const URGENT_THRESHOLD_MS = 15 * 60 * 1000;
const WARNING_THRESHOLD_MS = 10 * 60 * 1000;

function playNewOrderSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

export function KitchenDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [fullscreen, setFullscreen] = useState(false);
  const prevOrderCount = useRef(0);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders/active");
      if (res.ok) {
        const data: Order[] = await res.json();
        if (data.length > prevOrderCount.current) {
          playNewOrderSound();
        }
        prevOrderCount.current = data.length;
        setOrders(data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, [fetchOrders]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") setFullscreen((p) => !p);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  async function handleStatus(orderId: string, status: string) {
    const result = await updateOrderStatus(orderId, status);
    if (result.success) {
      toast.success(`Order ${status}`);
      await fetchOrders();
    } else {
      toast.error(result.error);
    }
  }

  function formatElapsed(ms: number) {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function getTimeStyle(elapsed: number, isUrgent: boolean): string {
    if (isUrgent) return "text-red-600 font-bold animate-pulse";
    if (elapsed > WARNING_THRESHOLD_MS) return "text-amber-600 font-semibold";
    return "text-muted-foreground";
  }

  function getCardBorder(status: string, elapsed: number, isUrgent: boolean): string {
    if (isUrgent && (status === "preparing" || status === "confirmed")) return "border-red-400 ring-2 ring-red-200";
    if (elapsed > WARNING_THRESHOLD_MS && status === "preparing") return "border-amber-400";
    return "border";
  }

  const ordersWithTimers: OrderWithTimer[] = orders.map((o) => {
    const elapsed = now - new Date(o.createdAt).getTime();
    const isUrgent = elapsed > URGENT_THRESHOLD_MS && o.status !== "ready";
    return { ...o, elapsed, isUrgent };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground animate-pulse text-xl">
        Loading orders...
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-6xl">🍽️</p>
        <p className="text-2xl text-muted-foreground">No active orders</p>
        <p className="text-sm text-muted-foreground">Waiting for customers...</p>
        <Button variant="outline" size="sm" onClick={fetchOrders}>
          Refresh
        </Button>
      </div>
    );
  }

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className={`${fullscreen ? "fixed inset-0 z-50 bg-white overflow-auto p-4" : "space-y-4 p-4"}`}>
      <div className="flex items-center justify-between sticky top-0 bg-white z-10 pb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Kitchen Display</h1>
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
              {pendingCount} new
            </span>
          )}
          <span className="text-xs text-muted-foreground">{orders.length} active</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Press <kbd className="px-1 py-0.5 border rounded text-[10px]">F</kbd> fullscreen</span>
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={fetchOrders}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {statusGroups.map((status) => {
          const groupOrders = ordersWithTimers.filter((o) => o.status === status);
          return (
            <div key={status} className="space-y-2">
              <div className="flex items-center gap-2 sticky top-10 bg-white pb-1 z-10 border-b">
                <span className="text-lg">{statusGroupIcons[status]}</span>
                <h2 className="font-semibold text-sm">{statusGroupLabels[status]}</h2>
                {groupOrders.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">{groupOrders.length}</Badge>
                )}
              </div>

              {groupOrders.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center italic">None</p>
              )}

              {groupOrders.map((order) => (
                <div
                  key={order.id}
                  className={`rounded-lg bg-white p-3 shadow-sm space-y-2 ${getCardBorder(order.status, order.elapsed, order.isUrgent)} ${order.isUrgent ? "bg-red-50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold">
                      Table {order.table?.tableNumber ?? "?"}
                    </span>
                    <div className="flex items-center gap-2">
                      {order.isUrgent && <span className="text-lg">🔴</span>}
                      <span className={`text-xs font-mono tabular-nums ${getTimeStyle(order.elapsed, order.isUrgent)}`}>
                        {formatElapsed(order.elapsed)}
                      </span>
                    </div>
                  </div>

                  {order.customer && (
                    <p className="text-[10px] text-muted-foreground">
                      📞 {order.customer.phone}
                      {order.customer.name ? ` - ${order.customer.name}` : ""}
                    </p>
                  )}

                  <div className="space-y-0.5 text-xs">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span>
                          {item.quantity}x {item.item.name}
                          {item.variant ? ` (${item.variant.name})` : ""}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <p className="text-[10px] text-muted-foreground italic bg-muted/50 p-1.5 rounded">
                      &ldquo;{order.notes}&rdquo;
                    </p>
                  )}

                  <div className="flex gap-1.5 pt-1">
                    {statusFlow[order.status]?.map((nextStatus) => (
                      <Button
                        key={nextStatus}
                        size="sm"
                        className={`text-xs h-7 flex-1 ${
                          nextStatus === "cancelled" ? "text-red-600 border-red-300 bg-white border" :
                          nextStatus === "ready" ? "bg-green-600 hover:bg-green-700 text-white" :
                          nextStatus === "preparing" ? "bg-purple-600 hover:bg-purple-700 text-white" :
                          ""
                        }`}
                        onClick={() => handleStatus(order.id, nextStatus)}
                      >
                        {actionLabels[nextStatus]}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
