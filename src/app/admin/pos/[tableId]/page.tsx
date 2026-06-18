"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPosData, createPosOrder, processPayment, updateOrderTotals } from "@/lib/actions/pos";
import { getLoyaltySettings, getCustomerLoyalty, redeemLoyaltyPoints } from "@/lib/actions/loyalty";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

type Table = { id: string; tableNumber: number; capacity: number; status: string };
type Variant = { id: string; name: string; priceMod: number };
type MenuItem = { id: string; name: string; price: number; variants: Variant[] };
type Category = { id: string; name: string; items: MenuItem[] };
type OrderItemData = {
  id: string;
  quantity: number;
  unitPrice: number;
  item: { id: string; name: string };
  variant?: { id: string; name: string } | null;
};
type OrderData = {
  id: string;
  status: string;
  subtotal: number;
  total: number;
  taxAmount: number;
  discount: number;
  discountType?: string;
  serviceCharge: number;
  type: string;
  tableId: string;
  items: OrderItemData[];
  customer?: { name?: string; phone: string } | null;
};

type CartItem = {
  item: MenuItem;
  variant: Variant | null;
  quantity: number;
};

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash", icon: "💵" },
  { id: "upi", label: "UPI", icon: "📱" },
  { id: "card", label: "Card", icon: "💳" },
  { id: "split", label: "Split", icon: "🔀" },
];

