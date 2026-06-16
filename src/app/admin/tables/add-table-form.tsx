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

    if (isNaN(tableNumber) || tableNumber < 1) {
      toast.error("Enter a valid table number");
      setLoading(false);
      return;
    }

    const result = await createTable(tableNumber);
    if (result.success) {
      toast.success(`Table ${tableNumber} added`);
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
        placeholder="Table number"
        className="w-32"
        required
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
