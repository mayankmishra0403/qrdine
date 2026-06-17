"use client";

import { createTable } from "@/lib/actions/tables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

export function AddTableForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const tableNumber = parseInt(form.get("tableNumber") as string);
    const capacity = parseInt(form.get("capacity") as string) || 4;

    if (isNaN(tableNumber) || tableNumber < 1) {
      toast.error("Enter a valid table number");
      setLoading(false);
      return;
    }

    const result = await createTable(tableNumber, capacity);
    if (result.success) {
      toast.success(`Table ${tableNumber} added (${capacity} seats)`);
      setOpen(false);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Add Table</Button>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        name="tableNumber"
        type="number"
        min="1"
        placeholder="Table #"
        className="w-24"
        required
      />
      <Input
        name="capacity"
        type="number"
        min="1"
        max="50"
        placeholder="Seats"
        className="w-20"
        defaultValue="4"
      />
      <Button type="submit" disabled={loading}>
        {loading ? "Adding..." : "Add"}
      </Button>
      <Button type="button" variant="outline" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}
