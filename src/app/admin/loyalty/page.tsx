import { getLoyaltyReport, getLoyaltySettings } from "@/lib/actions/loyalty";
import { TIERS } from "@/lib/loyalty-tiers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TIER_COLORS: Record<string, string> = Object.fromEntries(
  TIERS.map((t) => [t.name, t.color])
);

export default async function LoyaltyPage() {
  const [report, settings] = await Promise.all([
    getLoyaltyReport(),
    getLoyaltySettings(),
  ]);

  if (!settings?.success) {
    return <p className="text-muted-foreground">Unable to load loyalty settings.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">⭐ Loyalty Program</h1>
          <p className="text-sm text-muted-foreground">
            {settings.data?.loyaltyEnabled ? "Active" : "Disabled"} &middot; Earn rate: 1 pt per ₹{settings.data?.loyaltyEarnRate ?? 100} &middot; Redeem: {settings.data?.loyaltyRedeemRate ?? 100} pts = ₹1
          </p>
        </div>
        <a href="/admin/settings/loyalty" className="text-xs text-blue-600 hover:underline">
          Settings
        </a>
      </div>

      {!settings.data?.loyaltyEnabled && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">
              Loyalty program is currently disabled.{" "}
              <a href="/admin/settings/loyalty" className="text-blue-600 hover:underline">
                Enable it in settings
              </a>
            </p>
          </CardContent>
        </Card>
      )}

      {report && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Enrolled Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{report.summary.enrolledCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Points Earned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{report.summary.totalEarned}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Points Redeemed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{report.summary.totalRedeemed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Redemption Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {report.summary.totalEarned > 0
                    ? Math.round((report.summary.totalRedeemed / report.summary.totalEarned) * 100)
                    : 0}%
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tier Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(report.tierBreakdown).map(([tier, count]) => (
                  <div key={tier} className="text-center">
                    <div className={`w-8 h-8 rounded-full ${TIER_COLORS[tier] || "bg-gray-300"} mx-auto mb-1 flex items-center justify-center text-white text-xs font-bold`}>
                      {tier === "bronze" ? "B" : tier === "silver" ? "S" : tier === "gold" ? "G" : "P"}
                    </div>
                    <p className="text-sm font-semibold capitalize">{tier}</p>
                    <p className="text-xs text-muted-foreground">{count} customers</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {report.customers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customer Leaderboard</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {report.customers.map((c, i) => (
                    <div key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground w-5 text-xs">{i + 1}.</span>
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full text-white font-medium ${TIER_COLORS[c.tier] || "bg-gray-300"}`}>
                          {c.tier}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {c.pointsAvailable} pts
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {c.totalOrders} orders
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {report.customers.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-sm">
                  No customers enrolled in the loyalty program yet. Points are earned automatically when customers place orders.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
