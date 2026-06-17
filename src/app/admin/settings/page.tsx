import { getCurrentRestaurant } from "@/lib/actions/restaurant";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const restaurant = await getCurrentRestaurant();
  if (!restaurant) return <p>Restaurant not found</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <SettingsForm restaurant={restaurant as unknown as Record<string, unknown>} />
    </div>
  );
}
