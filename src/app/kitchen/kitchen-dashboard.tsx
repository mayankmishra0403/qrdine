"use client";

import { useEffect, useState, useCallback } from "react";
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

const statusFlow: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready"],
  ready: ["served"],
};

const statusLabels: Record<string, string> = {
  pending: "New",
  confirmed: "Confirm",
  preparing: "Prepare",
  ready: "Ready",
  served: "Served",
  cancelled: "Cancel",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-blue-500",
  preparing: "bg-purple-500",
  ready: "bg-green-500",
  served: "bg-gray-400",
  cancelled: "bg-red-500",
};

const statusGroupLabels: Record<string, string> = {
  pending: "New Orders",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready to Serve",
};

const statusGroups = ["pending", "confirmed", "preparing", "ready"];

export function KitchenDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders/active");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, [fetchOrders]);

  async function handleStatus(orderId: string, status: string) {
    const result = await updateOrderStatus(orderId, status);
    if (result.success) {
      toast.success(`Order ${statusLabels[status]}d`);
      await fetchOrders();
    } else {
      toast.error(result.error);
    }
  }

  function timeAgo(createdAt: string) {
    const diff = now - new Date(createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  }

  if (loading) {
    return (
      <div className="text-center py-20 text-muted-foreground animate-pulse">
        Loading orders...
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-3xl text-muted-foreground">No active orders</p>
        <p className="text-sm text-muted-foreground mt-2">
          Waiting for customers to place orders...
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchOrders}>
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kitchen Display</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{orders.length} active orders</span>
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statusGroups.map((status) => {
          const groupOrders = orders.filter((o) => o.status === status);
          return (
            <div key={status} className="space-y-3">
              <div className="flex items-center gap-2 sticky top-0 bg-gray-50 pb-1 z-10">
                <div
                  className={`w-3 h-3 rounded-full ${statusColors[status]}`}
                />
                <h2 className="font-semibold">{statusGroupLabels[status]}</h2>
                <Badge variant="secondary">{groupOrders.length}</Badge>
              </div>

              {groupOrders.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center italic">
                  None
                </p>
              )}

              {groupOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-lg border bg-white p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">
                      Table {order.table.tableNumber}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(order.createdAt)}
                    </span>
                  </div>
                  {order.customer && (
                    <p className="text-xs text-muted-foreground">
                      📞 {order.customer.phone}
                      {order.customer.name ? ` - ${order.customer.name}` : ""}
                    </p>
                  )}

                  <div className="space-y-1 text-sm">
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
                    <p className="text-xs text-muted-foreground italic bg-muted p-2 rounded">
                      &ldquo;{order.notes}&rdquo;
                    </p>
                  )}

                  <div className="flex gap-2">
                    {statusFlow[order.status]?.map((nextStatus) => (
                      <Button
                        key={nextStatus}
                        size="sm"
                        variant={
                          nextStatus === "cancelled" ? "outline" : "default"
                        }
                        className={
                          nextStatus === "cancelled"
                            ? "text-red-600 border-red-300"
                            : ""
                        }
                        onClick={() => handleStatus(order.id, nextStatus)}
                      >
                        {statusLabels[nextStatus]}
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