export default function PosBillingPage() {
  const params = useParams();
  const router = useRouter();
  const tableId = params.tableId as string;

  const [data, setData] = useState<{
    tables: Table[];
    categories: Category[];
    orders: OrderData[];
    restaurant: { currency: string; taxRate: number; serviceCharge: number } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string | null>>({});

  const [orderType, setOrderType] = useState<string>("dine-in");
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">("fixed");
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paymentRef, setPaymentRef] = useState("");
  const [paidOrderId, setPaidOrderId] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState("");
  const [processing, setProcessing] = useState(false);

  const existingOrder = data?.orders?.find((o) => o.tableId === tableId && o.status !== "served" && o.status !== "cancelled");
  const table = data?.tables?.find((t) => t.id === tableId);

  const [loyaltyInfo, setLoyaltyInfo] = useState<{
    tier: string; tierLabel: string; tierColor: string;
    pointsEarned: number; pointsRedeemed: number; pointsAvailable: number;
    tierMultiplier: number;
    nextTier: { label: string; pointsNeeded: number } | null;
  } | null>(null);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [showRedeem, setShowRedeem] = useState(false);

  const fetchData = useCallback(async () => {
    const result = await getPosData();
    if (result.success) {
      setData(result.data as unknown as typeof data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const restaurant = data?.restaurant;

  useEffect(() => {
    if (existingOrder?.customer?.phone) {
      getLoyaltySettings().then((r) => {
        if (r.success && r.data) setLoyaltyEnabled(r.data.loyaltyEnabled);
      });
      getCustomerLoyalty(existingOrder.customer.phone).then((r) => {
        if (r) setLoyaltyInfo(r as unknown as typeof loyaltyInfo);
      });
    } else {
      setLoyaltyInfo(null);
    }
  }, [existingOrder?.customer?.phone]);

  async function handleRedeem() {
    if (!existingOrder?.customer?.phone || !existingOrder.id || redeemPoints <= 0) return;
    setProcessing(true);
    const r = await redeemLoyaltyPoints({
      orderId: existingOrder.id,
      customerId: existingOrder.customer.phone,
      points: redeemPoints,
    });
    if (r.success) {
      toast.success(`₹${Number(r.discount).toFixed(2)} discount applied via loyalty!`);
      setShowRedeem(false);
      setRedeemPoints(0);
      await fetchData();
      const info = await getCustomerLoyalty(existingOrder.customer.phone);
      if (info) setLoyaltyInfo(info as unknown as typeof loyaltyInfo);
    } else {
      toast.error(r.error || "Redemption failed");
    }
    setProcessing(false);
  }

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

  function updateQty(itemId: string, variantId: string | null, delta: number) {
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

  const cartTotal = cart.reduce((s, c) => s + (c.item.price + (c.variant?.priceMod || 0)) * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const taxRate = restaurant?.taxRate || 0;
  const serviceChargeRate = restaurant?.serviceCharge || 0;
  const discountAmount = discountType === "percentage" ? cartTotal * (discount / 100) : discount;
  const afterDiscount = cartTotal - discountAmount;
  const taxAmount = afterDiscount * (taxRate / 100);
  const chargeAmount = afterDiscount * (serviceChargeRate / 100);
  const grandTotal = afterDiscount + taxAmount + chargeAmount;

  async function handlePlaceOrder() {
    setProcessing(true);
    const items = cart.map((c) => ({
      itemId: c.item.id,
      variantId: c.variant?.id,
      quantity: c.quantity,
      unitPrice: c.item.price + (c.variant?.priceMod || 0),
    }));

    const result = await createPosOrder({ tableId, items, orderType, customerPhone: customerPhone || undefined });
    if (result.success) {
      toast.success("Order created");
      setCart([]);
      setCustomerPhone("");
      setDiscount(0);
      await fetchData();
    } else {
      toast.error(result.error || "Failed");
    }
    setProcessing(false);
  }

  async function handleUpdateTotals() {
    if (!existingOrder) return;
    setProcessing(true);
    const result = await updateOrderTotals({
      orderId: existingOrder.id,
      discount,
      discountType,
      taxRate,
      serviceCharge: serviceChargeRate,
    });
    if (result.success) {
      toast.success("Updated");
      await fetchData();
    } else {
      toast.error(result.error || "Failed");
    }
    setProcessing(false);
  }

  async function handlePayment() {
    if (!existingOrder || !paymentMethod) return;
    setProcessing(true);
    const result = await processPayment({
      orderId: existingOrder.id,
      method: paymentMethod,
      amount: Number(existingOrder.total),
      reference: paymentRef || undefined,
      customerPhone: customerPhone || undefined,
    });
    if (result.success) {
      toast.success(`Payment complete via ${paymentMethod.toUpperCase()}`);
      setPaidOrderId(existingOrder.id);
      setShowPayment(false);
      setCustomerPhone("");
      setPaymentMethod("");
      setPaymentRef("");
    } else {
      toast.error(result.error || "Payment failed");
    }
    setProcessing(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }

  if (!table) {
    return (
      <div className="text-center py-20">
        <p className="text-lg">Table not found</p>
        <Button variant="outline" onClick={() => router.push("/admin/pos")}>Back to POS</Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0 mb-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/pos")}>← Back</Button>
          <h1 className="text-xl font-bold">Table {table.tableNumber}</h1>
          <Badge>{table.status}</Badge>
          {!existingOrder && (
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              className="text-xs border rounded px-2 py-1"
            >
              <option value="dine-in">Dine-in</option>
              <option value="takeaway">Takeaway</option>
              <option value="delivery">Delivery</option>
            </select>
          )}
          {existingOrder && (
            <Badge variant="outline" className="text-xs">
              {existingOrder.type || "dine-in"}
            </Badge>
          )}
          {existingOrder && (
            <Badge variant="outline" className="text-xs">
              Order #{existingOrder.id.slice(-6).toUpperCase()}
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>Refresh</Button>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-2 shrink-0">
            <Input
              placeholder="Search items..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className="h-9 text-sm flex-1"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-2 shrink-0 snap-x">
            <button
              type="button"
              className={`shrink-0 snap-start text-xs px-3 py-1.5 rounded-full border ${
                categoryFilter === null
                  ? "bg-foreground text-background border-foreground font-medium"
                  : "bg-background border-muted-foreground/30"
              }`}
              onClick={() => setCategoryFilter(null)}
            >
              All
            </button>
            {(data?.categories || []).map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`shrink-0 snap-start text-xs px-3 py-1.5 rounded-full border ${
                  categoryFilter === cat.id
                    ? "bg-foreground text-background border-foreground font-medium"
                    : "bg-background border-muted-foreground/30"
                }`}
                onClick={() => setCategoryFilter(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {(data?.categories || [])
              .filter((cat) => !categoryFilter || cat.id === categoryFilter)
              .filter((cat) =>
                itemSearch
                  ? cat.items.some((i) => i.name.toLowerCase().includes(itemSearch.toLowerCase()))
                  : true
              )
              .map((cat) => (
                <div key={cat.id}>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 sticky top-0 bg-background py-1">
                    {cat.name}
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5">
                    {cat.items
                      .filter((i) =>
                        itemSearch
                          ? i.name.toLowerCase().includes(itemSearch.toLowerCase())
                          : true
                      )
                      .map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => addToCart(item)}
                          className="rounded-lg border p-2 text-left hover:border-foreground transition-colors active:bg-muted"
                        >
                          <p className="text-xs font-medium leading-tight">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground">₹{item.price.toFixed(2)}</p>
                          {item.variants.length > 0 && (
                            <div className="flex flex-wrap gap-0.5 mt-1">
                              {item.variants.map((v) => (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedVariants((prev) => ({
                                      ...prev,
                                      [item.id]: prev[item.id] === v.id ? null : v.id,
                                    }));
                                  }}
                                  className={`text-[9px] px-1 py-0.5 rounded border ${
                                    selectedVariants[item.id] === v.id
                                      ? "bg-foreground text-background border-foreground"
                                      : "bg-background"
                                  }`}
                                >
                                  {v.name}
                                  {v.priceMod > 0 && ` +${v.priceMod}`}
                                </button>
                              ))}
                            </div>
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="w-80 shrink-0 flex flex-col border-l pl-4">
          <h3 className="text-sm font-semibold mb-2">Current Bill</h3>

          {(!existingOrder || !existingOrder.customer?.phone) && (
            <div className="mb-2">
              <Label className="text-[10px] text-muted-foreground">Customer Phone (for loyalty)</Label>
              <Input
                type="tel"
                placeholder="e.g. 919876543210"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="h-8 text-xs mt-0.5"
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-1 mb-3">
            {existingOrder ? (
              existingOrder.items.map((oi) => (
                <div key={oi.id} className="flex items-center justify-between text-xs py-1">
                  <span className="truncate flex-1">
                    {oi.item.name}
                    {oi.variant ? ` (${oi.variant.name})` : ""}
                  </span>
                  <span className="text-muted-foreground mx-2">×{oi.quantity}</span>
                  <span className="font-medium tabular-nums">₹{(oi.unitPrice * oi.quantity).toFixed(2)}</span>
                </div>
              ))
            ) : cart.length > 0 ? (
              cart.map((c, i) => {
                const unitPrice = c.item.price + (c.variant?.priceMod || 0);
                return (
                  <div key={i} className="flex items-center justify-between text-xs py-1">
                    <span className="truncate flex-1">
                      {c.item.name}
                      {c.variant ? ` (${c.variant.name})` : ""}
                    </span>
                    <div className="flex items-center gap-1 mx-2">
                      <button
                        type="button"
                        className="w-5 h-5 rounded border text-[10px] leading-none"
                        onClick={() => updateQty(c.item.id, c.variant?.id || null, -1)}
                      >
                        −
                      </button>
                      <span className="w-4 text-center text-xs">{c.quantity}</span>
                      <button
                        type="button"
                        className="w-5 h-5 rounded border text-[10px] leading-none"
                        onClick={() => updateQty(c.item.id, c.variant?.id || null, 1)}
                      >
                        +
                      </button>
                    </div>
                    <span className="font-medium tabular-nums">₹{(unitPrice * c.quantity).toFixed(2)}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">No items. Select items from the menu.</p>
            )}
          </div>

          <Separator className="mb-2" />

          {existingOrder && (
            <div className="space-y-1.5 text-xs mb-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{Number(existingOrder.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Discount</span>
                <div className="flex items-center gap-1 ml-auto">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as "fixed" | "percentage")}
                    className="text-[10px] border rounded px-1 py-0.5"
                  >
                    <option value="fixed">₹</option>
                    <option value="percentage">%</option>
                  </select>
                  <Input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-16 h-6 text-[10px]"
                    min={0}
                  />
                  <Button size="sm" variant="ghost" className="text-[10px] h-6" onClick={handleUpdateTotals} disabled={processing}>
                    Apply
                  </Button>
                </div>
              </div>
              {Number(existingOrder.taxAmount) > 0 && (
                <div className="flex justify-between">
                  <span>Tax ({taxRate}%)</span>
                  <span>₹{Number(existingOrder.taxAmount).toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-sm">
                <span>Total</span>
                <span>₹{Number(existingOrder.total).toFixed(2)}</span>
              </div>
            </div>
          )}

          {cart.length > 0 && !existingOrder && (
            <div className="space-y-1.5 text-xs mb-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Discount</span>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as "fixed" | "percentage")}
                  className="text-[10px] border rounded px-1 py-0.5 ml-auto"
                >
                  <option value="fixed">₹</option>
                  <option value="percentage">%</option>
                </select>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-16 h-6 text-[10px]"
                  min={0}
                />
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between">
                  <span>Tax ({taxRate}%)</span>
                  <span>₹{taxAmount.toFixed(2)}</span>
                </div>
              )}
              {serviceChargeRate > 0 && (
                <div className="flex justify-between">
                  <span>Service Charge ({serviceChargeRate}%)</span>
                  <span>₹{chargeAmount.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-sm">
                <span>Total</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          {loyaltyEnabled && existingOrder?.customer?.phone && loyaltyInfo && (
            <div className="mb-2 p-2 rounded-lg border border-amber-200 bg-amber-50 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-800">Loyalty</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium ${loyaltyInfo.tierColor}`}>
                  {loyaltyInfo.tierLabel}
                </span>
              </div>
              <div className="flex justify-between text-amber-700">
                <span>Points Available</span>
                <span className="font-bold">{loyaltyInfo.pointsAvailable}</span>
              </div>
              {loyaltyInfo.nextTier && (
                <p className="text-[10px] text-amber-600">
                  {loyaltyInfo.nextTier.pointsNeeded} pts to {loyaltyInfo.nextTier.label}
                </p>
              )}
              {!showRedeem && loyaltyInfo.pointsAvailable >= 100 && (
                <Button size="sm" variant="outline" className="w-full text-xs h-7 border-amber-300 text-amber-800 hover:bg-amber-100"
                  onClick={() => setShowRedeem(true)}>
                  🎯 Redeem Points
                </Button>
              )}
              {showRedeem && (
                <div className="flex items-center gap-1">
                  <Input type="number" value={redeemPoints} onChange={(e) => setRedeemPoints(Number(e.target.value))}
                    placeholder="Points" className="h-7 text-[10px] flex-1" min={0} />
                  <Button size="sm" className="text-[10px] h-7" onClick={handleRedeem} disabled={processing || redeemPoints <= 0}>
                    Apply
                  </Button>
                  <Button size="sm" variant="ghost" className="text-[10px] h-7" onClick={() => { setShowRedeem(false); setRedeemPoints(0); }}>
                    ✕
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5 shrink-0">
          {paidOrderId ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-green-600">✅ Payment Complete</p>
              <a
                href={`/admin/bill/${paidOrderId}`}
                target="_blank"
                className="flex items-center justify-center rounded-lg bg-foreground text-background px-4 py-2.5 text-xs font-medium hover:opacity-90"
              >
                🖨️ Print Bill
              </a>
              <Button size="sm" variant="outline" className="w-full text-xs h-8" onClick={() => router.push("/admin/pos")}>
                Back to POS
              </Button>
            </div>
          ) : existingOrder ? (
            showPayment ? (
              <div className="space-y-2">
                <p className="text-xs font-medium">Payment Method</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {PAYMENT_METHODS.map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`rounded-lg border p-2 text-xs text-center transition-colors ${
                        paymentMethod === pm.id
                          ? "bg-foreground text-background border-foreground"
                          : "bg-white hover:border-foreground"
                      }`}
                    >
                      <span className="block text-sm">{pm.icon}</span>
                      {pm.label}
                    </button>
                  ))}
                </div>
                {paymentMethod === "upi" && (
                  <Input
                    placeholder="UPI reference (optional)"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="h-8 text-xs"
                  />
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs h-8"
                    onClick={() => setShowPayment(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs h-8"
                    onClick={handlePayment}
                    disabled={processing || !paymentMethod}
                  >
                    {processing ? "Processing..." : `Pay ₹${Number(existingOrder.total).toFixed(2)}`}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 text-xs h-9" onClick={() => setShowPayment(true)}>
                  Take Payment
                </Button>
              </div>
            )
          ) : (
              <Button
                size="sm"
                className="w-full text-xs h-9"
                onClick={handlePlaceOrder}
                disabled={processing || cart.length === 0}
              >
                {processing ? "Creating..." : `Create Order (${cartCount} items) — ₹${grandTotal.toFixed(2)}`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
