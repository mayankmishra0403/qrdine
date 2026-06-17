"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getPosData, mergeTables, unmergeTable, transferOrder } from "@/lib/actions/pos";
import { getCurrentSession, openPosSession, closePosSession } from "@/lib/actions/pos-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

type Table = {
  id: string;
  tableNumber: number;
  capacity: number;
  status: string;
  mergedIntoId: string | null;
};

type Order = {
  id: string;
  status: string;
  total: number;
  tableId: string;
  customer?: { name?: string; phone: string } | null;
  items: Array<{
    item: { name: string };
    variant?: { name: string } | null;
    quantity: number;
  }>;
};

type PosData = {
  tables: Table[];
  orders: Order[];
  restaurant: { currency: string; taxRate: number; serviceCharge: number } | null;
};

export default function PosPage() {
  const router = useRouter();
  const [data, setData] = useState<PosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [transferTableId, setTransferTableId] = useState("");

  const [session, setSession] = useState<{
    id: string; openingBal: number; totalSales: number; pendingAmount: number;
    orderCount: number; pendingOrders: number; expectedBal: number;
  } | null>(null);
  const [showOpenSession, setShowOpenSession] = useState(false);
  const [openingBal, setOpeningBal] = useState("0");
  const [showCloseSession, setShowCloseSession] = useState(false);
  const [closingBal, setClosingBal] = useState("");
  const [closingSummary, setClosingSummary] = useState<Record<string, unknown> | null>(null);

  const fetchData = useCallback(async () => {
    const [posResult, sessionResult] = await Promise.all([getPosData(), getCurrentSession()]);
    if (posResult.success) setData(posResult.data as unknown as PosData);
    if (sessionResult.success) setSession(sessionResult.data as unknown as typeof session);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  function getTableStatus(table: Table): { label: string; color: string } {
    if (table.status === "merged") return { label: "Merged", color: "bg-purple-100 text-purple-800 border-purple-300" };
    if (table.status === "occupied") {
      const order = data?.orders.find((o) => o.tableId === table.id);
      if (order) return { label: "Order #" + order.id.slice(-6).toUpperCase(), color: "bg-red-100 text-red-800 border-red-300" };
      return { label: "Occupied", color: "bg-orange-100 text-orange-800 border-orange-300" };
    }
    return { label: "Vacant", color: "bg-green-100 text-green-800 border-green-300" };
  }

  function getTableOrder(tableId: string) {
    return data?.orders.find((o) => o.tableId === tableId);
  }

  async function handleMerge(tableId: string) {
    if (!selectedTable || selectedTable === tableId) return;
    const result = await mergeTables(selectedTable, tableId);
    if (result.success) {
      toast.success("Tables merged");
      setMergeMode(false);
      setSelectedTable(null);
      await fetchData();
    } else {
      toast.error(result.error || "Merge failed");
    }
  }

  async function handleUnmerge(tableId: string) {
    const result = await unmergeTable(tableId);
    if (result.success) {
      toast.success("Table unmerged");
      await fetchData();
    } else {
      toast.error(result.error || "Unmerge failed");
    }
  }

  async function handleTransfer(orderId: string) {
    if (!transferTableId) return;
    const result = await transferOrder(orderId, transferTableId);
    if (result.success) {
      toast.success("Order transferred");
      setTransferTableId("");
      await fetchData();
    } else {
      toast.error(result.error || "Transfer failed");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading POS...
      </div>
    );
  }

  const activeTables = data?.tables || [];
  const activeOrders = data?.orders?.filter((o) => o.status !== "cancelled") || [];
  const occupiedCount = activeTables.filter((t) => t.status === "occupied").length;
  const vacantCount = activeTables.filter((t) => t.status === "vacant").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">POS Billing</h1>
          <p className="text-sm text-muted-foreground">
            {activeTables.length} tables · {occupiedCount} occupied · {vacantCount} vacant
          </p>
        </div>
        <div className="flex items-center gap-2">
          {session ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800 border-green-300 text-[10px]">
                Session: ₹{session.totalSales.toFixed(2)} ({session.orderCount} orders)
              </Badge>
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setShowCloseSession(true)}>
                Close Session
              </Button>
            </div>
          ) : (
            <Button size="sm" className="text-xs h-7" onClick={() => setShowOpenSession(true)}>
              Open Session
            </Button>
          )}
          <Button
            variant={mergeMode ? "default" : "outline"}
            size="sm"
            className="text-xs h-7"
            onClick={() => {
              setMergeMode(!mergeMode);
              setSelectedTable(null);
            }}
          >
            {mergeMode ? "Cancel Merge" : "Merge"}
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={fetchData}>
            Refresh
          </Button>
        </div>
      </div>

      {showOpenSession && (
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div>
            <label className="text-xs font-medium">Opening Balance (₹)</label>
            <Input type="number" value={openingBal} onChange={(e) => setOpeningBal(e.target.value)} className="h-8 text-xs w-28" min={0} />
          </div>
          <Button size="sm" className="text-xs mt-5" onClick={async () => {
            const r = await openPosSession(Number(openingBal) || 0);
            if (r.success) { toast.success("Session opened"); setShowOpenSession(false); await fetchData(); }
            else toast.error(r.error || "Failed");
          }}>Start Session</Button>
          <Button variant="outline" size="sm" className="text-xs mt-5" onClick={() => setShowOpenSession(false)}>Cancel</Button>
        </CardContent></Card>
      )}

      {showCloseSession && (
        <Card><CardContent className="p-4 space-y-2">
          <p className="text-xs font-medium">Close POS Session</p>
          {closingSummary ? (
            <div className="text-xs space-y-1">
              <p>Opening Balance: <strong>₹{Number((closingSummary as Record<string, number>).openingBal || 0).toFixed(2)}</strong></p>
              <p>Total Sales: <strong>₹{Number((closingSummary as Record<string, number>).totalSales || 0).toFixed(2)}</strong></p>
              <p>Expected Cash: <strong>₹{Number((closingSummary as Record<string, number>).expectedBal || 0).toFixed(2)}</strong></p>
              <p>Actual Cash: <strong>₹{Number((closingSummary as Record<string, number>).closingBal || 0).toFixed(2)}</strong></p>
              <p className={Number((closingSummary as Record<string, number>).difference || 0) !== 0 ? "text-red-600 font-bold" : "text-green-600"}>
                Difference: ₹{Number((closingSummary as Record<string, number>).difference || 0).toFixed(2)}
              </p>
              <p>Orders: {String((closingSummary as Record<string, unknown>).orderCount || "0")}</p>
              <Button size="sm" className="text-xs" onClick={() => { setShowCloseSession(false); setClosingSummary(null); setSession(null); }}>
                Done
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input type="number" placeholder="Closing cash balance" value={closingBal} onChange={(e) => setClosingBal(e.target.value)} className="h-8 text-xs w-36" />
              <Button size="sm" className="text-xs" onClick={async () => {
                if (!session) return;
                const r = await closePosSession(session.id, Number(closingBal) || 0);
                if (r.success) { setClosingSummary(r.summary as unknown as Record<string, unknown>); toast.success("Session closed"); }
                else toast.error(r.error || "Failed");
              }} disabled={!closingBal}>Close & Reconcile</Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowCloseSession(false)}>Cancel</Button>
            </div>
          )}
        </CardContent></Card>
      )}

      {mergeMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          {selectedTable
            ? `Tap the table to merge with Table ${activeTables.find((t) => t.id === selectedTable)?.tableNumber}`
            : "Tap the first table to start merging"}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {activeTables.map((table) => {
          const status = getTableStatus(table);
          const order = getTableOrder(table.id);
          const isSelected = selectedTable === table.id;
          const isMergedInto = table.mergedIntoId;

          return (
            <button
              key={table.id}
              type="button"
              onClick={() => {
                if (mergeMode) {
                  if (selectedTable) {
                    handleMerge(table.id);
                  } else {
                    setSelectedTable(table.id);
                  }
                  return;
                }
                router.push(`/admin/pos/${table.id}`);
              }}
              className={`relative rounded-xl border-2 p-3 text-left transition-all active:scale-95 ${
                isSelected
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-300"
                  : table.status === "occupied"
                    ? "border-red-300 bg-white hover:border-red-400"
                    : table.status === "merged"
                      ? "border-purple-300 bg-purple-50 hover:border-purple-400"
                      : "border-green-300 bg-white hover:border-green-400"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg font-bold">T{table.tableNumber}</span>
                {isMergedInto && (
                  <span className="text-[10px] text-purple-600 font-medium">→ T{activeTables.find(t => t.id === isMergedInto)?.tableNumber}</span>
                )}
              </div>
              <div className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${status.color}`}>
                {status.label}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Cap: {table.capacity}
              </div>
              {order && (
                <div className="mt-1 text-[10px] text-muted-foreground truncate">
                  ₹{Number(order.total).toFixed(2)} · {order.items.reduce((s, i) => s + i.quantity, 0)} items
                </div>
              )}
            </button>
          );
        })}
      </div>

      {activeOrders.length > 0 && (
        <div className="space-y-2 mt-6">
          <h2 className="font-semibold text-sm text-muted-foreground">Active Orders ({activeOrders.length})</h2>
          <div className="space-y-2">
            {activeOrders.map((order) => {
              const table = activeTables.find((t) => t.id === order.tableId);
              return (
                <div key={order.id} className="flex items-center justify-between rounded-lg border p-3 bg-white">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm">T{table?.tableNumber}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {order.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {order.items.length} items · ₹{Number(order.total).toFixed(2)}
                    </span>
                    {order.customer?.phone && (
                      <span className="text-xs text-muted-foreground">
                        📞 {order.customer.phone}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Transfer to T#"
                      value={transferTableId}
                      onChange={(e) => setTransferTableId(e.target.value)}
                      className="w-24 h-8 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                      onClick={() => handleTransfer(order.id)}
                      disabled={!transferTableId}
                    >
                      Transfer
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => router.push(`/admin/pos/${order.tableId}`)}
                    >
                      Bill
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTables.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">No tables found</p>
          <p className="text-sm">Add tables in Settings to start using POS</p>
        </div>
      )}
    </div>
  );
}
