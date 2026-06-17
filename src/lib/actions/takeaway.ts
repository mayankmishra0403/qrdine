"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { handleActionError } from "@/lib/errors";
import { serialize } from "@/lib/serialize";
import { isWhatsAppConfigured, sendWhatsAppMessage } from "@/lib/actions/whatsapp";

export async function getTakeawayData() {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    const rid = session.user.restaurantId;

    const [categories, restaurant] = await Promise.all([
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

    const takeawayOrders = await prisma.order.findMany({
      where: {
        restaurantId: rid,
        type: "takeaway",
        status: { notIn: ["served", "cancelled"] },
      },
      include: {
        items: { include: { item: true, variant: true } },
        customer: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true as const,
      data: serialize({
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
        orders: takeawayOrders.map((o) => ({
          id: o.id,
          status: o.status,
          items: o.items.map((i) => ({
            id: i.id,
            name: i.item.name + (i.variant ? ` (${i.variant.name})` : ""),
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
          })),
          total: Number(o.total),
          createdAt: o.createdAt.toISOString(),
          customer: o.customer,
        })),
        restaurant,
      }),
    };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function createTakeawayOrder(data: {
  items: Array<{ itemId: string; variantId?: string | null; quantity: number; unitPrice: number }>;
  customerPhone: string;
  customerName?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    const rid = session.user.restaurantId;

    const raw = data.customerPhone.replace(/\D/g, "");
    const fullPhone = raw.length === 10 ? "91" + raw : raw;

    const subtotal = data.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

    const customer = await prisma.customer.upsert({
      where: { restaurantId_phone: { restaurantId: rid, phone: fullPhone } },
      create: { phone: fullPhone, name: data.customerName, restaurantId: rid, totalOrders: 1, lastVisit: new Date() },
      update: { totalOrders: { increment: 1 }, lastVisit: new Date(), name: data.customerName || undefined },
    });

    const order = await prisma.order.create({
      data: {
        status: "confirmed",
        type: "takeaway",
        subtotal,
        total: subtotal,
        restaurantId: rid,
        customerId: customer.id,
        waiterId: session.user.id,
        tableId: undefined,
        items: {
          create: data.items.map((i) => ({
            itemId: i.itemId,
            variantId: i.variantId || null,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
        statusHistory: { create: { status: "confirmed", changedBy: session.user.name || "takeaway" } },
      },
      include: { items: { include: { item: true } }, customer: true, restaurant: true },
    });

    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: data.items.map((i) => i.itemId) } },
      select: { id: true, name: true },
    });
    const nameMap = Object.fromEntries(menuItems.map((m) => [m.id, m.name]));

    if (await isWhatsAppConfigured()) {
      const itemLines = data.items
        .map((i) => `  ${i.quantity}x ${nameMap[i.itemId] || i.itemId} — ₹${(i.unitPrice * i.quantity).toFixed(2)}`)
        .join("\n");
      await sendWhatsAppMessage(
        fullPhone,
        `📦 *Takeaway Order Confirmed* — ${order.restaurant.name}\n\n── Items ──\n${itemLines}\n─────────────\n*Total: ₹${subtotal.toFixed(2)}*\n\nWe'll notify you when ready for pickup.\nThank you!`
      );
    }

    revalidatePath("/admin/takeaway");
    return { success: true, data: serialize(order) };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function addTakeawayItems(orderId: string, items: Array<{ itemId: string; variantId?: string | null; quantity: number; unitPrice: number }>) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { item: true } }, customer: true, restaurant: true },
    });
    if (!order) throw new Error("Order not found");

    const additional = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const newSubtotal = Number(order.subtotal) + additional;

    await prisma.order.update({ where: { id: orderId }, data: { subtotal: newSubtotal, total: newSubtotal } });

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
      await sendWhatsAppMessage(
        order.customer.phone,
        `➕ *Items added to your takeaway order!*\n\n── Added ──\n${itemLines}\n─────────────\n*New Total: ₹${newSubtotal.toFixed(2)}*`
      );
    }

    revalidatePath("/admin/takeaway");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function requestTakeawayBill(orderId: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { item: true, variant: true } }, customer: true, restaurant: true },
    });
    if (!order) throw new Error("Order not found");

    const total = Number(order.total);
    const itemLines = order.items
      .map((i) => `  ${i.item.name}${i.variant ? ` (${i.variant.name})` : ""} ×${i.quantity} — ₹${(Number(i.unitPrice) * i.quantity).toFixed(2)}`)
      .join("\n");

    if (order.customer?.phone && (await isWhatsAppConfigured())) {
      const tunnelUrl = process.env.TUNNEL_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const billLink = `${tunnelUrl}/admin/bill/${orderId}`;
      const msg = `🧾 *Your Final Bill* — ${order.restaurant.name}\n\n── Items ──\n${itemLines}\n─────────────\n*Total: ₹${total.toFixed(2)}*\n\n📎 View Bill: ${billLink}\n\nPlease pay at the counter.\nThank you!`;
      await sendWhatsAppMessage(order.customer.phone, msg);
    }

    return { success: true, orderId, total };
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
    if (!order) throw new Error("Order not found");

    await prisma.order.update({ where: { id: orderId }, data: { status: "ready" } });
    await prisma.orderStatusHistory.create({
      data: { status: "ready", orderId, changedBy: session.user.name || "takeaway" },
    });

    if (order.customer?.phone && (await isWhatsAppConfigured())) {
      const tunnelUrl = process.env.TUNNEL_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      await sendWhatsAppMessage(
        order.customer.phone,
        `✅ *Your takeaway order is ready for pickup!*\n\nOrder from ${order.restaurant.name} is ready.\nPlease collect at the counter.\n\nTotal: ₹${Number(order.total).toFixed(2)}\n\n🧾 Bill: ${tunnelUrl}/admin/bill/${orderId}`
      );
    }

    revalidatePath("/admin/takeaway");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function completeTakeaway(orderId: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    await prisma.order.update({ where: { id: orderId }, data: { status: "served" } });
    await prisma.orderStatusHistory.create({
      data: { status: "served", orderId, changedBy: session.user.name || "takeaway" },
    });

    revalidatePath("/admin/takeaway");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}
