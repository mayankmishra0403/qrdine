"use client";

import { deleteTable, updateTable } from "@/lib/actions/tables";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { QRCodeDisplay } from "./qr-code-display";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { useState, useEffect } from "react";

type Table = {
  id: string;
  tableNumber: number;
  capacity: number;
  status: string;
};

const statusStyles: Record<string, string> = {
  vacant: "bg-green-100 text-green-800 border-green-300",
  occupied: "bg-red-100 text-red-800 border-red-300",
  reserved: "bg-yellow-100 text-yellow-800 border-yellow-300",
  merged: "bg-purple-100 text-purple-800 border-purple-300",
};

export function TableCard({ table }: { table: Table }) {
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [capacity, setCapacity] = useState(table.capacity.toString());
  const [tableNumber, setTableNumber] = useState(table.tableNumber.toString());
  const [saving, setSaving] = useState(false);
  const [tableStatus, setTableStatus] = useState(table.status);
  const [tableUrl, setTableUrl] = useState(`/table/${table.id}`);

  useEffect(() => {
    fetch("/api/url").then((r) => r.json()).then((d) => {
      setTableUrl(`${d.url}/table/${table.id}`);
    }).catch(() => {});
  }, [table.id]);

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteTable(table.id);
    if (!result.success) {
      toast.error(result.error);
    }
    setDeleting(false);
    setShowConfirm(false);
  }

  async function handleSave() {
    setSaving(true);
    const result = await updateTable({
      id: table.id,
      tableNumber: parseInt(tableNumber) || table.tableNumber,
      capacity: parseInt(capacity) || table.capacity,
      status: tableStatus,
    });
    if (result.success) {
      toast.success("Table updated");
      setEditing(false);
    } else {
      toast.error(result.error || "Failed to update");
    }
    setSaving(false);
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {editing ? (
                <Input
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-16 h-7 text-sm font-bold"
                  type="number"
                  min={1}
                />
              ) : (
                <CardTitle className="text-lg">Table {table.tableNumber}</CardTitle>
              )}
              <Badge className={`text-xs border ${statusStyles[table.status] || ""}`}>
                {table.status}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => setEditing(!editing)}
              >
                {editing ? "Cancel" : "Edit"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 text-xs h-7"
                disabled={deleting}
                onClick={() => setShowConfirm(true)}
              >
                Remove
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-4">
            <QRCodeDisplay url={tableUrl} showDownload />
            <div className="text-xs text-muted-foreground space-y-2 flex-1">
              {editing ? (
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-medium">Capacity (seats)</label>
                      <Input
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        className="h-7 text-xs mt-1"
                        type="number"
                        min={1}
                        max={50}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium">Status</label>
                      <select
                        value={tableStatus}
                        onChange={(e) => setTableStatus(e.target.value)}
                        className="w-full h-7 text-xs border rounded px-1 mt-1"
                      >
                        <option value="vacant">Vacant</option>
                        <option value="occupied">Occupied</option>
                        <option value="reserved">Reserved</option>
                        <option value="merged">Merged</option>
                      </select>
                    </div>
                    <Button
                      size="sm"
                      className="text-xs h-7 w-full"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
              ) : (
                <>
                  <p>Capacity: {table.capacity} seats</p>
                  <p className="break-all">{tableUrl}</p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={showConfirm}
        title="Remove Table"
        message={`Remove Table ${table.tableNumber}? Orders under this table will also be removed.`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
