"use client";

import { useState, useEffect, useCallback } from "react";
import { getInventoryItems, createInventoryItem, updateInventoryItem, deleteInventoryItem } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

type InventoryItem = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string;
  stockQty: number;
  minStockQty: number;
  costPrice: number | null;
  isLowStock: boolean;
  supplier?: { name: string } | null;
  recipeItems?: Array<{ menuItem: { name: string } }>;
};

const CATEGORIES = ["produce", "meat", "dairy", "dry", "beverage", "other"];

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", sku: "", category: "other", unit: "kg", stockQty: 0, minStockQty: 0, costPrice: 0 });
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    const result = await getInventoryItems();
    if (result.success) setItems(result.data as unknown as InventoryItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const lowStockItems = items.filter((i) => i.isLowStock);

  async function handleSave() {
    setSaving(true);
    const result = editId
      ? await updateInventoryItem(editId, form)
      : await createInventoryItem(form);
    if (result.success) {
      toast.success(editId ? "Updated" : "Added");
      setShowAdd(false);
      setEditId(null);
      setForm({ name: "", sku: "", category: "other", unit: "kg", stockQty: 0, minStockQty: 0, costPrice: 0 });
      await fetchItems();
    } else {
      toast.error(result.error || "Failed");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this item?")) return;
    const result = await deleteInventoryItem(id);
    if (result.success) {
      toast.success("Deleted");
      await fetchItems();
    } else {
      toast.error(result.error || "Failed");
    }
  }

  function editItem(item: InventoryItem) {
    setEditId(item.id);
    setForm({ name: item.name, sku: item.sku || "", category: item.category || "other", unit: item.unit, stockQty: item.stockQty, minStockQty: item.minStockQty, costPrice: item.costPrice || 0 });
  }

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading inventory...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">{items.length} items · {lowStockItems.length} low stock</p>
        </div>
        <Button size="sm" onClick={() => { setShowAdd(!showAdd); setEditId(null); }}>
          {showAdd ? "Cancel" : "Add Item"}
        </Button>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
          <p className="text-sm font-medium text-red-800">⚠️ Low Stock Items</p>
          {lowStockItems.map((i) => (
            <p key={i.id} className="text-xs text-red-600">
              {i.name} — {i.stockQty} {i.unit} (min: {i.minStockQty})
            </p>
          ))}
        </div>
      )}

      {showAdd && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Name *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-xs font-medium">SKU</label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-xs font-medium">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full h-8 text-xs border rounded px-2">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Unit</label>
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full h-8 text-xs border rounded px-2">
                  <option value="kg">kg</option><option value="g">g</option><option value="l">l</option><option value="ml">ml</option><option value="pcs">pcs</option><option value="dozen">dozen</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Stock Qty</label>
                <Input type="number" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: Number(e.target.value) })} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-xs font-medium">Min Stock</label>
                <Input type="number" value={form.minStockQty} onChange={(e) => setForm({ ...form, minStockQty: Number(e.target.value) })} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-xs font-medium">Cost Price</label>
                <Input type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })} className="h-8 text-xs" />
              </div>
            </div>
            <Button size="sm" className="text-xs" onClick={handleSave} disabled={saving || !form.name}>
              {saving ? "Saving..." : editId ? "Update Item" : "Add Item"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border p-3 bg-white">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {item.category} · {item.unit} · SKU: {item.sku || "—"}
                  {item.supplier && ` · ${item.supplier.name}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className={`text-sm font-bold tabular-nums ${item.isLowStock ? "text-red-600" : ""}`}>
                  {item.stockQty} <span className="text-[10px] text-muted-foreground font-normal">{item.unit}</span>
                </p>
                {item.isLowStock && <p className="text-[10px] text-red-600">Low stock!</p>}
              </div>
              <Badge variant="outline" className="text-[10px]">
                {item.recipeItems?.length || 0} recipes
              </Badge>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => editItem(item)}>Edit</Button>
              <Button variant="ghost" size="sm" className="text-xs h-7 text-red-600" onClick={() => handleDelete(item.id)}>Remove</Button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-center py-10 text-muted-foreground text-sm">No inventory items. Add your first item.</p>}
      </div>
    </div>
  );
}
