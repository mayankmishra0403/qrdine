"use client";

import { createCategory } from "@/lib/actions/menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

export function AddCategoryForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const name = (form.get("name") as string).trim();

    if (!name) {
      toast.error("Name is required");
      setLoading(false);
      return;
    }

    const result = await createCategory(name);
    if (result.success) {
      toast.success(`Category "${name}" created`);
      setOpen(false);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Add Category</Button>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input name="name" placeholder="Category name" className="w-48" required />
      <Button type="submit" disabled={loading}>
        {loading ? "Adding..." : "Add"}
      </Button>
      <Button type="button" variant="outline" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}
