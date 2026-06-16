"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { serialize } from "@/lib/serialize";

export async function getCustomers() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const customers = await prisma.customer.findMany({
    where: { restaurantId: session.user.restaurantId },
    include: {
      orders: {
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          items: { include: { item: true } },
          table: true,
        },
      },
      feedbacks: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
    orderBy: { lastVisit: { sort: "desc", nulls: "last" } },
  });

  return serialize(customers.map((c) => ({
    id: c.id,
    phone: c.phone,
    name: c.name,
    totalOrders: c.totalOrders,
    lastVisit: c.lastVisit?.toISOString() || null,
    createdAt: c.createdAt.toISOString(),
    orders: c.orders.map((o) => ({
      id: o.id,
      total: Number(o.total),
      status: o.status,
      tableNumber: o.table.tableNumber,
      itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
      createdAt: o.createdAt.toISOString(),
    })),
    feedbacks: c.feedbacks.map((f) => ({
      rating: f.rating,
      comment: f.comment,
      createdAt: f.createdAt.toISOString(),
    })),
  })));
}
