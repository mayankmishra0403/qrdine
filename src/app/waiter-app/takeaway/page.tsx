"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getWaiterAppData, createWaiterAppOrder } from "@/lib/actions/waiter-app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type Variant = { id: string; name: string; priceMod: number };
type MenuItem = { id: string; name: string; price: number; variants: Variant[] };
type CartItem = { item: MenuItem; variant: Variant | null; quantity: number };

export default function TakeawayFlow() {
  const router = useRouter();
  const [categories, setCategories] = useState<Array<{ id: string; name: string; items: MenuItem[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [billMode, setBillMode] = useState(false);

  const fetch = useCallback(async () => {
    const r = await getWaiterAppData();
    if (r.success) {
      const d = r.data as unknown as { categories: Array<{ id: string; name: string; items: MenuItem[] }> };
      setCategories(d.categories);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const ex = prev.find((c) => c.item.id === item.id && !c.variant);
      return ex ? prev.map((c) => c === ex ? { ...c, quantity: c.quantity + 1 } : c) : [...prev, { item, variant: null, quantity: 1 }];
    });
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) => prev.map((c) => c.item.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter((c) => c.quantity > 0));
  }

  const total = cart.reduce((s, c) => s + (c.item.price + (c.variant?.priceMod || 0)) * c.quantity, 0);
  const count = cart.reduce((s, c) => s + c.quantity, 0);

  const allItems = categories.flatMap((cat) => cat.items);
  const filtered = search ? allItems.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())) : allItems;

  async function handleCreate(instantBill: boolean) {
    if (count === 0) { toast.error("Add items first"); return; }
    setSaving(true);
    setBillMode(instantBill);
    const items = cart.map((c) => ({ itemId: c.item.id, variantId: c.variant?.id, quantity: c.quantity, unitPrice: c.item.price }));
    const r = await createWaiterAppOrder({
      type: "takeaway", customerPhone: phone || undefined, customerName: name || undefined,
      items, instantBill,
    });
    if (r.success && r.data) {
      toast.success(instantBill ? "Order + Bill sent!" : "Order created!");
      setCart([]);
      if (!instantBill) router.push("/waiter-app/orders");
      else router.push(`/waiter-app/bill/${(r.data as { id: string }).id}`);
    } else toast.error(r.error || "Failed");
    setSaving(false);
  }

  if (loading) return <div className="flex items-center justify-center min-h-dvh bg-gray-50"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-white px-4 pt-3 pb-2 sticky top-0 z-10 border-b">
        <div className="flex items-center gap-2 mb-2">
          <button className="text-lg" onClick={() => router.push("/waiter-app")}>←</button>
          <h1 className="text-base font-bold">📦 Takeaway</h1>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} className="h-8 text-xs" />
          <Input placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs" />
        </div>
        <Input placeholder="🔍 Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-xs mt-1.5" autoFocus />
      </div>

      {/* Item Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-3 gap-1.5">
          {filtered.map((item) => (
            <button key={item.id} type="button" onClick={() => addToCart(item)}
              className="bg-white rounded-xl p-2.5 text-left shadow-sm border active:scale-95 transition-transform">
              <p className="text-xs font-medium leading-tight">{item.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">₹{item.price.toFixed(2)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Cart */}
      {count > 0 && (
        <div className="bg-white border-t px-4 pt-2 pb-6 space-y-1.5">
          <div className="max-h-28 overflow-y-auto space-y-1">
            {cart.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="truncate flex-1">{c.item.name}</span>
                <div className="flex items-center gap-1 mx-2">
                  <button className="w-6 h-6 rounded-full border text-xs bg-gray-50" onClick={() => updateQty(c.item.id, -1)}>−</button>
                  <span className="w-5 text-center font-medium">{c.quantity}</span>
                  <button className="w-6 h-6 rounded-full border text-xs bg-gray-50" onClick={() => updateQty(c.item.id, 1)}>+</button>
                </div>
                <span className="tabular-nums font-medium w-14 text-right">₹{((c.item.price) * c.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <Separator />
          <div className="flex items-center justify-between font-bold text-sm">
            <span>Total</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" className="text-xs h-10" onClick={() => handleCreate(false)} disabled={saving}>
              {saving && !billMode ? "..." : "📋 Create Order"}
            </Button>
            <Button size="sm" className="text-xs h-10 bg-green-600 hover:bg-green-700" onClick={() => handleCreate(true)} disabled={saving}>
              {saving && billMode ? "..." : "🧾 Create & Bill"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
