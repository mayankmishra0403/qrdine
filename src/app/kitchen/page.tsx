import { requireAuth } from "@/lib/auth-helpers";
import { KitchenDashboard } from "./kitchen-dashboard";

export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  await requireAuth();
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <KitchenDashboard />
    </div>
  );
}
