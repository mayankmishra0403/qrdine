"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getTakeawayData, createTakeawayOrder, addTakeawayItems, requestTakeawayBill, markTakeawayReady, completeTakeaway } from "@/lib/actions/takeaway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

type Variant = { id: string; name: string; priceMod: number };
type MenuItem = { id: string; name: string; price: number; variants: Variant[] };
type Category = { id: string; name: string; items: MenuItem[] };
type CartItem = { item: MenuItem; variant: Variant | null; quantity: number };
type TakeawayOrder = {
  id: string; status: string; total: number; createdAt: string;
  items: Array<{ id: string; name: string; quantity: number; unitPrice: number }>;
  customer: { name: string | null; phone: string } | null;
};

export default function TakeawayPage() {
  const router = useRouter();
  const [data, setData] = useState<{ categories: Category[]; orders: TakeawayOrder[]; restaurant: { name: string } | null } | null>(null);
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string | null>>({});
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [saving, setSaving] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<TakeawayOrder | null>(null);
  const [addMoreCart, setAddMoreCart] = useState<CartItem[]>([]);
  const [billGenerated, setBillGenerated] = useState(false);

  const fetch = useCallback(async () => {
    const r = await getTakeawayData();
    if (r.success) setData(r.data as unknown as typeof data);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); const i = setInterval(fetch, 10000); return () => clearInterval(i); }, [fetch]);

  function addToCart(item: MenuItem) {
    const vid = selectedVariants[item.id] || null;
    const v = vid ? item.variants.find((x) => x.id === vid) || null : null;
    setCart((prev) => {
      const ex = prev.find((c) => c.item.id === item.id && (c.variant?.id || null) === vid);
      return ex ? prev.map((c) => c === ex ? { ...c, quantity: c.quantity + 1 } : c) : [...prev, { item, variant: v, quantity: 1 }];
    });
  }

  function addToAddMore(item: MenuItem) {
    const vid = selectedVariants[item.id] || null;
    const v = vid ? item.variants.find((x) => x.id === vid) || null : null;
    setAddMoreCart((prev) => {
      const ex = prev.find((c) => c.item.id === item.id && (c.variant?.id || null) === vid);
      return ex ? prev.map((c) => c === ex ? { ...c, quantity: c.quantity + 1 } : c) : [...prev, { item, variant: v, quantity: 1 }];
    });
  }

  function updateQty(c: CartItem[], fn: typeof setCart, id: string, vid: string | null, delta: number) {
    fn(c.map((x) => x.item.id === id && (x.variant?.id || null) === vid ? { ...x, quantity: Math.max(0, x.quantity + delta) } : x).filter((x) => x.quantity > 0));
  }

  const cartTotal = cart.reduce((s, c) => s + (c.item.price + (c.variant?.priceMod || 0)) * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  async function handleCreateOrder() {
    const raw = customerPhone.replace(/\D/g, "");
    if (!raw) { toast.error("Enter customer phone number"); return; }
    setSaving(true);
    const items = cart.map((c) => ({ itemId: c.item.id, variantId: c.variant?.id, quantity: c.quantity, unitPrice: c.item.price + (c.variant?.priceMod || 0) }));
    const r = await createTakeawayOrder({ items, customerPhone: raw, customerName: customerName || undefined });
    if (r.success) { toast.success("Takeaway order created!"); setCart([]); setCustomerPhone(""); setCustomerName(""); await fetch(); }
    else toast.error(r.error || "Failed");
    setSaving(false);
  }

  async function handleAddMore() {
    if (!selectedOrder) return;
    setSaving(true);
    const items = addMoreCart.map((c) => ({ itemId: c.item.id, variantId: c.variant?.id, quantity: c.quantity, unitPrice: c.item.price + (c.variant?.priceMod || 0) }));
    const r = await addTakeawayItems(selectedOrder.id, items);
    if (r.success) { toast.success("Items added!"); setAddMoreCart([]); setSelectedOrder(null); await fetch(); }
    else toast.error(r.error || "Failed");
    setSaving(false);
  }

  const filteredCats = (data?.categories || []).filter((cat) => !categoryFilter || cat.id === categoryFilter);

  if (loading) return <div className="text-center py-20 text-muted-foreground">Loading takeaway...</div>;

  const activeOrders = data?.orders || [];

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📦 Takeaway Orders</h1>
        <span className="text-xs text-muted-foreground">{activeOrders.length} active</span>
      </div>

      {/* Active Takeaway Orders */}
      {activeOrders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {activeOrders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold">#TAKE-{order.id.slice(-6).toUpperCase()}</span>
                    <Badge variant="outline" className="text-[9px]">{order.status}</Badge>
                  </div>
                  <span className="text-xs font-bold">₹{order.total.toFixed(2)}</span>
                </div>
                {order.customer && (
                  <p className="text-[10px] text-muted-foreground">
                    📞 {order.customer.phone}{order.customer.name ? ` - ${order.customer.name}` : ""}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">{order.items.length} items</p>
                <div className="flex gap-1.5 pt-1">
                  <Button size="sm" className="text-[10px] h-7 flex-1" onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}>
                    {selectedOrder?.id === order.id ? "Cancel" : "➕ Add"}
                  </Button>
                  {order.status !== "ready" && order.status !== "served" && (
                    <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={async () => {
                      const r = await markTakeawayReady(order.id);
                      if (r.success) { toast.success("Marked ready!"); await fetch(); }
                    }}>✅ Ready</Button>
                  )}
                  <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={async () => {
                    setBillGenerated(false);
                    const r = await requestTakeawayBill(order.id);
                    if (r.success) { setBillGenerated(true); toast.success("Bill sent"); }
                  }}>🧾 Bill</Button>
                  {billGenerated && (
                    <a href={`/admin/bill/${order.id}`} target="_blank"
                      className="inline-flex items-center justify-center rounded bg-foreground text-background text-[10px] h-7 px-2 font-medium hover:opacity-90">
                      🖨️ Print
                    </a>
                  )}
                  {order.status === "ready" && (
                    <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={async () => {
                      await completeTakeaway(order.id);
                      toast.success("Completed");
                      await fetch();
                    }}>✅ Done</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add More Items Panel */}
      {selectedOrder && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <p className="text-xs font-medium">Add items to #TAKE-{selectedOrder.id.slice(-6).toUpperCase()}</p>
            <div className="max-h-48 overflow-y-auto grid grid-cols-4 md:grid-cols-6 gap-1">
              {(data?.categories || []).flatMap((cat) => cat.items).map((item) => (
                <button key={item.id} type="button" onClick={() => addToAddMore(item)}
                  className="rounded border p-1.5 text-left hover:border-foreground text-[10px] bg-white">
                  <p className="font-medium leading-tight truncate">{item.name}</p>
                  <p className="text-muted-foreground">₹{item.price.toFixed(2)}</p>
                </button>
              ))}
            </div>
            {addMoreCart.length > 0 && (
              <div className="space-y-1">
                {addMoreCart.map((c, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>{c.item.name}{c.variant ? ` (${c.variant.name})` : ""} ×{c.quantity}</span>
                    <span>₹{((c.item.price + (c.variant?.priceMod || 0)) * c.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <Button size="sm" className="text-xs w-full h-8" onClick={handleAddMore} disabled={saving}>
                  {saving ? "Adding..." : `Add Items (${addMoreCart.reduce((s, c) => s + c.quantity, 0)})`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* New Order Section */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold">New Takeaway Order</p>

          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Customer phone *" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} className="h-8 text-xs" />
            <Input placeholder="Customer name (optional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-8 text-xs" />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button onClick={() => setCategoryFilter(null)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border ${!categoryFilter ? "bg-foreground text-background border-foreground font-medium" : "bg-white border-muted-foreground/30"}`}>All</button>
            {(data?.categories || []).map((cat) => (
              <button key={cat.id} onClick={() => setCategoryFilter(cat.id)}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-full border ${categoryFilter === cat.id ? "bg-foreground text-background border-foreground font-medium" : "bg-white border-muted-foreground/30"}`}>{cat.name}</button>
            ))}
          </div>

          <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-xs" />

          <div className="max-h-60 overflow-y-auto grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
            {filteredCats.flatMap((cat) => cat.items).filter((i) => search ? i.name.toLowerCase().includes(search.toLowerCase()) : true).map((item) => (
              <button key={item.id} type="button" onClick={() => addToCart(item)}
                className="rounded-lg border p-2 text-left hover:border-foreground transition-colors active:bg-muted bg-white">
                <p className="text-xs font-medium leading-tight truncate">{item.name}</p>
                <p className="text-[10px] text-muted-foreground">₹{item.price.toFixed(2)}</p>
              </button>
            ))}
          </div>

          {cartCount > 0 && (
            <div className="border-t pt-2 space-y-1.5">
              {cart.map((c, i) => {
                const up = c.item.price + (c.variant?.priceMod || 0);
                return (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="truncate flex-1">{c.item.name}{c.variant ? ` (${c.variant.name})` : ""}</span>
                    <div className="flex items-center gap-1 mx-2">
                      <button className="w-5 h-5 rounded border text-[10px]" onClick={() => updateQty(cart, setCart, c.item.id, c.variant?.id || null, -1)}>−</button>
                      <span className="w-4 text-center">{c.quantity}</span>
                      <button className="w-5 h-5 rounded border text-[10px]" onClick={() => updateQty(cart, setCart, c.item.id, c.variant?.id || null, 1)}>+</button>
                    </div>
                    <span className="tabular-nums font-medium w-14 text-right">₹{(up * c.quantity).toFixed(2)}</span>
                  </div>
                );
              })}
              <Separator />
              <div className="flex items-center justify-between font-bold text-sm">
                <span>Total</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>
              <Button size="sm" className="w-full text-xs h-9" onClick={handleCreateOrder} disabled={saving || cartCount === 0 || !customerPhone}>
                {saving ? "Creating..." : `Create Takeaway Order (${cartCount} items)`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
