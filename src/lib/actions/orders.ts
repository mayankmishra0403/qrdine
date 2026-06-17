"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { placeOrderSchema } from "@/lib/validation";
import { handleActionError, ValidationError } from "@/lib/errors";
import { serialize } from "@/lib/serialize";
import { isWhatsAppConfigured, sendWhatsAppMessage } from "@/lib/actions/whatsapp";

type CartItem = {
  itemId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
};

export async function placeOrder(
  tableId: string,
  items: CartItem[],
  notes: string,
  phone: string
) {
  try {
    const parsed = placeOrderSchema.safeParse({ tableId, items, notes, phone });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const table = await prisma.table.findUnique({
      where: { id: parsed.data.tableId },
      include: { restaurant: true, mergedInto: true },
    });

    if (!table) throw new Error("Table not found");
    if (table.status === "merged") throw new Error("This table has been merged. Please use the main table.");
    if (table.status === "occupied") {
      throw new Error("Table is currently occupied. An order is already in progress.");
    }

    const total = parsed.data.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    const order = await prisma.$transaction(async (tx) => {
      let customerId: string | undefined;

      const normalized = parsed.data.phone;
      const customer = await tx.customer.upsert({
        where: {
          restaurantId_phone: {
            restaurantId: table.restaurantId,
            phone: normalized,
          },
        },
        create: {
          phone: normalized,
          restaurantId: table.restaurantId,
          totalOrders: 1,
          lastVisit: new Date(),
        },
        update: {
          totalOrders: { increment: 1 },
          lastVisit: new Date(),
        },
      });
      customerId = customer.id;

      const created = await tx.order.create({
        data: {
          status: "pending",
          subtotal: total,
          total,
          notes: parsed.data.notes,
          tableId: table.id,
          restaurantId: table.restaurantId,
          customerId,
          items: {
            create: parsed.data.items.map((item) => ({
              itemId: item.itemId,
              variantId: item.variantId || null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
          statusHistory: {
            create: {
              status: "pending",
              changedBy: "customer",
            },
          },
        },
        include: {
          items: { include: { item: true, variant: true } },
          table: true,
        },
      });

      await tx.table.update({
        where: { id: table.id },
        data: { status: "occupied" },
      });

      return created;
    });

    revalidatePath("/kitchen");
    revalidatePath("/admin/orders");

    let whatsappSent = false;
    if (await isWhatsAppConfigured()) {
      const restaurant = table.restaurant;
      const shortId = order.id.slice(-6).toUpperCase();
      const itemLines = order.items
        .map((i) => {
          const name = i.item.name + (i.variant ? ` (${i.variant.name})` : "");
          return `  ${name} ×${i.quantity} — ₹${(Number(i.unitPrice) * i.quantity).toFixed(2)}`;
        })
        .join("\n");
      const msg = `Hi! Your order #${shortId} has been placed at ${restaurant.name}.\n\n── Receipt ──\n${itemLines}\n─────────────\nTotal: ₹${Number(order.total).toFixed(2)}\n\nWe'll notify you when it's confirmed. Thank you!`;
      const result = await sendWhatsAppMessage(parsed.data.phone, msg);
      if (result.success) {
        whatsappSent = true;
      } else {
        console.warn("WhatsApp send failed:", result.error);
      }
    }

    return {
      success: true,
      id: order.id,
      status: order.status,
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
      whatsappSent,
      items: order.items.map((i) => ({
        id: i.id,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        item: { id: i.item.id, name: i.item.name },
        variant: i.variant
          ? { id: i.variant.id, name: i.variant.name }
          : null,
      })),
    };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const validStatuses = [
      "pending", "confirmed", "preparing", "ready", "served", "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      throw new ValidationError("Invalid status");
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: true,
        customer: true,
        table: true,
      },
    });
    if (!order || order.restaurantId !== session.user.restaurantId) {
      throw new Error("Order not found");
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status },
      });
      await tx.orderStatusHistory.create({
        data: { status, orderId, changedBy: session.user.name || "staff" },
      });
    });

    revalidatePath("/kitchen");
    revalidatePath("/admin/orders");

    if (await isWhatsAppConfigured() && order.customer?.phone) {
      const shortId = order.id.slice(-6).toUpperCase();
      const restaurantName = order.restaurant.name;
      const tableNum = order.table?.tableNumber ?? 0;
      let msg = "";

      switch (status) {
        case "confirmed": {
          const orderItems = await prisma.orderItem.findMany({
            where: { orderId },
            include: { item: true, variant: true },
          });
          const itemLines = orderItems
            .map((i) => {
              const name = i.item.name + (i.variant ? ` (${i.variant.name})` : "");
              return `  ${name} ×${i.quantity} — ₹${(Number(i.unitPrice) * i.quantity).toFixed(2)}`;
            })
            .join("\n");
          msg = `Your order #${shortId} at ${restaurantName} has been confirmed!\n\n── Receipt ──\n${itemLines}\n─────────────\nTotal: ₹${Number(order.total).toFixed(2)}\n\nWe'll start preparing it shortly.`;
          break;
        }
        case "ready":
          msg = `Your order #${shortId} at ${restaurantName} is ready for pickup from Table ${tableNum}! Please collect from the counter.`;
          break;
        case "served": {
          const orderItems = await prisma.orderItem.findMany({
            where: { orderId },
            include: { item: true, variant: true },
          });
          const itemLines = orderItems
            .map((i) => {
              const name = i.item.name + (i.variant ? ` (${i.variant.name})` : "");
              return `  ${name} ×${i.quantity} — ₹${(Number(i.unitPrice) * i.quantity).toFixed(2)}`;
            })
            .join("\n");
          const total = Number(order.total);
          msg = `Thanks for dining at ${restaurantName}!\n\n── Final Bill ──\n${itemLines}\n────────────────\nTotal: ₹${total.toFixed(2)}\n\nWe hope to see you again!`;
          break;
        }
        case "cancelled":
          msg = `Your order #${shortId} at ${restaurantName} has been cancelled. Please contact the restaurant for details.`;
          break;
        default:
          break;
      }

      if (msg) {
        sendWhatsAppMessage(order.customer.phone, msg).catch(() => {});
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function getActiveOrders() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.order.findMany({
    where: {
      restaurantId: session.user.restaurantId,
      status: { notIn: ["served", "cancelled"] },
    },
    include: {
      table: true,
      items: { include: { item: true, variant: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getOrder(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { item: true, variant: true } },
      table: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });
}
