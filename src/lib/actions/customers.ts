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
      loyalty: true,
    },
    orderBy: { lastVisit: { sort: "desc", nulls: "last" } },
  });

  function getTierLabel(tier: string) {
    switch (tier) {
      case "platinum": return "Platinum";
      case "gold": return "Gold";
      case "silver": return "Silver";
      default: return "Bronze";
    }
  }

  function getTierColor(tier: string) {
    switch (tier) {
      case "platinum": return "text-slate-500 bg-slate-100 border-slate-300";
      case "gold": return "text-yellow-700 bg-yellow-100 border-yellow-300";
      case "silver": return "text-gray-600 bg-gray-100 border-gray-300";
      default: return "text-amber-700 bg-amber-100 border-amber-300";
    }
  }

  return serialize(customers.map((c) => ({
    id: c.id,
    phone: c.phone,
    name: c.name,
    totalOrders: c.totalOrders,
    lastVisit: c.lastVisit?.toISOString() || null,
    createdAt: c.createdAt.toISOString(),
    loyalty: c.loyalty ? {
      pointsEarned: c.loyalty.pointsEarned,
      pointsRedeemed: c.loyalty.pointsRedeemed,
      pointsAvailable: c.loyalty.pointsEarned - c.loyalty.pointsRedeemed,
      tier: c.loyalty.tier,
      tierLabel: getTierLabel(c.loyalty.tier),
      tierColor: getTierColor(c.loyalty.tier),
    } : null,
    orders: c.orders.map((o) => ({
      id: o.id,
      total: Number(o.total),
      status: o.status,
      tableNumber: o.table?.tableNumber ?? 0,
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
