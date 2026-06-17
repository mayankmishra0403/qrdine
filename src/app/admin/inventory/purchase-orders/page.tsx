"use client";

import { useState, useEffect, useCallback } from "react";
import { getPurchaseOrders, createPurchaseOrder, receivePurchaseOrder, getSuppliers } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

type PO = {
  id: string; poNumber: string; status: string; totalAmount: number; notes: string | null;
  orderedAt: string | null; receivedAt: string | null; createdAt: string;
  supplier: { name: string };
  purchaseItems: Array<{ id: string; quantity: number; unitCost: number; totalCost: number; inventoryItem: { name: string } }>;
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PO[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ supplierId: "", notes: "", items: [{ inventoryItemId: "", quantity: 0, unitCost: 0 }] });
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    const [poR, supR] = await Promise.all([getPurchaseOrders(), getSuppliers()]);
    if (poR.success) setOrders(poR.data as unknown as PO[]);
    if (supR.success) setSuppliers((supR.data as unknown as Array<{ id: string; name: string; inventoryItems: Array<{ id: string; name: string }> }>).map((s) => ({ id: s.id, name: s.name })));
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  async function handleCreate() {
    if (!form.supplierId || form.items.length === 0) return;
    setSaving(true);
    const r = await createPurchaseOrder({ supplierId: form.supplierId, items: form.items.map((i) => ({ inventoryItemId: i.inventoryItemId, quantity: i.quantity, unitCost: i.unitCost })), notes: form.notes });
    if (r.success) { toast.success("PO created"); setShowAdd(false); setForm({ supplierId: "", notes: "", items: [{ inventoryItemId: "", quantity: 0, unitCost: 0 }] }); await fetch(); }
    else { toast.error(r.error || "Failed"); }
    setSaving(false);
  }

  async function handleReceive(poId: string) {
    const r = await receivePurchaseOrder(poId);
    if (r.success) { toast.success("Received!"); await fetch(); }
    else { toast.error(r.error || "Failed"); }
  }

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = { draft: "bg-gray-100 text-gray-800", ordered: "bg-blue-100 text-blue-800", received: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800" };
    return <Badge className={`${colors[s] || ""} text-xs`}>{s}</Badge>;
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">{orders.length} orders</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>{showAdd ? "Cancel" : "New PO"}</Button>
      </div>

      {showAdd && (
        <Card><CardContent className="p-4 space-y-3">
          <div><label className="text-xs font-medium">Supplier</label>
            <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="w-full h-8 text-xs border rounded px-2">
              <option value="">Select...</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div><label className="text-xs font-medium">Notes</label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            {form.items.map((item, i) => (
              <div key={i} className="flex gap-2">
                <Input type="number" placeholder="Item ID" value={item.inventoryItemId} onChange={(e) => { const items = [...form.items]; items[i].inventoryItemId = e.target.value; setForm({ ...form, items }); }} className="h-8 text-xs flex-1" />
                <Input type="number" placeholder="Qty" value={item.quantity || ""} onChange={(e) => { const items = [...form.items]; items[i].quantity = Number(e.target.value); setForm({ ...form, items }); }} className="h-8 text-xs w-16" />
                <Input type="number" placeholder="Cost" value={item.unitCost || ""} onChange={(e) => { const items = [...form.items]; items[i].unitCost = Number(e.target.value); setForm({ ...form, items }); }} className="h-8 text-xs w-16" />
              </div>
            ))}
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setForm({ ...form, items: [...form.items, { inventoryItemId: "", quantity: 0, unitCost: 0 }] })}>+ Add Item</Button>
          </div>
          <Button size="sm" className="text-xs" onClick={handleCreate} disabled={saving || !form.supplierId}>{saving ? "Creating..." : "Create PO"}</Button>
        </CardContent></Card>
      )}

      <div className="space-y-2">
        {orders.map((po) => (
          <div key={po.id} className="rounded-lg border p-3 bg-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{po.poNumber}</span>
                {statusBadge(po.status)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">₹{Number(po.totalAmount).toFixed(2)}</span>
                {po.status === "draft" && <Button size="sm" className="text-xs h-7" onClick={() => handleReceive(po.id)}>Receive</Button>}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{po.supplier.name} · {po.purchaseItems.length} items · {new Date(po.createdAt).toLocaleDateString()}</p>
            <div className="text-[10px] text-muted-foreground mt-1">
              {po.purchaseItems.map((i) => <span key={i.id}>{i.inventoryItem.name} ×{i.quantity} @ ₹{Number(i.unitCost).toFixed(2)} · </span>)}
            </div>
          </div>
        ))}
        {orders.length === 0 && <p className="text-center py-10 text-muted-foreground text-sm">No purchase orders.</p>}
      </div>
    </div>
  );
}
