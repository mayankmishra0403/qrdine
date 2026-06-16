import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderStatusButton } from "./order-status-button";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  preparing: "bg-purple-100 text-purple-800 border-purple-200",
  ready: "bg-green-100 text-green-800 border-green-200",
  served: "bg-gray-100 text-gray-800 border-gray-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

export default async function OrdersPage() {
  const session = await requireAuth();
  const orders = await prisma.order.findMany({
    where: { restaurantId: session.user.restaurantId },
    include: {
      table: true,
      customer: true,
      items: {
        include: { item: true, variant: true },
      },
      statusHistory: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Orders</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">
                    Table {order.table.tableNumber}
                  </CardTitle>
                  <Badge className={statusColors[order.status]}>
                    {order.status}
                  </Badge>
                  {order.statusHistory[0] && (
                    <span className="text-xs text-muted-foreground">
                      by {order.statusHistory[0].changedBy}
                    </span>
                  )}
                  {order.customer && (
                    <span className="text-xs text-muted-foreground">
                      📞 {order.customer.phone}
                      {order.customer.name && ` (${order.customer.name})`}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(order.createdAt).toLocaleString()}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-1 text-sm">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>
                      {item.quantity}x {item.item.name}
                      {item.variant ? ` (${item.variant.name})` : ""}
                    </span>
                    <span className="text-muted-foreground">
                      ₹{(Number(item.unitPrice) * item.quantity).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t flex justify-between font-medium">
                <span>Total</span>
                <span>₹{Number(order.total).toFixed(2)}</span>
              </div>
              {order.notes && (
                <p className="text-sm text-muted-foreground italic">
                  Note: {order.notes}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                {order.status === "pending" && (
                  <OrderStatusButton orderId={order.id} status="confirmed">
                    Confirm
                  </OrderStatusButton>
                )}
                {order.status === "confirmed" && (
                  <OrderStatusButton orderId={order.id} status="preparing">
                    Start Preparing
                  </OrderStatusButton>
                )}
                {order.status === "preparing" && (
                  <OrderStatusButton orderId={order.id} status="ready">
                    Mark Ready
                  </OrderStatusButton>
                )}
                {order.status === "ready" && (
                  <OrderStatusButton orderId={order.id} status="served">
                    Mark Served
                  </OrderStatusButton>
                )}
                {!["served", "cancelled"].includes(order.status) && (
                  <OrderStatusButton
                    orderId={order.id}
                    status="cancelled"
                    variant="outline"
                  >
                    Cancel
                  </OrderStatusButton>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {orders.length === 0 && (
          <p className="text-muted-foreground">No orders yet.</p>
        )}
      </div>
    </div>
  );
}
