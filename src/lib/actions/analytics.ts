"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function getAnalytics() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const rid = session.user.restaurantId;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(todayStart.getTime() - 7 * 86400000);
  const monthAgo = new Date(todayStart.getTime() - 30 * 86400000);

  const [totalOrders, todayOrders, weekOrders, revenue, popularItems, orders] =
    await Promise.all([
      prisma.order.count({ where: { restaurantId: rid } }),
      prisma.order.count({
        where: { restaurantId: rid, createdAt: { gte: todayStart } },
      }),
      prisma.order.count({
        where: { restaurantId: rid, createdAt: { gte: weekAgo } },
      }),
      prisma.order.aggregate({
        where: { restaurantId: rid, status: { notIn: ["cancelled"] } },
        _sum: { total: true },
      }),
      prisma.orderItem.groupBy({
        by: ["itemId"],
        where: { order: { restaurantId: rid } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 10,
      }),
      prisma.order.findMany({
        where: { restaurantId: rid, createdAt: { gte: monthAgo } },
        select: { createdAt: true, total: true, status: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  const itemNames = popularItems.length
    ? await prisma.menuItem.findMany({
        where: { id: { in: popularItems.map((i) => i.itemId) } },
        select: { id: true, name: true },
      })
    : [];

  const nameMap = Object.fromEntries(itemNames.map((i) => [i.id, i.name]));

  const popular = popularItems.map((i) => ({
    name: nameMap[i.itemId] || "Unknown",
    quantity: i._sum.quantity || 0,
  }));

  const hourlyBuckets: Record<string, number> = {};
  for (const o of orders) {
    const hour = new Date(o.createdAt).getHours().toString().padStart(2, "0");
    hourlyBuckets[hour] = (hourlyBuckets[hour] || 0) + 1;
  }
  const byHour = Object.entries(hourlyBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, count]) => ({ hour, count }));

  const dailyBuckets: Record<string, number> = {};
  for (const o of orders) {
    const day = o.createdAt.toISOString().slice(0, 10);
    dailyBuckets[day] = (dailyBuckets[day] || 0) + Number(o.total);
  }
  const byDay = Object.entries(dailyBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));

  return {
    totalOrders,
    todayOrders,
    weekOrders,
    revenue: Number(revenue._sum.total || 0),
    popularItems: popular,
    byHour,
    byDay,
  };
}
