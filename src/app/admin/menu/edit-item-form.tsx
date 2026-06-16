"use client";

import { updateItem } from "@/lib/actions/menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

export function EditItemForm({
  itemId,
  onDone,
}: {
  itemId: string;
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<{
    name: string;
    description: string | null;
    price: number;
    isAvailable: boolean;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/menu/${itemId}`)
      .then((r) => r.json())
      .then(setItem);
  }, [itemId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const name = (form.get("name") as string).trim();
    const description = (form.get("description") as string).trim() || undefined;
    const price = parseFloat(form.get("price") as string);

    if (!name || isNaN(price)) {
      setError("Name and price are required");
      setLoading(false);
      return;
    }

    try {
      await updateItem(itemId, { name, description, price });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (!item) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input name="name" defaultValue={item.name} placeholder="Item name" required />
        <Input
          name="price"
          type="number"
          step="0.01"
          min="0"
          defaultValue={item.price}
          placeholder="Price"
          required
        />
      </div>
      <Input name="description" defaultValue={item.description || ""} placeholder="Description" />

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
