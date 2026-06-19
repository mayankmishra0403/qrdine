"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { handleActionError } from "@/lib/errors";
import { serialize } from "@/lib/serialize";
import { isWhatsAppConfigured, sendWhatsAppMessage, sendKOT, sendWaiterNotification, sendCustomerBill } from "@/lib/actions/whatsapp";
import { sendPushToRole, sendPushToAll } from "@/lib/actions/push";

export async function getWaiterAppData() {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    const rid = session.user.restaurantId;

    const [tables, categories, restaurant] = await Promise.all([
      prisma.table.findMany({
        where: { restaurantId: rid },
        orderBy: { tableNumber: "asc" },
      }),
      prisma.menuCategory.findMany({
        where: { restaurantId: rid },
        include: {
          menuItems: {
            where: { isAvailable: true },
            include: { variants: true },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.restaurant.findUnique({ where: { id: rid }, select: { name: true } }),
    ]);

    const activeOrders = await prisma.order.findMany({
      where: {
        restaurantId: rid,
        status: { notIn: ["served", "cancelled"] },
      },
      include: {
        items: { include: { item: true, variant: true } },
        table: { select: { tableNumber: true } },
        customer: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return {
      success: true as const,
      data: serialize({
        restaurant: restaurant?.name || "Restaurant",
        tables: tables.map((t) => ({ id: t.id, tableNumber: t.tableNumber, status: t.status, capacity: t.capacity })),
        categories: categories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          items: cat.menuItems.map((item) => ({
            id: item.id, name: item.name, price: Number(item.price),
            variants: item.variants.map((v) => ({ id: v.id, name: v.name, priceMod: Number(v.priceMod) })),
          })),
        })),
        orders: activeOrders.map((o) => ({
          id: o.id, status: o.status, type: o.type, total: Number(o.total),
          tableNumber: o.table?.tableNumber ?? null,
          customerName: o.customer?.name, customerPhone: o.customer?.phone,
          itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
          items: o.items.map((i) => ({
            name: i.item.name + (i.variant ? ` (${i.variant.name})` : ""),
            quantity: i.quantity, unitPrice: Number(i.unitPrice),
          })),
          createdAt: o.createdAt.toISOString(),
        })),
      }),
    };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function createWaiterAppOrder(data: {
  type: "dine-in" | "takeaway";
  tableId?: string;
  customerPhone?: string;
  customerName?: string;
  items: Array<{ itemId: string; variantId?: string | null; quantity: number; unitPrice: number }>;
  instantBill?: boolean;
}) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    const rid = session.user.restaurantId;

    let fullPhone: string | undefined;
    if (data.customerPhone) {
      const raw = data.customerPhone.replace(/\D/g, "");
      fullPhone = raw.length === 10 ? "91" + raw : raw;
    }

    let table = null;
    if (data.tableId) {
      table = await prisma.table.findUnique({ where: { id: data.tableId } });
      if (!table) throw new Error("Table not found");
      if (table.status === "merged") throw new Error("Table is merged");
    }

    const subtotal = data.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

    let customerId: string | undefined;
    if (fullPhone) {
      const customer = await prisma.customer.upsert({
        where: { restaurantId_phone: { restaurantId: rid, phone: fullPhone } },
        create: { phone: fullPhone, name: data.customerName, restaurantId: rid, totalOrders: 1, lastVisit: new Date() },
        update: { totalOrders: { increment: 1 }, lastVisit: new Date(), name: data.customerName || undefined },
      });
      customerId = customer.id;
    }

    const order = await prisma.order.create({
      data: {
        status: "confirmed",
        type: data.type,
        subtotal,
        total: subtotal,
        tableId: table?.id,
        restaurantId: rid,
        customerId,
        waiterId: session.user.id,
        items: { create: data.items.map((i) => ({ itemId: i.itemId, variantId: i.variantId || null, quantity: i.quantity, unitPrice: i.unitPrice })) },
        statusHistory: { create: { status: "confirmed", changedBy: session.user.name || "waiter" } },
      },
      include: { items: { include: { item: true } }, table: true, customer: true, restaurant: true },
    });

    if (table && data.type === "dine-in") {
      await prisma.table.update({ where: { id: table.id }, data: { status: "occupied" } });
    }

    const orderItems = order.items.map((i) => ({
      name: i.item.name,
      variant: null,
      quantity: i.quantity,
    }));

    if (await isWhatsAppConfigured()) {
      const rest = order.restaurant;
      sendKOT(rest?.kitchenPhone || "", {
        kotNumber: order.id.slice(-6).toUpperCase(),
        tableNumber: order.table?.tableNumber,
        items: orderItems,
      }).catch((err: Error) => console.error("[KOT] Send error:", err.message));

      sendWaiterNotification(rest?.waiterPhone || "", {
        tableNumber: order.table?.tableNumber,
        customerName: order.customer?.name,
        customerPhone: fullPhone,
        items: orderItems,
      }).catch((err: Error) => console.error("[Waiter] Send error:", err.message));
    }

    if (order.restaurantId) {
      const tableStr = order.table?.tableNumber ? `Table ${order.table.tableNumber}` : "Takeaway";
      sendPushToRole(order.restaurantId, "kitchen", `🍳 New Order`, `${tableStr} — ${orderItems.length} items`, { url: "/kitchen", orderId: order.id }).catch(() => {});
      sendPushToRole(order.restaurantId, "waiter", `📋 New Order`, `${tableStr} · ₹${subtotal.toFixed(0)}`, { url: "/waiter-app/orders", orderId: order.id }).catch(() => {});
    }

    if (fullPhone && (await isWhatsAppConfigured())) {
      const billUrl = `${process.env.TUNNEL_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/bill/${order.id}`;

      if (data.type === "takeaway") {
        await sendWhatsAppMessage(fullPhone,
          `📦 *Takeaway Order Confirmed*\n📎 ${billUrl}\n\nWe'll notify you when ready.`);

        if (data.instantBill) {
          await sendWhatsAppMessage(fullPhone,
            `🧾 *Your Bill*\nTotal: ₹${subtotal.toFixed(2)}\n📎 ${billUrl}\n\nPlease pay at the counter.`);
        }
      } else {
        await sendWhatsAppMessage(fullPhone,
          `✅ *Order Confirmed*\n📎 ${billUrl}\n\nWe'll notify you when ready.`);
      }
    }

    revalidatePath("/waiter-app");
    return { success: true, data: serialize({ id: order.id, total: subtotal }) };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function addWaiterAppItems(orderId: string, items: Array<{ itemId: string; variantId?: string | null; quantity: number; unitPrice: number }>) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, restaurant: true },
    });
    if (!order) throw new Error("Order not found");

    const additional = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const newTotal = Number(order.total) + additional;

    await prisma.order.update({ where: { id: orderId }, data: { total: newTotal } });
    for (const item of items) {
      await prisma.orderItem.create({
        data: { orderId, itemId: item.itemId, variantId: item.variantId || null, quantity: item.quantity, unitPrice: item.unitPrice },
      });
    }

    if (order.customer?.phone && (await isWhatsAppConfigured())) {
      const menuItems = await prisma.menuItem.findMany({
        where: { id: { in: items.map((i) => i.itemId) } },
        select: { id: true, name: true },
      });
      const nameMap = Object.fromEntries(menuItems.map((m) => [m.id, m.name]));
      const itemLines = items.map((i) => `  ${i.quantity}x ${nameMap[i.itemId] || i.itemId} — ₹${(i.unitPrice * i.quantity).toFixed(2)}`).join("\n");
      await sendWhatsAppMessage(order.customer.phone, `➕ *Items added!*\n${itemLines}\n*New Total: ₹${newTotal.toFixed(2)}*`);
    }

    revalidatePath("/waiter-app");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function requestWaiterBill(orderId: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { item: true, variant: true } }, customer: true, restaurant: true, table: true },
    });
    if (!order) throw new Error("Order not found");

    const total = Number(order.total);
    const itemLines = order.items.map((i) => `  ${i.item.name}${i.variant ? ` (${i.variant.name})` : ""} ×${i.quantity} — ₹${(Number(i.unitPrice) * i.quantity).toFixed(2)}`).join("\n");
    const tunnelUrl = process.env.TUNNEL_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const billLink = `${tunnelUrl}/bill/${orderId}`;

    if (order.customer?.phone && (await isWhatsAppConfigured())) {
      await sendWhatsAppMessage(order.customer.phone,
        `🧾 *Your Bill*\n\n── Items ──\n${itemLines}\n─────────────\n*Total: ₹${total.toFixed(2)}*\n\n📎 View Bill: ${billLink}\n\nThank you!`);
    }

    return { success: true, orderId, total, billLink };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function markTakeawayReady(orderId: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, restaurant: true },
    });

    await prisma.order.update({ where: { id: orderId }, data: { status: "ready" } });
    await prisma.orderStatusHistory.create({ data: { status: "ready", orderId, changedBy: session.user.name || "waiter" } });

    if (order?.customer?.phone && (await isWhatsAppConfigured())) {
      await sendWhatsAppMessage(order.customer.phone, `✅ *Your order is ready!*\n\n${order.restaurant?.name}\nPlease collect at the counter.`);
    }

    revalidatePath("/waiter-app");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}
