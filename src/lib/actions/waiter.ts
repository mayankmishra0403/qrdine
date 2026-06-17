"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { handleActionError } from "@/lib/errors";
import { serialize } from "@/lib/serialize";
import { isWhatsAppConfigured, sendWhatsAppMessage } from "@/lib/actions/whatsapp";

export async function getWaiterData() {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    const rid = session.user.restaurantId;

    const [tables, categories, restaurant] = await Promise.all([
      prisma.table.findMany({
        where: { restaurantId: rid },
        include: { room: { select: { name: true } } },
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
      prisma.restaurant.findUnique({ where: { id: rid }, select: { name: true, currency: true } }),
    ]);

    const activeOrders = await prisma.order.findMany({
      where: {
        restaurantId: rid,
        status: { notIn: ["served", "cancelled"] },
      },
      include: {
        items: { include: { item: true, variant: true } },
        table: { select: { tableNumber: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      success: true as const,
      data: serialize({
        tables,
        categories: categories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          items: cat.menuItems.map((item) => ({
            id: item.id,
            name: item.name,
            price: Number(item.price),
            variants: item.variants.map((v) => ({ id: v.id, name: v.name, priceMod: Number(v.priceMod) })),
          })),
        })),
        orders: activeOrders.map((o) => ({
          id: o.id,
          status: o.status,
          tableNumber: o.table?.tableNumber ?? 0,
          items: o.items.map((i) => ({
            id: i.id,
            name: i.item.name + (i.variant ? ` (${i.variant.name})` : ""),
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
          })),
          total: Number(o.total),
          createdAt: o.createdAt.toISOString(),
        })),
        restaurant,
      }),
    };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function createWaiterOrder(data: {
  tableId: string;
  items: Array<{ itemId: string; variantId?: string | null; quantity: number; unitPrice: number }>;
  customerPhone?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const table = await prisma.table.findUnique({ where: { id: data.tableId }, include: { restaurant: true } });
    if (!table) throw new Error("Table not found");
    if (table.status === "merged") throw new Error("Table is merged");

    const subtotal = data.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    let fullPhone: string | undefined;

    if (data.customerPhone) {
      const raw = data.customerPhone.replace(/\D/g, "");
      fullPhone = raw.length === 10 ? "91" + raw : raw;
    }

    const order = await prisma.$transaction(async (tx) => {
      let customerId: string | undefined;
      if (fullPhone) {
        const phone = fullPhone as string;
        const customer = await tx.customer.upsert({
          where: { restaurantId_phone: { restaurantId: table.restaurantId, phone } },
          create: { phone, restaurantId: table.restaurantId, totalOrders: 1, lastVisit: new Date() },
          update: { totalOrders: { increment: 1 }, lastVisit: new Date() },
        });
        customerId = customer.id;
      }

      const created = await tx.order.create({
        data: {
          status: "confirmed",
          type: "dine-in",
          subtotal,
          total: subtotal,
          tableId: data.tableId,
          restaurantId: table.restaurantId,
          waiterId: session.user.id,
          customerId,
          items: { create: data.items.map((i) => ({ itemId: i.itemId, variantId: i.variantId || null, quantity: i.quantity, unitPrice: i.unitPrice })) },
          statusHistory: { create: { status: "confirmed", changedBy: session.user.name || "waiter" } },
        },
        include: { items: { include: { item: true } }, restaurant: true, customer: true },
      });

      await tx.table.update({ where: { id: data.tableId }, data: { status: "occupied" } });
      return created;
    });

    if (fullPhone && (await isWhatsAppConfigured())) {
      const menuItems = await prisma.menuItem.findMany({
        where: { id: { in: data.items.map((i) => i.itemId) } },
        select: { id: true, name: true },
      });
      const nameMap = Object.fromEntries(menuItems.map((m) => [m.id, m.name]));
      const itemLines = data.items
        .map((i) => `  ${i.quantity}x ${nameMap[i.itemId] || i.itemId} — ₹${(i.unitPrice * i.quantity).toFixed(2)}`)
        .join("\n");
      const result = await sendWhatsAppMessage(
        fullPhone,
        `✅ Order confirmed at ${table.restaurant.name}!\n\n── Items ──\n${itemLines}\n─────────────\nTotal: ₹${subtotal.toFixed(2)}\n\nWe'll notify you when ready.`
      );
      if (!result.success) console.error("[Waiter] WhatsApp send failed:", result.error);
    }

    revalidatePath("/waiter");
    return { success: true, data: serialize(order) };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function addItemsToOrder(orderId: string, items: Array<{ itemId: string; variantId?: string | null; quantity: number; unitPrice: number }>) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { item: true } }, restaurant: true, customer: true },
    });
    if (!order) throw new Error("Order not found");

    const additionalTotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const newSubtotal = Number(order.subtotal) + additionalTotal;

    await prisma.order.update({
      where: { id: orderId },
      data: { subtotal: newSubtotal, total: newSubtotal },
    });

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
      const addResult = await sendWhatsAppMessage(
        order.customer.phone,
        `Items added to your order!\n\n── Added ──\n${itemLines}\n─────────────\nNew total: ₹${newSubtotal.toFixed(2)}`
      );
      if (!addResult.success) console.error("[Waiter] Add items WhatsApp failed:", addResult.error);
    }

    revalidatePath("/waiter");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function requestBill(orderId: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { item: true, variant: true } }, table: true, restaurant: true, customer: true },
    });
    if (!order) throw new Error("Order not found");

    const total = Number(order.total);
    const shortId = order.id.slice(-6).toUpperCase();
    const itemLines = order.items
      .map((i) => `  ${i.item.name}${i.variant ? ` (${i.variant.name})` : ""} ×${i.quantity} — ₹${(Number(i.unitPrice) * i.quantity).toFixed(2)}`)
      .join("\n");

    if (order.customer?.phone && (await isWhatsAppConfigured())) {
      const billLink = `${process.env.TUNNEL_URL || "http://localhost:3000"}/bill/${orderId}`;
      const billMsg = `🧾 *Your Final Bill* - ${order.restaurant.name}\n\n── Items ──\n${itemLines}\n─────────────\n*Total: ₹${total.toFixed(2)}*\n\n📎 Open Bill: ${billLink}\n\nPlease pay at the counter.\nThank you!`;
      const billResult = await sendWhatsAppMessage(order.customer.phone, billMsg);
      if (!billResult.success) console.error("[Waiter] Bill WhatsApp failed:", billResult.error);
    }

    return { success: true, orderId, total };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}
