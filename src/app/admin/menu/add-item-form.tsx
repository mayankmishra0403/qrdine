"use client";

import { createItem, createVariant } from "@/lib/actions/menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

export function AddItemForm({
  categoryId,
  onDone,
}: {
  categoryId: string;
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<{ name: string; priceMod: number }[]>([]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const name = (form.get("name") as string).trim();
    const description = (form.get("description") as string).trim() || undefined;
    const price = parseFloat(form.get("price") as string);

    if (!name || isNaN(price)) {
      toast.error("Name and price are required");
      setLoading(false);
      return;
    }

    const result = await createItem({ name, description, price, categoryId });
    if (!result.success || !result.data) {
      toast.error(result.error || "Failed to create item");
      setLoading(false);
      return;
    }

    for (const v of variants) {
      await createVariant({ name: v.name, priceMod: v.priceMod, itemId: result.data.id });
    }

    toast.success("Item added");
    onDone();
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input name="name" placeholder="Item name" required />
        <Input name="price" type="number" step="0.01" min="0" placeholder="Price" required />
      </div>
      <Input name="description" placeholder="Description (optional)" />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Variants</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setVariants([...variants, { name: "", priceMod: 0 }])}
          >
            + Variant
          </Button>
        </div>
        {variants.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder="Variant name"
              value={v.name}
              onChange={(e) => {
                const next = [...variants];
                next[i] = { ...next[i], name: e.target.value };
                setVariants(next);
              }}
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Price mod"
              className="w-24"
              value={v.priceMod}
              onChange={(e) => {
                const next = [...variants];
                next[i] = { ...next[i], priceMod: parseFloat(e.target.value) || 0 };
                setVariants(next);
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-red-600"
              onClick={() => setVariants(variants.filter((_, j) => j !== i))}
            >
              X
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Adding..." : "Add Item"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
