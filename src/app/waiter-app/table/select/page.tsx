"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getWaiterAppData } from "@/lib/actions/waiter-app";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type TableInfo = { id: string; tableNumber: number; status: string; capacity: number };

export default function TableSelect() {
  const router = useRouter();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("vacant");

  const fetch = useCallback(async () => {
    const r = await getWaiterAppData();
    if (r.success) setTables((r.data as unknown as { tables: TableInfo[] }).tables);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = filter === "all" ? tables : tables.filter((t) => t.status === filter);
  const vacant = tables.filter((t) => t.status === "vacant").length;
  const occupied = tables.filter((t) => t.status === "occupied").length;

  if (loading) return <div className="flex items-center justify-center min-h-dvh bg-gray-50"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="min-h-dvh bg-gray-50 p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-3">
        <button className="text-lg" onClick={() => router.push("/waiter-app")}>←</button>
        <h1 className="text-base font-bold">🍽️ Select Table</h1>
        <span className="text-xs text-muted-foreground">{vacant} free · {occupied} used</span>
      </div>

      <div className="flex gap-1.5 mb-3 overflow-x-auto">
        {["vacant", "occupied", "all"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border ${filter === f ? "bg-foreground text-background border-foreground font-medium" : "bg-white"}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {filtered.map((table) => (
          <button key={table.id} type="button" onClick={() => router.push(`/waiter-app/table/${table.id}`)}
            className={`rounded-xl p-3 text-center shadow-sm border-2 active:scale-95 transition-transform ${
              table.status === "vacant" ? "bg-white border-green-300" : "bg-red-50 border-red-300"
            }`}>
            <div className="text-center">
              <p className="text-lg font-bold">T{table.tableNumber}</p>
              <Badge variant="outline" className={`text-[9px] mt-1 ${table.status === "vacant" ? "text-green-700 border-green-300" : "text-red-700 border-red-300"}`}>
                {table.status}
              </Badge>
              <p className="text-[9px] text-muted-foreground mt-1">{table.capacity} seats</p>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-3 text-center py-10 text-xs text-muted-foreground">No tables found</p>
        )}
      </div>
    </div>
  );
}
