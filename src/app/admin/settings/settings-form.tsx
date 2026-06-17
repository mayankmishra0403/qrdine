"use client";

import { updateRestaurant } from "@/lib/actions/restaurant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useState } from "react";

export function SettingsForm({ restaurant }: { restaurant: Record<string, unknown> }) {
  const r = restaurant as unknown as {
    id: string; name: string; slug: string; address: string | null; phone: string | null;
    email: string | null; gstin: string | null; pan: string | null; currency: string;
    timezone: string; taxRate: number; serviceCharge: number; logo: string | null; billFooter: string;
  };
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);

    const result = await updateRestaurant({
      name: (form.get("name") as string).trim(),
      address: (form.get("address") as string).trim() || undefined,
      phone: (form.get("phone") as string).trim() || undefined,
      email: (form.get("email") as string).trim() || undefined,
      gstin: (form.get("gstin") as string).trim().toUpperCase() || undefined,
      pan: (form.get("pan") as string).trim().toUpperCase() || undefined,
      currency: (form.get("currency") as string).trim(),
      timezone: (form.get("timezone") as string).trim(),
      taxRate: parseFloat(form.get("taxRate") as string) || 0,
      serviceCharge: parseFloat(form.get("serviceCharge") as string) || 0,
      billFooter: (form.get("billFooter") as string).trim() || undefined,
    });

    if (result.success) toast.success("Settings saved");
    else toast.error(result.error || "Failed");
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Restaurant Identity */}
      <Card>
        <CardHeader><CardTitle className="text-lg">🏪 Restaurant Identity</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs">Restaurant Name</Label>
              <Input id="name" name="name" defaultValue={r.name} required className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug" className="text-xs">Slug (URL)</Label>
              <Input id="slug" value={r.slug} disabled className="h-8 text-sm text-muted-foreground" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-xs">Address</Label>
              <Input id="address" name="address" defaultValue={r.address || ""} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs">Phone</Label>
              <Input id="phone" name="phone" defaultValue={r.phone || ""} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={r.email || ""} className="h-8 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GST / Tax */}
      <Card>
        <CardHeader><CardTitle className="text-lg">🧾 GST & Tax</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gstin" className="text-xs">GSTIN</Label>
              <Input id="gstin" name="gstin" defaultValue={r.gstin || ""} placeholder="22AAAAA0000A1Z5" className="h-8 text-sm font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pan" className="text-xs">PAN</Label>
              <Input id="pan" name="pan" defaultValue={r.pan || ""} placeholder="AAAAA0000A" className="h-8 text-sm font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taxRate" className="text-xs">Default Tax Rate (%)</Label>
              <Input id="taxRate" name="taxRate" type="number" defaultValue={r.taxRate} min="0" max="100" step="0.1" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="serviceCharge" className="text-xs">Service Charge (%)</Label>
              <Input id="serviceCharge" name="serviceCharge" type="number" defaultValue={r.serviceCharge} min="0" max="100" step="0.1" className="h-8 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card>
        <CardHeader><CardTitle className="text-lg">🌍 Regional Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="currency" className="text-xs">Currency</Label>
              <select id="currency" name="currency" defaultValue={r.currency} className="w-full h-8 text-sm border rounded-md px-3">
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AED">AED (د.إ)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timezone" className="text-xs">Timezone</Label>
              <select id="timezone" name="timezone" defaultValue={r.timezone} className="w-full h-8 text-sm border rounded-md px-3">
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="Asia/Dubai">Asia/Dubai</option>
                <option value="Asia/Singapore">Asia/Singapore</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Europe/London">Europe/London</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bill Settings */}
      <Card>
        <CardHeader><CardTitle className="text-lg">📄 Bill Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="billFooter" className="text-xs">Bill Footer Message</Label>
            <textarea
              id="billFooter"
              name="billFooter"
              defaultValue={r.billFooter || "Thank you! Visit again!"}
              className="w-full h-20 text-sm border rounded-md p-3 resize-none"
              maxLength={500}
            />
            <p className="text-[10px] text-muted-foreground">This message appears at the bottom of every bill.</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-3 space-y-1">
            <p className="text-xs font-medium">Preview on Bill:</p>
            <div className="border bg-white rounded p-2 text-[10px] font-mono">
              <p className="font-bold text-center">{r.name}</p>
              <p className="text-center text-muted-foreground">{r.address || ""}</p>
              {r.gstin && <p className="text-center text-muted-foreground">GSTIN: {r.gstin}</p>}
              <hr className="my-1 border-dashed" />
              <p className="text-center italic">{r.billFooter || "Thank you! Visit again!"}</p>
              <p className="text-center text-[8px] text-muted-foreground mt-1">Powered by Ritam Bharat POS</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full" disabled={saving}>
        {saving ? "Saving..." : "💾 Save All Settings"}
      </Button>
    </form>
  );
}
