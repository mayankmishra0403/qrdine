import { getLoyaltySettings } from "@/lib/actions/loyalty";
import { LoyaltySettingsForm } from "./form";

export default async function LoyaltySettingsPage() {
  const result = await getLoyaltySettings();
  const settings = result.success ? result.data : null;

  if (!settings) {
    return <p className="text-muted-foreground">Failed to load settings.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Loyalty Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure how customers earn and redeem loyalty points
        </p>
      </div>
      <LoyaltySettingsForm settings={settings as unknown as { loyaltyEnabled: boolean; loyaltyEarnRate: number; loyaltyRedeemRate: number; loyaltyMinRedeem: number }} />
    </div>
  );
}
