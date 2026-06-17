"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getWaiterData, createWaiterOrder, addItemsToOrder, requestBill } from "@/lib/actions/waiter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type Variant = { id: string; name: string; priceMod: number };
type MenuItem = { id: string; name: string; price: number; variants: Variant[] };
type Category = { id: string; name: string; items: MenuItem[] };
type OrderItemData = { id: string; name: string; quantity: number; unitPrice: number };
type Order = { id: string; status: string; tableNumber: number; items: OrderItemData[]; total: number; createdAt: string };
type Table = { id: string; tableNumber: number; status: string; room?: { name: string } | null };

type WaiterData = { tables: Table[]; categories: Category[]; orders: Order[]; restaurant: { name: string; currency: string } | null };

type CartItem = { item: MenuItem; variant: Variant | null; quantity: number };

export default function WaiterTablePage() {
  const params = useParams();
  const router = useRouter();
  const tableId = params.tableId as string;

  const [data, setData] = useState<WaiterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string | null>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [addingItems, setAddingItems] = useState(false);
  const [showAddItems, setShowAddItems] = useState(false);
  const [addItemCart, setAddItemCart] = useState<CartItem[]>([]);
  const [billGenerated, setBillGenerated] = useState(false);

  const fetch = useCallback(async () => {
    const r = await getWaiterData();
    if (r.success) setData(r.data as unknown as WaiterData);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const table = data?.tables.find((t) => t.id === tableId);
  const existingOrder = data?.orders.find((o) => o.tableNumber === table?.tableNumber);
  const categories = data?.categories || [];

  function addToCart(item: MenuItem) {
    const vid = selectedVariants[item.id] || null;
    const v = vid ? item.variants.find((x) => x.id === vid) || null : null;
    setCart((prev) => {
      const ex = prev.find((c) => c.item.id === item.id && (c.variant?.id || null) === vid);
      return ex ? prev.map((c) => c === ex ? { ...c, quantity: c.quantity + 1 } : c) : [...prev, { item, variant: v, quantity: 1 }];
    });
  }

  function updateQty(id: string, vid: string | null, delta: number) {
    setCart((prev) => prev.map((c) => c.item.id === id && (c.variant?.id || null) === vid ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter((c) => c.quantity > 0));
  }

  function addToAddCart(item: MenuItem) {
    const vid = selectedVariants[item.id] || null;
    const v = vid ? item.variants.find((x) => x.id === vid) || null : null;
    setAddItemCart((prev) => {
      const ex = prev.find((c) => c.item.id === item.id && (c.variant?.id || null) === vid);
      return ex ? prev.map((c) => c === ex ? { ...c, quantity: c.quantity + 1 } : c) : [...prev, { item, variant: v, quantity: 1 }];
    });
  }

  function updateAddQty(id: string, vid: string | null, delta: number) {
    setAddItemCart((prev) => prev.map((c) => c.item.id === id && (c.variant?.id || null) === vid ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter((c) => c.quantity > 0));
  }

  const cartTotal = cart.reduce((s, c) => s + (c.item.price + (c.variant?.priceMod || 0)) * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const addItemTotal = addItemCart.reduce((s, c) => s + (c.item.price + (c.variant?.priceMod || 0)) * c.quantity, 0);
  const addItemCount = addItemCart.reduce((s, c) => s + c.quantity, 0);

  async function handleCreateOrder() {
    setSaving(true);
    const items = cart.map((c) => ({ itemId: c.item.id, variantId: c.variant?.id, quantity: c.quantity, unitPrice: c.item.price + (c.variant?.priceMod || 0) }));
    const r = await createWaiterOrder({ tableId, items, customerPhone: customerPhone || undefined });
    if (r.success) { toast.success("Order created!"); setCart([]); await fetch(); }
    else toast.error(r.error || "Failed");
    setSaving(false);
  }

  async function handleAddItems() {
    setSaving(true);
    if (!existingOrder) return;
    const items = addItemCart.map((c) => ({ itemId: c.item.id, variantId: c.variant?.id, quantity: c.quantity, unitPrice: c.item.price + (c.variant?.priceMod || 0) }));
    const r = await addItemsToOrder(existingOrder.id, items);
    if (r.success) { toast.success("Items added!"); setAddItemCart([]); setShowAddItems(false); await fetch(); }
    else toast.error(r.error || "Failed");
    setSaving(false);
  }

  async function handleRequestBill() {
    if (!existingOrder) return;
    const r = await requestBill(existingOrder.id);
    if (r.success) { setBillGenerated(true); toast.success("Bill sent to customer"); }
    else toast.error(r.error || "Failed");
  }

  const filteredCats = categories.filter((cat) => !categoryFilter || cat.id === categoryFilter).filter((cat) => search ? cat.items.some((i) => i.name.toLowerCase().includes(search.toLowerCase())) : true);

  if (loading) return <div className="text-center py-20 text-muted-foreground">Loading...</div>;
  if (!table) return <div className="text-center py-20">Table not found <Button variant="outline" size="sm" onClick={() => router.push("/waiter")}>Back</Button></div>;

  return (
    <div className="p-3 max-w-2xl mx-auto space-y-3 pb-36">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/waiter")}>←</Button>
        <h1 className="text-lg font-bold">Table {table.tableNumber}</h1>
        <Badge variant="outline" className={`text-[10px] ${table.status === "vacant" ? "text-green-700 border-green-300" : "text-red-700 border-red-300"}`}>{table.status}</Badge>
        {table.room && <span className="text-xs text-muted-foreground">{table.room.name}</span>}
      </div>

      {existingOrder && (
        <div className="rounded-lg border p-3 bg-amber-50 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium">Active Order</p>
            <Badge className="text-[9px]">{existingOrder.status}</Badge>
          </div>
          {existingOrder.items.map((i) => (
            <p key={i.id} className="text-xs flex justify-between">
              <span>{i.name} ×{i.quantity}</span>
              <span className="tabular-nums">₹{(i.unitPrice * i.quantity).toFixed(2)}</span>
            </p>
          ))}
          <Separator className="my-1" />
          <div className="flex justify-between text-xs font-bold">
            <span>Total</span>
            <span>₹{existingOrder.total.toFixed(2)}</span>
          </div>
          <div className="flex gap-2 mt-2">
            {!billGenerated ? (
              <>
                <Button size="sm" className="text-xs h-7 flex-1" onClick={() => setShowAddItems(!showAddItems)}>
                  {showAddItems ? "Cancel" : "➕ Add Items"}
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-7 flex-1" onClick={handleRequestBill}>
                  🧾 Request Bill
                </Button>
              </>
            ) : (
              <>
                <a href={`/admin/bill/${existingOrder.id}`} target="_blank"
                  className="flex-1 flex items-center justify-center rounded-lg bg-foreground text-background text-xs h-9 font-medium hover:opacity-90">
                  🖨️ Print Bill
                </a>
                <a href={`/admin/bill/${existingOrder.id}`} target="_blank"
                  className="flex-1 flex items-center justify-center rounded-lg border border-muted-foreground/30 text-xs h-9 font-medium hover:bg-muted">
                  💾 Save PDF
                </a>
              </>
            )}
          </div>
        </div>
      )}

      {!existingOrder && (
        <div className="flex gap-2">
          <Input placeholder="Customer phone (optional)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} className="h-8 text-xs flex-1" />
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setCategoryFilter(null)}
          className={`shrink-0 text-xs px-3 py-1.5 rounded-full border ${!categoryFilter ? "bg-foreground text-background border-foreground font-medium" : "bg-white border-muted-foreground/30"}`}>All</button>
        {categories.map((cat) => (
          <button key={cat.id} onClick={() => setCategoryFilter(cat.id)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border ${categoryFilter === cat.id ? "bg-foreground text-background border-foreground font-medium" : "bg-white border-muted-foreground/30"}`}>{cat.name}</button>
        ))}
      </div>

      <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-xs" />

      <div className="grid grid-cols-2 gap-1.5">
        {filteredCats.map((cat) => cat.items.filter((i) => search ? i.name.toLowerCase().includes(search.toLowerCase()) : true).map((item) => (
          <button key={item.id} type="button" onClick={() => (showAddItems && existingOrder ? addToAddCart : addToCart)(item)}
            className="rounded-lg border p-2 text-left hover:border-foreground transition-colors active:bg-muted bg-white">
            <p className="text-xs font-medium leading-tight">{item.name}</p>
            <p className="text-[10px] text-muted-foreground">₹{item.price.toFixed(2)}</p>
            {item.variants.length > 0 && (
              <div className="flex flex-wrap gap-0.5 mt-1">
                {item.variants.map((v) => (
                  <button key={v.id} type="button" onClick={(e) => { e.stopPropagation(); setSelectedVariants((p) => ({ ...p, [item.id]: p[item.id] === v.id ? null : v.id })); }}
                    className={`text-[8px] px-1 py-0.5 rounded border ${selectedVariants[item.id] === v.id ? "bg-foreground text-background border-foreground" : "bg-white"}`}>
                    {v.name}{v.priceMod > 0 ? ` +${v.priceMod}` : ""}
                  </button>
                ))}
              </div>
            )}
          </button>
        )))}
      </div>

      {/* New Order Cart */}
      {!existingOrder && cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-3 pb-6 shadow-lg">
          <div className="max-w-2xl mx-auto space-y-1.5">
            {cart.map((c, i) => {
              const up = c.item.price + (c.variant?.priceMod || 0);
              return (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="truncate flex-1">{c.item.name}{c.variant ? ` (${c.variant.name})` : ""}</span>
                  <div className="flex items-center gap-1 mx-2">
                    <button className="w-6 h-6 rounded border text-xs" onClick={() => updateQty(c.item.id, c.variant?.id || null, -1)}>−</button>
                    <span className="w-5 text-center">{c.quantity}</span>
                    <button className="w-6 h-6 rounded border text-xs" onClick={() => updateQty(c.item.id, c.variant?.id || null, 1)}>+</button>
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
            <Button size="sm" className="w-full text-xs h-9" onClick={handleCreateOrder} disabled={saving || cartCount === 0}>
              {saving ? "Creating..." : `Create Order (${cartCount} items)`}
            </Button>
          </div>
        </div>
      )}

      {/* Add Items Cart */}
      {showAddItems && existingOrder && addItemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-3 pb-6 shadow-lg">
          <div className="max-w-2xl mx-auto space-y-1.5">
            {addItemCart.map((c, i) => {
              const up = c.item.price + (c.variant?.priceMod || 0);
              return (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="truncate flex-1">{c.item.name}{c.variant ? ` (${c.variant.name})` : ""}</span>
                  <div className="flex items-center gap-1 mx-2">
                    <button className="w-6 h-6 rounded border text-xs" onClick={() => updateAddQty(c.item.id, c.variant?.id || null, -1)}>−</button>
                    <span className="w-5 text-center">{c.quantity}</span>
                    <button className="w-6 h-6 rounded border text-xs" onClick={() => updateAddQty(c.item.id, c.variant?.id || null, 1)}>+</button>
                  </div>
                  <span className="tabular-nums font-medium w-14 text-right">₹{(up * c.quantity).toFixed(2)}</span>
                </div>
              );
            })}
            <Separator />
            <div className="flex items-center justify-between font-bold text-sm">
              <span>Additional</span>
              <span>₹{addItemTotal.toFixed(2)}</span>
            </div>
            <Button size="sm" className="w-full text-xs h-9" onClick={handleAddItems} disabled={saving || addItemCount === 0}>
              {saving ? "Adding..." : `Add to Order (${addItemCount} items)`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
