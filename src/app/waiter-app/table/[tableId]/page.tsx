"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getWaiterAppData, createWaiterAppOrder, addWaiterAppItems, requestWaiterBill, markTakeawayReady } from "@/lib/actions/waiter-app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type MenuItem = { id: string; name: string; price: number };
type CartItem = { item: MenuItem; quantity: number };

export default function DineInOrder() {
  const params = useParams();
  const router = useRouter();
  const tableId = params.tableId as string;

  const [data, setData] = useState<{ categories: Array<{ id: string; name: string; items: MenuItem[] }>; orders: Array<{ id: string; tableNumber: number; status: string; total: number; items: Array<{ name: string; quantity: number; unitPrice: number }> }> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    const r = await getWaiterAppData();
    if (r.success) setData(r.data as unknown as typeof data);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const table = data?.orders.find((o) => o.tableNumber === parseInt(tableId)) || null;
  const categories = data?.categories || [];
  const allItems = categories.flatMap((cat) => cat.items);
  const filtered = search ? allItems.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())) : allItems;

  const count = cart.reduce((s, c) => s + c.quantity, 0);
  const total = cart.reduce((s, c) => s + c.item.price * c.quantity, 0);

  async function handleCreate() {
    if (count === 0) return;
    setSaving(true);
    const items = cart.map((c) => ({ itemId: c.item.id, quantity: c.quantity, unitPrice: c.item.price }));
    const r = await createWaiterAppOrder({ type: "dine-in", tableId, items });
    if (r.success) { toast.success("Order created!"); setCart([]); await fetch(); }
    else toast.error(r.error || "Failed");
    setSaving(false);
  }

  async function handleAddItems(orderId: string) {
    if (count === 0) return;
    setSaving(true);
    const items = cart.map((c) => ({ itemId: c.item.id, quantity: c.quantity, unitPrice: c.item.price }));
    const r = await addWaiterAppItems(orderId, items);
    if (r.success) { toast.success("Items added!"); setCart([]); await fetch(); }
    else toast.error(r.error || "Failed");
    setSaving(false);
  }

  async function handleBill(orderId: string) {
    const r = await requestWaiterBill(orderId);
    if (r.success) { toast.success("Bill sent!"); router.push(`/waiter-app/bill/${orderId}`); }
    else toast.error(r.error || "Failed");
  }

  if (loading) return <div className="flex items-center justify-center min-h-dvh bg-gray-50"><p className="text-muted-foreground">Loading...</p></div>;

  const tableInfo = { tableNumber: parseInt(tableId), status: table ? "occupied" : "vacant" };

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col max-w-lg mx-auto">
      <div className="bg-white px-4 pt-3 pb-2 sticky top-0 z-10 border-b">
        <div className="flex items-center gap-2">
          <button className="text-lg" onClick={() => router.push("/waiter-app/table/select")}>←</button>
          <h1 className="text-base font-bold">Table {tableInfo.tableNumber}</h1>
          <Badge variant="outline" className={`text-[10px] ${tableInfo.status === "vacant" ? "text-green-700 border-green-300" : "text-red-700 border-red-300"}`}>
            {tableInfo.status}
          </Badge>
        </div>
      </div>

      {/* Existing Order */}
      {table && (
        <div className="bg-amber-50 mx-2 mt-2 rounded-xl p-3 shadow-sm space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-medium">Order #{table.id.slice(-6).toUpperCase()}</span>
            <Badge variant="outline" className="text-[9px]">{table.status}</Badge>
          </div>
          {table.items.map((i, idx) => (
            <div key={idx} className="flex justify-between text-[11px]">
              <span>{i.name} ×{i.quantity}</span>
              <span>₹{(i.unitPrice * i.quantity).toFixed(2)}</span>
            </div>
          ))}
          <Separator className="my-1" />
          <div className="flex justify-between text-xs font-bold">
            <span>Total</span>
            <span>₹{table.total.toFixed(2)}</span>
          </div>
          <div className="flex gap-2 mt-1.5">
            <Button size="sm" className="text-xs h-8 flex-1" onClick={() => handleBill(table.id)}>🧾 Bill</Button>
          </div>
        </div>
      )}

      {/* Menu Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <Input placeholder="🔍 Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-xs mb-2" autoFocus />
        <div className="grid grid-cols-3 gap-1.5">
          {filtered.map((item) => (
            <button key={item.id} type="button" onClick={() => setCart((prev) => {
              const ex = prev.find((c) => c.item.id === item.id);
              return ex ? prev.map((c) => c === ex ? { ...c, quantity: c.quantity + 1 } : c) : [...prev, { item, quantity: 1 }];
            })}
              className="bg-white rounded-xl p-2.5 text-left shadow-sm border active:scale-95 transition-transform">
              <p className="text-xs font-medium leading-tight">{item.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">₹{item.price.toFixed(2)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Cart */}
      {count > 0 && (
        <div className="bg-white border-t px-4 pt-2 pb-6 space-y-1.5">
          <div className="max-h-24 overflow-y-auto space-y-1">
            {cart.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="truncate flex-1">{c.item.name}</span>
                <div className="flex items-center gap-1 mx-2">
                  <button className="w-6 h-6 rounded-full border text-xs bg-gray-50" onClick={() => setCart((prev) => prev.map((x) => x.item.id === c.item.id ? { ...x, quantity: Math.max(0, x.quantity - 1) } : x).filter((x) => x.quantity > 0))}>−</button>
                  <span className="w-5 text-center font-medium">{c.quantity}</span>
                  <button className="w-6 h-6 rounded-full border text-xs bg-gray-50" onClick={() => setCart((prev) => prev.map((x) => x.item.id === c.item.id ? { ...x, quantity: x.quantity + 1 } : x))}>+</button>
                </div>
                <span className="tabular-nums font-medium w-14 text-right">₹{(c.item.price * c.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-sm"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
          {table ? (
            <Button size="sm" className="w-full text-xs h-10" onClick={() => handleAddItems(table.id)} disabled={saving}>
              {saving ? "..." : `➕ Add to Order (${count})`}
            </Button>
          ) : (
            <Button size="sm" className="w-full text-xs h-10" onClick={handleCreate} disabled={saving}>
              {saving ? "..." : `📋 Create Order (${count})`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
