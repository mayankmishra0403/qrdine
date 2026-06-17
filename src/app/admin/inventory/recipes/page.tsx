"use client";

import { useState, useEffect, useCallback } from "react";
import { getRecipes, saveRecipe, deleteRecipe } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type MenuItem = { id: string; name: string; recipeItems: Array<{ id: string; quantity: number; unit: string; inventoryItem: { id: string; name: string; unit: string } }> };
type InventoryItem = { id: string; name: string; unit: string };

export default function RecipesPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [form, setForm] = useState({ inventoryItemId: "", quantity: 0, unit: "kg" });

  const fetch = useCallback(async () => {
    const r = await getRecipes();
    if (r.success) {
      const d = r.data as unknown as { menuItems: MenuItem[]; inventoryItems: InventoryItem[] };
      setMenuItems(d.menuItems);
      setInventoryItems(d.inventoryItems);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  async function handleSave() {
    if (!selectedItem || !form.inventoryItemId) return;
    const r = await saveRecipe({ menuItemId: selectedItem, ...form });
    if (r.success) { toast.success("Recipe saved"); setForm({ inventoryItemId: "", quantity: 0, unit: "kg" }); await fetch(); }
    else { toast.error(r.error || "Failed"); }
  }

  async function handleDelete(id: string) {
    await deleteRecipe(id);
    toast.success("Removed");
    await fetch();
  }

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Recipe Mapping</h1>
      <p className="text-sm text-muted-foreground">Link menu items to inventory ingredients. Stock will auto-deduct when orders are placed.</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Menu Items</p>
          {menuItems.filter((m) => m.recipeItems.length > 0 || m.id === selectedItem).map((item) => (
            <button key={item.id} onClick={() => setSelectedItem(item.id)}
              className={`w-full text-left rounded-lg border p-3 text-sm ${selectedItem === item.id ? "border-foreground bg-muted" : "bg-white"}`}>
              <span className="font-medium">{item.name}</span>
              <span className="text-[10px] text-muted-foreground block">{item.recipeItems.length} ingredients</span>
            </button>
          ))}
        </div>

        <div>
          {selectedItem ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold">{menuItems.find((m) => m.id === selectedItem)?.name}</p>

              <div className="space-y-2">
                {menuItems.find((m) => m.id === selectedItem)?.recipeItems.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border p-2 bg-white">
                    <span className="text-xs">{r.inventoryItem.name} ×{r.quantity} {r.unit}</span>
                    <Button variant="ghost" size="sm" className="text-xs h-6 text-red-600" onClick={() => handleDelete(r.id)}>×</Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t pt-2">
                <p className="text-xs font-medium">Add Ingredient</p>
                <select value={form.inventoryItemId} onChange={(e) => { const inv = inventoryItems.find((i) => i.id === e.target.value); setForm({ ...form, inventoryItemId: e.target.value, unit: inv?.unit || "kg" }); }}
                  className="w-full h-8 text-xs border rounded px-2">
                  <option value="">Select ingredient...</option>
                  {inventoryItems.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                </select>
                <div className="flex gap-2">
                  <Input type="number" placeholder="Qty" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} className="h-8 text-xs w-20" />
                  <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="h-8 text-xs w-16" />
                  <Button size="sm" className="text-xs h-8" onClick={handleSave} disabled={!form.inventoryItemId || !form.quantity}>Add</Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">Select a menu item to manage its recipe</p>
          )}
        </div>
      </div>
    </div>
  );
}
