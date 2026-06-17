"use client";

import { useState, useEffect, useCallback } from "react";
import { getSuppliers, createSupplier, deleteSupplier } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

type Supplier = {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  _count?: { inventoryItems: number; purchaseOrders: number };
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", contactPerson: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    const r = await getSuppliers();
    if (r.success) setSuppliers(r.data as unknown as Supplier[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  async function handleSave() {
    if (!form.name) return;
    setSaving(true);
    const r = await createSupplier(form);
    if (r.success) { toast.success("Supplier added"); setShowAdd(false); setForm({ name: "", contactPerson: "", phone: "", email: "" }); await fetch(); }
    else { toast.error(r.error || "Failed"); }
    setSaving(false);
  }

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>{showAdd ? "Cancel" : "Add Supplier"}</Button>
      </div>

      {showAdd && (
        <Card><CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium">Name *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-8 text-xs" /></div>
            <div><label className="text-xs font-medium">Contact Person</label><Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} className="h-8 text-xs" /></div>
            <div><label className="text-xs font-medium">Phone</label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-8 text-xs" /></div>
            <div><label className="text-xs font-medium">Email</label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-8 text-xs" /></div>
          </div>
          <Button size="sm" className="text-xs" onClick={handleSave} disabled={saving || !form.name}>{saving ? "Saving..." : "Add"}</Button>
        </CardContent></Card>
      )}

      <div className="space-y-1">
        {suppliers.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg border p-3 bg-white">
            <div>
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-[10px] text-muted-foreground">{s.contactPerson && `📋 ${s.contactPerson} · `}{s.phone && `📞 ${s.phone} `}{s.email && `· ${s.email}`}</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs h-7 text-red-600" onClick={async () => { if (confirm("Delete?")) { await deleteSupplier(s.id); toast.success("Deleted"); await fetch(); } }}>Remove</Button>
          </div>
        ))}
        {suppliers.length === 0 && <p className="text-center py-10 text-muted-foreground text-sm">No suppliers.</p>}
      </div>
    </div>
  );
}
