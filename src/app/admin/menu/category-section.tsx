"use client";

import { useState } from "react";
import {
  deleteCategory,
  toggleItemAvailability,
  deleteItem,
} from "@/lib/actions/menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddItemForm } from "./add-item-form";
import { EditItemForm } from "./edit-item-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";

type Variant = { id: string; name: string; priceMod: number };
type Item = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isAvailable: boolean;
  variants: Variant[];
};

export function CategorySection({
  category,
  items,
}: {
  category: { id: string; name: string; description: string | null };
  items: Item[];
}) {
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "category" | "item";
    id: string;
    name: string;
  } | null>(null);

  async function handleToggle(itemId: string) {
    toast.promise(toggleItemAvailability(itemId), {
      loading: "Updating...",
      success: "Item updated",
      error: (err) => err.error || "Failed to update",
    });
  }

  async function handleDeleteCategory() {
    if (!deleteTarget || deleteTarget.type !== "category") return;
    const result = await deleteCategory(deleteTarget.id);
    if (result.success) {
      toast.success("Category deleted");
    } else {
      toast.error(result.error);
    }
    setDeleteTarget(null);
  }

  async function handleDeleteItem() {
    if (!deleteTarget || deleteTarget.type !== "item") return;
    const result = await deleteItem(deleteTarget.id);
    if (result.success) {
      toast.success("Item deleted");
    } else {
      toast.error(result.error);
    }
    setDeleteTarget(null);
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{category.name}</CardTitle>
              {category.description && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {category.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddItem(!showAddItem)}
              >
                {showAddItem ? "Cancel" : "Add Item"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600"
                onClick={() =>
                  setDeleteTarget({
                    type: "category",
                    id: category.id,
                    name: category.name,
                  })
                }
              >
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showAddItem && (
            <AddItemForm
              categoryId={category.id}
              onDone={() => setShowAddItem(false)}
            />
          )}

          {items.length === 0 && !showAddItem && (
            <p className="text-sm text-muted-foreground py-2">
              No items in this category. Click "Add Item" to add one.
            </p>
          )}

          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-medium ${
                      !item.isAvailable
                        ? "line-through text-muted-foreground"
                        : ""
                    }`}
                  >
                    {item.name}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ₹{item.price.toFixed(2)}
                  </span>
                </div>
                {item.description && (
                  <p className="text-sm text-muted-foreground truncate">
                    {item.description}
                  </p>
                )}
                {item.variants.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.variants.map((v) => (
                      <span
                        key={v.id}
                        className="text-xs bg-muted px-1.5 py-0.5 rounded"
                      >
                        {v.name}
                        {v.priceMod > 0
                           ? ` (+₹${v.priceMod.toFixed(2)})`
                          : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggle(item.id)}
                >
                  {item.isAvailable ? "Hide" : "Show"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingItem(item.id)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600"
                  onClick={() =>
                    setDeleteTarget({
                      type: "item",
                      id: item.id,
                      name: item.name,
                    })
                  }
                >
                  Del
                </Button>
              </div>
            </div>
          ))}

          {editingItem && (
            <EditItemForm
              itemId={editingItem}
              onDone={() => setEditingItem(null)}
            />
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={
          deleteTarget?.type === "category"
            ? "Delete Category"
            : "Delete Item"
        }
        message={
          deleteTarget?.type === "category"
            ? `Delete "${deleteTarget.name}" and all its items?`
            : `Delete "${deleteTarget?.name}"?`
        }
        confirmLabel="Delete"
        onConfirm={
          deleteTarget?.type === "category"
            ? handleDeleteCategory
            : handleDeleteItem
        }
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
