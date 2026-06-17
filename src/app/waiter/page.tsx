"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getWaiterData } from "@/lib/actions/waiter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Table = { id: string; tableNumber: number; capacity: number; status: string; room?: { name: string } | null };
type Order = { id: string; status: string; tableNumber: number; items: Array<{ name: string; quantity: number }>; total: number };
type Category = { id: string; name: string; items: Array<{ id: string; name: string; price: number; variants: Array<{ id: string; name: string; priceMod: number }> }> };

type WaiterData = {
  tables: Table[];
  categories: Category[];
  orders: Order[];
  restaurant: { name: string; currency: string } | null;
};

export default function WaiterPage() {
  const router = useRouter();
  const [data, setData] = useState<WaiterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetch = useCallback(async () => {
    const r = await getWaiterData();
    if (r.success) setData(r.data as unknown as WaiterData);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); const i = setInterval(fetch, 15000); return () => clearInterval(i); }, [fetch]);

  const tables = data?.tables || [];
  const orders = data?.orders || [];

  const filteredTables = filter === "all" ? tables : filter === "vacant" ? tables.filter((t) => t.status === "vacant") : tables.filter((t) => t.status === "occupied");

  const statusColor = (s: string) =>
    s === "vacant" ? "border-green-400 bg-green-50" :
    s === "occupied" ? "border-red-400 bg-red-50" :
    s === "merged" ? "border-purple-400 bg-purple-50" :
    "border-gray-300";

  function getTableOrder(tn: number) {
    return orders.find((o) => o.tableNumber === tn);
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading tables...</div>;

  return (
    <div className="p-3 max-w-2xl mx-auto space-y-3 pb-24">
      <div className="text-center">
        <h1 className="text-lg font-bold">{data?.restaurant?.name || "Restaurant"}</h1>
        <p className="text-xs text-muted-foreground">
          {tables.length} tables · {tables.filter((t) => t.status === "occupied").length} occupied
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {["all", "vacant", "occupied"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border ${filter === f ? "bg-foreground text-background border-foreground font-medium" : "bg-white border-muted-foreground/30"}`}>
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {filteredTables.map((table) => {
          const order = getTableOrder(table.tableNumber);
          return (
            <button key={table.id} type="button" onClick={() => router.push(`/waiter/${table.id}`)}
              className={`rounded-xl border-2 p-2.5 text-left transition-all active:scale-95 ${statusColor(table.status)}`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-base font-bold">T{table.tableNumber}</span>
                {table.room && <span className="text-[9px] text-muted-foreground">{table.room.name}</span>}
              </div>
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${table.status === "vacant" ? "text-green-700 border-green-300" : "text-red-700 border-red-300"}`}>
                {table.status}
              </Badge>
              <p className="text-[9px] text-muted-foreground mt-0.5">Cap: {table.capacity}</p>
              {order && (
                <div className="mt-1 text-[9px] text-muted-foreground border-t pt-0.5">
                  <p className="font-medium">{order.items.length} items</p>
                  <p className="tabular-nums">₹{order.total.toFixed(2)}</p>
                </div>
              )}
            </button>
          );
        })}
        {filteredTables.length === 0 && (
          <p className="col-span-3 text-center py-10 text-muted-foreground text-sm">No tables found</p>
        )}
      </div>
    </div>
  );
}
