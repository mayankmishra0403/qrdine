"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateLoyaltySettings } from "@/lib/actions/loyalty";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type Props = {
  settings: {
    loyaltyEnabled: boolean;
    loyaltyEarnRate: number;
    loyaltyRedeemRate: number;
    loyaltyMinRedeem: number;
  };
};

export function LoyaltySettingsForm({ settings }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(settings.loyaltyEnabled);
  const [earnRate, setEarnRate] = useState(settings.loyaltyEarnRate);
  const [redeemRate, setRedeemRate] = useState(settings.loyaltyRedeemRate);
  const [minRedeem, setMinRedeem] = useState(settings.loyaltyMinRedeem);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const r = await updateLoyaltySettings({
      loyaltyEnabled: enabled,
      loyaltyEarnRate: earnRate,
      loyaltyRedeemRate: redeemRate,
      loyaltyMinRedeem: minRedeem,
    });
    if (r.success) {
      toast.success("Loyalty settings updated");
      router.refresh();
    } else {
      toast.error(r.error || "Failed to save");
    }
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Label className="text-sm">Enable Loyalty Program</Label>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              enabled ? "bg-green-500" : "bg-gray-300"
            }`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              enabled ? "translate-x-4.5" : "translate-x-0.5"
            }`} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Earn Rate (₹ per point)</Label>
            <Input
              type="number"
              value={earnRate}
              onChange={(e) => setEarnRate(Number(e.target.value))}
              className="h-8 text-sm"
              min={1}
            />
            <p className="text-[10px] text-muted-foreground">
              Customer gets 1 point per ₹{earnRate} spent
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Redeem Rate (points per ₹)</Label>
            <Input
              type="number"
              value={redeemRate}
              onChange={(e) => setRedeemRate(Number(e.target.value))}
              className="h-8 text-sm"
              min={1}
            />
            <p className="text-[10px] text-muted-foreground">
              {redeemRate} points = ₹1 discount
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Minimum Redemption (points)</Label>
            <Input
              type="number"
              value={minRedeem}
              onChange={(e) => setMinRedeem(Number(e.target.value))}
              className="h-8 text-sm"
              min={1}
            />
            <p className="text-[10px] text-muted-foreground">
              Minimum {minRedeem} points needed to redeem
            </p>
          </div>
        </div>

        <div className="rounded-lg border p-3 bg-muted/30 text-xs space-y-1">
          <p className="font-medium mb-1">Tier Benefits</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-1.5 rounded bg-amber-100 text-amber-800">
              <span className="block font-semibold">🥉 Bronze</span>
              <span className="text-[10px]">0+ pts &middot; 1× earn</span>
            </div>
            <div className="p-1.5 rounded bg-gray-100 text-gray-700">
              <span className="block font-semibold">🥈 Silver</span>
              <span className="text-[10px]">500+ pts &middot; 1.5× earn</span>
            </div>
            <div className="p-1.5 rounded bg-yellow-100 text-yellow-800">
              <span className="block font-semibold">🥇 Gold</span>
              <span className="text-[10px]">2000+ pts &middot; 2× earn</span>
            </div>
            <div className="p-1.5 rounded bg-slate-200 text-slate-700">
              <span className="block font-semibold">💎 Platinum</span>
              <span className="text-[10px]">5000+ pts &middot; 3× earn</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Tier multipliers increase earning rate. Silver = 1.5 pts per ₹{earnRate}, Gold = 2 pts, Platinum = 3 pts.
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
