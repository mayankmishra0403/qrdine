"use client";

import { useState, useEffect, useCallback } from "react";
import { initDefaultTaxSlabs, getTaxSlabs, updateTaxSlab, updateRestaurantGst } from "@/lib/actions/gst";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type TaxSlab = { id: string; name: string; rate: number; cgstRate: number; sgstRate: number; igstRate: number; isDefault: boolean };

export default function GstSettingsPage() {
  const [slabs, setSlabs] = useState<TaxSlab[]>([]);
  const [loading, setLoading] = useState(true);
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");

  const fetch = useCallback(async () => {
    const r = await getTaxSlabs();
    if (r.success) setSlabs(r.data as unknown as TaxSlab[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  async function handleInit() {
    const r = await initDefaultTaxSlabs();
    if (r.success) { toast.success(r.message || "GST slabs created"); await fetch(); }
    else toast.error(r.error || "Failed");
  }

  async function handleSetDefault(id: string) {
    const r = await updateTaxSlab(id, { isDefault: true });
    if (r.success) { toast.success("Default slab updated"); await fetch(); }
    else toast.error(r.error || "Failed");
  }

  async function handleUpdateGst() {
    const r = await updateRestaurantGst({ gstin, pan });
    if (r.success) toast.success("GST details saved");
    else toast.error(r.error || "Failed");
  }

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">GST Settings</h1>

      <Card>
        <CardHeader><CardTitle className="text-lg">Restaurant GST Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">GSTIN</label>
              <Input value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="22AAAAA0000A1Z5" className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-xs font-medium">PAN</label>
              <Input value={pan} onChange={(e) => setPan(e.target.value)} placeholder="AAAAA0000A" className="h-8 text-xs" />
            </div>
          </div>
          <Button size="sm" className="text-xs" onClick={handleUpdateGst}>Save</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Tax Slabs</CardTitle>
          {slabs.length === 0 && <Button size="sm" className="text-xs" onClick={handleInit}>Initialize GST Slabs</Button>}
        </CardHeader>
        <CardContent className="space-y-2">
          {slabs.length > 0 ? (
            <div className="space-y-1">
              <div className="grid grid-cols-6 gap-2 text-[10px] font-semibold text-muted-foreground pb-1 border-b">
                <span>Name</span><span>Rate</span><span>CGST</span><span>SGST</span><span>IGST</span><span></span>
              </div>
              {slabs.map((slab) => (
                <div key={slab.id} className="grid grid-cols-6 gap-2 text-xs items-center py-1.5 border-b border-dashed">
                  <span className="font-medium">{slab.name}</span>
                  <span>{slab.rate}%</span>
                  <span>{slab.cgstRate}%</span>
                  <span>{slab.sgstRate}%</span>
                  <span>{slab.igstRate}%</span>
                  <div className="flex gap-1">
                    {!slab.isDefault && (
                      <Button variant="outline" size="sm" className="text-[10px] h-6" onClick={() => handleSetDefault(slab.id)}>
                        Set Default
                      </Button>
                    )}
                    {slab.isDefault && <span className="text-[10px] text-green-600 font-medium">Default</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              No tax slabs configured. Click "Initialize GST Slabs" to create standard GST rates (5%, 12%, 18%, 28%).
            </p>
          )}

          {slabs.length > 0 && (
            <div className="text-[10px] text-muted-foreground pt-2 border-t">
              <p>In-state: CGST (50%) + SGST (50%) &nbsp;|&nbsp; Out-state: IGST (100%)</p>
              <p>Default slab is auto-applied to new menu items. You can override per item.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Menu Item HSN Codes</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Set HSN/SAC codes for menu items in the Menu section. Common restaurant HSN codes:
          </p>
          <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
            <p><code className="text-[10px] bg-muted px-1 rounded">2105 00 00</code> Ice cream</p>
            <p><code className="text-[10px] bg-muted px-1 rounded">2202 10 10</code> Beverages</p>
            <p><code className="text-[10px] bg-muted px-1 rounded">1905 90 40</code> Bakery items</p>
            <p><code className="text-[10px] bg-muted px-1 rounded">9963 31</code> Restaurant services (SAC)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
