"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { serialize } from "@/lib/serialize";

export async function getAnalytics(range: string = "today") {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const rid = session.user.restaurantId;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(todayStart.getTime() - 7 * 86400000);
  const monthAgo = new Date(todayStart.getTime() - 30 * 86400000);

  let rangeStart: Date;
  let rangeLabel: string;
  switch (range) {
    case "today": rangeStart = todayStart; rangeLabel = "Today"; break;
    case "week": rangeStart = weekAgo; rangeLabel = "This Week"; break;
    case "month": rangeStart = monthAgo; rangeLabel = "This Month"; break;
    default: rangeStart = todayStart; rangeLabel = "Today";
  }

  const rangeOrders = await prisma.order.findMany({
    where: { restaurantId: rid, createdAt: { gte: rangeStart } },
    include: {
      items: { include: { item: true } },
      payments: true,
      table: true,
      waiter: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const served = rangeOrders.filter((o) => o.status === "served");
  const cancelled = rangeOrders.filter((o) => o.status === "cancelled");
  const active = rangeOrders.filter((o) => o.status !== "served" && o.status !== "cancelled");

  const revenue = served.reduce((s, o) => s + Number(o.total), 0);
  const itemCount = served.reduce((s, o) => s + o.items.reduce((si, i) => si + i.quantity, 0), 0);
  const avgOrderValue = served.length > 0 ? revenue / served.length : 0;

  const byHour: Record<string, number> = {};
  const byDay: Record<string, { revenue: number; orders: number }> = {};
  const byPaymentMethod: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byWaiter: Record<string, { orders: number; revenue: number }> = {};
  const itemSales: Record<string, { name: string; qty: number; revenue: number }> = {};

  for (const o of rangeOrders) {
    const hour = new Date(o.createdAt).getHours().toString().padStart(2, "0");
    byHour[hour] = (byHour[hour] || 0) + 1;

    const day = new Date(o.createdAt).toLocaleDateString("en-IN", { weekday: "short" });
    if (!byDay[day]) byDay[day] = { revenue: 0, orders: 0 };
    byDay[day].orders++;
    if (o.status === "served") byDay[day].revenue += Number(o.total);

    byType[o.type] = (byType[o.type] || 0) + 1;

    if (o.waiter?.name) {
      if (!byWaiter[o.waiter.name]) byWaiter[o.waiter.name] = { orders: 0, revenue: 0 };
      byWaiter[o.waiter.name].orders++;
      if (o.status === "served") byWaiter[o.waiter.name].revenue += Number(o.total);
    }

    for (const p of o.payments) {
      byPaymentMethod[p.method] = (byPaymentMethod[p.method] || 0) + Number(p.amount);
    }

    for (const i of o.items) {
      if (!itemSales[i.item.name]) itemSales[i.item.name] = { name: i.item.name, qty: 0, revenue: 0 };
      itemSales[i.item.name].qty += i.quantity;
      itemSales[i.item.name].revenue += Number(i.unitPrice) * i.quantity;
    }
  }

  const topItems = Object.values(itemSales).sort((a, b) => b.qty - a.qty).slice(0, 10);
  const bottomItems = Object.values(itemSales).sort((a, b) => a.qty - b.qty).slice(0, 10);

  const tableTurnTimes: number[] = [];
  const tableSessions: Record<string, { firstOrder?: Date; lastOrder?: Date }> = {};
  for (const o of served) {
    if (!o.tableId) continue;
    if (!tableSessions[o.tableId]) tableSessions[o.tableId] = {};
    if (!tableSessions[o.tableId].firstOrder || o.createdAt < tableSessions[o.tableId].firstOrder!) tableSessions[o.tableId].firstOrder = o.createdAt;
    if (!tableSessions[o.tableId].lastOrder || o.createdAt > tableSessions[o.tableId].lastOrder!) tableSessions[o.tableId].lastOrder = o.createdAt;
  }
  for (const s of Object.values(tableSessions)) {
    if (s.firstOrder && s.lastOrder) {
      tableTurnTimes.push((s.lastOrder.getTime() - s.firstOrder.getTime()) / 60000);
    }
  }
  const avgTurnTime = tableTurnTimes.length > 0
    ? tableTurnTimes.reduce((s, t) => s + t, 0) / tableTurnTimes.length
    : 0;

  const dailyRevenue: Array<{ date: string; revenue: number; orders: number }> = [];
  const dayBuckets: Record<string, { revenue: number; orders: number }> = {};
  for (const o of served) {
    const d = o.createdAt.toISOString().slice(0, 10);
    if (!dayBuckets[d]) dayBuckets[d] = { revenue: 0, orders: 0 };
    dayBuckets[d].revenue += Number(o.total);
    dayBuckets[d].orders++;
  }
  for (const [date, d] of Object.entries(dayBuckets)) {
    dailyRevenue.push({ date: new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), ...d });
  }

  return serialize({
    range: { label: rangeLabel, start: rangeStart.toISOString() },
    kpi: {
      revenue: Math.round(revenue * 100) / 100,
      orders: served.length,
      cancelled: cancelled.length,
      active: active.length,
      items: itemCount,
      avgOrder: Math.round(avgOrderValue * 100) / 100,
      avgTurnTime: Math.round(avgTurnTime * 10) / 10,
    },
    charts: {
      byHour: Object.entries(byHour).sort(([a], [b]) => a.localeCompare(b)).map(([hour, count]) => ({ hour, count })),
      byDay: Object.entries(byDay).map(([day, data]) => ({ day, ...data })),
      byPayment: Object.entries(byPaymentMethod).map(([method, amount]) => ({ method, amount: Math.round(amount * 100) / 100 })),
      byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
      dailyRevenue,
    },
    items: {
      top: topItems.map((i) => ({ ...i, revenue: Math.round(i.revenue * 100) / 100 })),
      bottom: bottomItems.map((i) => ({ ...i, revenue: Math.round(i.revenue * 100) / 100 })),
    },
    waiters: Object.entries(byWaiter).map(([name, data]) => ({ name, ...data, revenue: Math.round(data.revenue * 100) / 100 })),
  });
}
