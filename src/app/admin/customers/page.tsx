import { getCustomers } from "@/lib/actions/customers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Customers</h1>

      {customers.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              No customers yet. Customers are created when they place orders with a phone number.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {customers.map((customer) => (
          <Card key={customer.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {customer.name || "Unknown"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {customer.phone}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">{customer.totalOrders} orders</p>
                  {customer.lastVisit && (
                    <p className="text-muted-foreground">
                      Last: {new Date(customer.lastVisit).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {customer.orders.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Recent Orders</p>
                  <div className="space-y-1">
                    {customer.orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>
                          Table {order.tableNumber} &middot; {order.itemCount}{" "}
                          items
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {order.status}
                          </Badge>
                          <span className="text-muted-foreground">
                             ₹{order.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {customer.feedbacks.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Feedback</p>
                  <div className="space-y-1">
                    {customer.feedbacks.map((f, i) => (
                      <div key={i} className="text-sm">
                        <span className="text-yellow-600">
                          {"★".repeat(f.rating)}
                          {"☆".repeat(5 - f.rating)}
                        </span>
                        {f.comment && (
                          <span className="text-muted-foreground ml-2">
                            "{f.comment}"
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
