"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { placeOrder } from "@/lib/actions/orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

type Variant = { id: string; name: string; priceMod: number };
type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  variants: Variant[];
};
type Category = { id: string; name: string; menuItems: MenuItem[] };

type CartItem = {
  item: MenuItem;
  variant: Variant | null;
  quantity: number;
};

type OrderItemData = {
  id: string;
  quantity: number;
  unitPrice: number;
  item: { id: string; name: string };
  variant: { id: string; name: string } | null;
};

type ActiveOrder = {
  id: string;
  status: string;
  total: number;
  items: OrderItemData[];
};

const statusLabels: Record<string, string> = {
  pending: "Order Placed",
  confirmed: "Confirmed",
  preparing: "Being Prepared",
  ready: "Ready to Serve",
  served: "Served",
  cancelled: "Cancelled",
};

const statusSteps = ["pending", "confirmed", "preparing", "ready", "served"];

export function MenuContent({
  restaurantName,
  tableNumber,
  categories,
  tableStatus,
  activeOrder,
}: {
  restaurantName: string;
  tableNumber: number;
  categories: Category[];
  tableStatus: string;
  activeOrder: ActiveOrder | null;
}) {
  const params = useParams();
  const tableId = params.tableId as string;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string | null>>({});
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const [order, setOrder] = useState<ActiveOrder | null>(activeOrder);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [phone, setPhone] = useState("");
  const [showPhone, setShowPhone] = useState(!activeOrder);

  const [currentStatus, setCurrentStatus] = useState<string | null>(activeOrder?.status || null);

  const fetchOrderStatus = useCallback(async () => {
    if (!order) return;
    try {
      const res = await fetch(`/api/orders/${order.id}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentStatus(data.status);
        if (data.items) {
          setOrder((prev) => prev ? { ...prev, items: data.items, status: data.status } : prev);
        }
      }
    } catch {}
  }, [order]);

  useEffect(() => {
    if (!order) return;
    fetchOrderStatus();
    const interval = setInterval(fetchOrderStatus, 5000);
    return () => clearInterval(interval);
  }, [order, fetchOrderStatus]);

  function addToCart(item: MenuItem) {
    const variantId = selectedVariants[item.id] || null;
    const variant = variantId ? item.variants.find((v) => v.id === variantId) || null : null;

    setCart((prev) => {
      const existing = prev.find(
        (c) => c.item.id === item.id && (c.variant?.id || null) === variantId
      );
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id && (c.variant?.id || null) === variantId
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }
      return [...prev, { item, variant, quantity: 1 }];
    });
  }

  function updateQuantity(itemId: string, variantId: string | null, delta: number) {
    setCart((prev) =>
      prev
        .map((c) =>
          c.item.id === itemId && (c.variant?.id || null) === variantId
            ? { ...c, quantity: Math.max(0, c.quantity + delta) }
            : c
        )
        .filter((c) => c.quantity > 0)
    );
  }

  async function handlePlaceOrder() {
    const raw = phone.replace(/\D/g, "");
    if (!raw) {
      setOrderError("Enter your WhatsApp number to receive order updates");
      return;
    }
    setPlacing(true);
    setOrderError(null);

    const fullPhone = "91" + raw;
    const items = cart.map((c) => ({
      itemId: c.item.id,
      variantId: c.variant?.id,
      quantity: c.quantity,
      unitPrice: c.item.price + (c.variant?.priceMod || 0),
    }));

    const result = await placeOrder(tableId, items, notes || "", fullPhone);
    if (result.success) {
      setOrder({ id: result.id!, status: result.status!, total: result.total!, items: result.items || [] });
      setCurrentStatus(result.status!);
      setCart([]);
      setNotes("");
      if (result.whatsappSent === false) {
        setOrderError("Order placed! WhatsApp message could not be sent — check that the number is registered on WhatsApp.");
      }
    } else {
      setOrderError(result.error || null);
    }
    setPlacing(false);
  }

  function startNewOrder() {
    setOrder(null);
    setCurrentStatus(null);
    setShowNotes(false);
    setShowPhone(true);
  }

  const total = cart.reduce((sum, c) => sum + (c.item.price + (c.variant?.priceMod || 0)) * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const filteredCategories = categoryFilter
    ? categories.filter((c) => c.id === categoryFilter)
    : categories;

  if (order && currentStatus !== "served" && currentStatus !== "cancelled") {
    const statusIndex = statusSteps.indexOf(currentStatus || order.status);
    return (
      <main className="max-w-lg mx-auto px-4 py-8 space-y-6 text-center min-h-dvh flex flex-col justify-center">
        <div>
          <h1 className="text-2xl font-bold">{restaurantName}</h1>
          <p className="text-sm text-muted-foreground">Table {tableNumber}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          Table is currently occupied — an order is in progress
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">
            {currentStatus ? statusLabels[currentStatus] || currentStatus : "Order Placed"}
          </h2>

          <div className="flex justify-center">
            <div className="flex items-center gap-1.5">
              {statusSteps.slice(0, -1).map((step, i) => {
                const isActive = i <= (statusIndex >= 0 ? statusIndex : 0);
                const isCurrent = i === statusIndex;
                return (
                  <div key={step} className="flex items-center">
                    <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"
                    } ${isCurrent ? "ring-2 ring-green-500 ring-offset-2" : ""}`}>
                      {i + 1}
                    </div>
                    {i < statusSteps.length - 2 && (
                      <div className={`w-8 sm:w-12 h-0.5 ${isActive ? "bg-green-500" : "bg-gray-200"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between text-[10px] text-muted-foreground max-w-xs mx-auto px-1">
            {statusSteps.slice(0, -1).map((step, i) => (
              <span key={step} className={i <= (statusIndex >= 0 ? statusIndex : 0) ? "text-green-600 font-medium" : ""}>
                {statusLabels[step]}
              </span>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">Order #{order.id.slice(-6).toUpperCase()}</p>
        </div>

        {order.items.length > 0 && (
          <div className="text-left max-w-sm mx-auto w-full">
            <Separator className="mb-3" />
            <div className="space-y-2">
              {order.items.map((i) => (
                <div key={i.id} className="flex items-center justify-between text-sm gap-2">
                  <span className="flex-1 truncate">
                    {i.item.name}{i.variant ? ` (${i.variant.name})` : ""}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-muted-foreground">×{i.quantity}</span>
                    <span className="w-14 text-right font-medium tabular-nums">₹{(i.unitPrice * i.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            <Separator className="mt-2 mb-2" />
            <div className="flex justify-between font-bold text-sm">
              <span>Total</span>
              <span className="tabular-nums">₹{order.total.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            type="button"
            className="px-6 py-2 rounded-lg border border-muted-foreground/30 text-sm active:bg-muted"
            onClick={startNewOrder}
          >
            Place Another Order
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-4 pb-36 pt-0 space-y-0">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-40 pt-4 pb-3 -mx-4 px-4 mb-4 border-b">
        <div className="text-center">
          <h1 className="text-xl font-bold">{restaurantName}</h1>
          <p className="text-xs text-muted-foreground">Table {tableNumber}</p>
          {tableStatus === "occupied" && activeOrder && (
            <p className="text-xs text-amber-600 font-medium mt-1">
              Table occupied · #{activeOrder.id.slice(-6).toUpperCase()}
            </p>
          )}
          {tableStatus === "vacant" && (
            <p className="text-xs text-green-600 font-medium mt-1">Table vacant — place your order</p>
          )}
        </div>
      </div>

      {categories.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none snap-x">
          <button
            type="button"
            className={`shrink-0 snap-start text-sm px-3 py-1.5 rounded-full border transition-colors ${
              categoryFilter === null ? "bg-foreground text-background border-foreground font-medium" : "bg-background border-muted-foreground/30"
            }`}
            onClick={() => setCategoryFilter(null)}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`shrink-0 snap-start text-sm px-3 py-1.5 rounded-full border transition-colors ${
                categoryFilter === cat.id ? "bg-foreground text-background border-foreground font-medium" : "bg-background border-muted-foreground/30"
              }`}
              onClick={() => setCategoryFilter(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {filteredCategories.map((category) => (
        <section key={category.id}>
          <h2 className="text-lg font-semibold mb-3">{category.name}</h2>
          <div className="space-y-3">
            {category.menuItems.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{item.name}</CardTitle>
                      {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
                    </div>
                    <span className="text-sm font-medium shrink-0 ml-2">₹{item.price.toFixed(2)}</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {item.variants.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.variants.map((variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() =>
                            setSelectedVariants((prev) => ({
                              ...prev,
                              [item.id]: prev[item.id] === variant.id ? null : variant.id,
                            }))
                          }
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            selectedVariants[item.id] === variant.id
                              ? "bg-foreground text-background border-foreground"
                              : "bg-background hover:bg-muted"
                          }`}
                        >
                          {variant.name}
                          {variant.priceMod > 0 && ` +₹${variant.priceMod.toFixed(2)}`}
                        </button>
                      ))}
                    </div>
                  )}
                  <Button size="sm" className="w-full" onClick={() => addToCart(item)}>
                    Add to Order
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}

      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur-sm p-3 pb-5 shadow-lg z-50">
          <div className="max-w-lg mx-auto">
            <div className="space-y-1.5 mb-2 max-h-44 overflow-y-auto -mx-1 px-1">
              {cart.map((c, i) => {
                const unitPrice = c.item.price + (c.variant?.priceMod || 0);
                return (
                  <div key={i} className="flex items-center justify-between text-sm gap-2">
                    <span className="truncate text-xs flex-1 min-w-0">
                      {c.item.name}{c.variant ? ` (${c.variant.name})` : ""}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" className="w-7 h-7 rounded-md border text-sm leading-none active:bg-muted"
                        onClick={() => updateQuantity(c.item.id, c.variant?.id || null, -1)}>
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{c.quantity}</span>
                      <button type="button" className="w-7 h-7 rounded-md border text-sm leading-none active:bg-muted"
                        onClick={() => updateQuantity(c.item.id, c.variant?.id || null, 1)}>
                        +
                      </button>
                      <span className="w-14 text-right text-xs font-medium tabular-nums">₹{(unitPrice * c.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {showPhone && (
              <div className="relative mb-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none z-10">+91</span>
                <Input type="tel" placeholder="9876543210" value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/^(\+?91)?/, "").replace(/\D/g, "").slice(0, 10))}
                  className="pl-11 h-10 text-sm" />
              </div>
            )}

            {showNotes && (
              <Input placeholder="Special requests..." value={notes}
                onChange={(e) => setNotes(e.target.value)} className="mb-2 h-10 text-sm" />
            )}

            <Separator className="mb-2" />
            <div className="flex items-center justify-between font-bold text-base mb-2">
              <span>Total</span>
              <span className="tabular-nums">₹{total.toFixed(2)}</span>
            </div>
            <div className="flex gap-2">
              <button type="button" className="shrink-0 text-xs px-3 py-2 rounded-lg border border-muted-foreground/30 active:bg-muted"
                onClick={() => setShowNotes(!showNotes)}>
                {showNotes ? "Done" : "Note"}
              </button>
              <button type="button"
                className="flex-1 py-2.5 rounded-lg bg-foreground text-background font-medium text-sm active:opacity-90 disabled:opacity-50"
                disabled={placing} onClick={handlePlaceOrder}>
                {placing ? "Placing..." : `Place Order (${cartCount})`}
              </button>
            </div>
            {orderError && <p className="text-xs text-red-600 mt-1.5">{orderError}</p>}
          </div>
        </div>
      )}
    </main>
  );
}
