"use client";

import { deleteTable } from "@/lib/actions/tables";
import { getTableUrl } from "@/lib/qr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QRCodeDisplay } from "./qr-code-display";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { useState } from "react";

type Table = {
  id: string;
  tableNumber: number;
};

export function TableCard({ table }: { table: Table }) {
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const tableUrl = getTableUrl(table.id);

  async function handleDelete() {
    const result = await deleteTable(table.id);
    if (!result.success) {
      toast.error(result.error);
      setDeleting(false);
      setShowConfirm(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Table {table.tableNumber}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700"
              disabled={deleting}
              onClick={() => setShowConfirm(true)}
            >
              {deleting ? "..." : "Remove"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <QRCodeDisplay url={tableUrl} />
          <p className="text-xs text-muted-foreground break-all">{tableUrl}</p>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={showConfirm}
        title="Remove Table"
        message={`Remove Table ${table.tableNumber}? This action cannot be undone.`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
