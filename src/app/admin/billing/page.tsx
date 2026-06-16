import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const plans = [
  {
    id: "basic",
    name: "Basic",
    price: "$29",
    features: ["QR Menu", "Up to 10 tables", "Basic analytics"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$79",
    features: [
      "QR Menu + Ordering",
      "Kitchen Dashboard",
      "Unlimited tables",
      "Order history",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "$149",
    features: [
      "Everything in Pro",
      "WhatsApp CRM",
      "Marketing campaigns",
      "Advanced analytics",
      "Customer loyalty",
    ],
  },
];

export default async function BillingPage() {
  const session = await requireAuth();
  const subscription = await prisma.subscription.findUnique({
    where: { restaurantId: session.user.restaurantId },
  });

  const currentPlan = subscription?.plan || "basic";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Billing & Plan</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Plan</CardTitle>
            <Badge>{currentPlan.toUpperCase()}</Badge>
          </div>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>
            <span className="text-muted-foreground">Status:</span>{" "}
            {subscription?.status || "Active"}
          </p>
          {subscription?.currentPeriodEnd && (
            <p>
              <span className="text-muted-foreground">Current period ends:</span>{" "}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <Card
              key={plan.id}
              className={`${
                isCurrent ? "ring-2 ring-foreground" : ""
              }`}
            >
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <p className="text-3xl font-bold">
                  {plan.price}
                  <span className="text-sm font-normal text-muted-foreground">
                    /mo
                  </span>
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-sm">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent}
                >
                  {isCurrent ? "Current Plan" : "Upgrade"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
