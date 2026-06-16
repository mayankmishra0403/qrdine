import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function CampaignsPage() {
  const session = await requireAuth();
  const campaigns = await prisma.campaign.findMany({
    where: { restaurantId: session.user.restaurantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campaigns</h1>
      </div>

      {campaigns.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              No campaigns yet. Create your first WhatsApp marketing campaign
              to engage with customers.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{campaign.name}</CardTitle>
                {campaign.sentAt ? (
                  <Badge className="bg-green-100 text-green-800">Sent</Badge>
                ) : (
                  <Badge variant="secondary">Draft</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Template:</span>{" "}
                {campaign.messageTemplate}
              </p>
              {campaign.targetFilter && (
                <p>
                  <span className="text-muted-foreground">Target:</span>{" "}
                  {campaign.targetFilter}
                </p>
              )}
              {campaign.sentAt && (
                <p>
                  <span className="text-muted-foreground">Sent:</span>{" "}
                  {new Date(campaign.sentAt).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
