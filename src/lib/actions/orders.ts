"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { placeOrderSchema } from "@/lib/validation";
import { handleActionError, ValidationError } from "@/lib/errors";
import { serialize } from "@/lib/serialize";
import { isWhatsAppConfigured, sendWhatsAppMessage, sendKOT, sendWaiterNotification, sendCustomerBill } from "@/lib/actions/whatsapp";
import { earnLoyaltyPoints } from "@/lib/actions/loyalty";
import { sendPushToRole } from "@/lib/actions/push";
import { publish, CHANNELS } from "@/lib/redis";

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

    if (await isWhatsAppConfigured()) {
      const orderItems = order.items.map((i) => ({
        name: i.item.name,
        variant: i.variant?.name,
        quantity: i.quantity,
      }));

      sendKOT(table.restaurant.kitchenPhone || "", {
        kotNumber: order.id.slice(-6).toUpperCase(),
        tableNumber: order.table?.tableNumber,
        items: orderItems,
      }).catch((err: Error) => console.error("[KOT] Send error:", err.message));

      sendWaiterNotification(table.restaurant.waiterPhone || "", {
        tableNumber: order.table?.tableNumber,
        customerName: null,
        customerPhone: parsed.data.phone,
        items: orderItems,
      }).catch((err: Error) => console.error("[Waiter] Send error:", err.message));
    }

    if (table.restaurantId) {
      const tableStr = table.tableNumber ? `Table ${table.tableNumber}` : "Takeaway";
      sendPushToRole(table.restaurantId, "kitchen", `🍳 New Order`, `${tableStr} — ${order.items.length} items`, { url: "/kitchen", orderId: order.id }).catch(() => {});

      publish(CHANNELS.KDS_NEW_ORDER, {
        orderId: order.id,
        tableNumber: table.tableNumber,
        itemCount: order.items.length,
        status: order.status,
      }).catch(() => {});
      publish(CHANNELS.POS_TABLE_UPDATE, {
        tableId: table.id,
        status: "occupied",
      }).catch(() => {});
    }

    let whatsappSent = false;
    if (await isWhatsAppConfigured()) {
      const billUrl = `${process.env.TUNNEL_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/bill/${order.id}`;
      const result = await sendWhatsAppMessage(parsed.data.phone,
        `✅ *Order Placed*\n📎 ${billUrl}\n\nWe'll notify you when confirmed.`);
      if (result.success) whatsappSent = true;
      else console.warn("WhatsApp send failed:", result.error);
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

    if (order.restaurantId) {
      const tableStr = order.table?.tableNumber ? `Table ${order.table.tableNumber}` : "Takeaway";
      publish(CHANNELS.KDS_STATUS_UPDATE, {
        orderId,
        status,
        tableNumber: order.table?.tableNumber,
      }).catch(() => {});

      if (status === "confirmed") {
        sendPushToRole(order.restaurantId, "kitchen", `✅ Order Confirmed`, `Order #${order.id.slice(-6)} confirmed`, { url: "/kitchen", orderId: order.id }).catch(() => {});
      } else if (status === "ready") {
        sendPushToRole(order.restaurantId, "waiter", `🛎️ Order Ready`, `${tableStr} — Order #${order.id.slice(-6)} is ready`, { url: "/waiter-app/orders", orderId: order.id }).catch(() => {});
        sendPushToRole(order.restaurantId, "admin", `🛎️ Order Ready`, `${tableStr} — Order #${order.id.slice(-6)} is ready`, { url: "/admin/orders", orderId: order.id }).catch(() => {});

        publish(CHANNELS.WAITER_ORDER_READY, {
          orderId,
          tableNumber: order.table?.tableNumber,
          status: "ready",
        }).catch(() => {});
      }
    }

    if (await isWhatsAppConfigured() && order.customer?.phone) {
      const billUrl = `${process.env.TUNNEL_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/bill/${order.id}`;

      if (status === "served") {
        let loyaltySuffix = "";
        const earnResult = await earnLoyaltyPoints(orderId);
        if (earnResult?.success && earnResult.points && order.customerId) {
          const loyalty = await prisma.loyaltyProgram.findUnique({
            where: { customerId: order.customerId },
          });
          if (loyalty) {
            const available = loyalty.pointsEarned - loyalty.pointsRedeemed;
            loyaltySuffix = `\n⭐ You earned ${earnResult.points} pts! Total: ${loyalty.pointsEarned} | Available: ${available}`;
          }
        }
        await sendCustomerBill(order.customer.phone, {
          total: Number(order.total),
          invoiceNo: `INV-${order.id.slice(-6).toUpperCase()}`,
          orderId: order.id,
          loyaltyMsg: loyaltySuffix || undefined,
        }).catch((err: Error) => console.error("[WhatsApp] Send failed:", err.message));
      } else if (status === "cancelled") {
        sendWhatsAppMessage(order.customer.phone, `❌ *Order Cancelled*`).catch(() => {});
      } else if (status === "confirmed") {
        sendWhatsAppMessage(order.customer.phone, `✅ *Order Confirmed*\n📎 ${billUrl}`).catch(() => {});
      } else if (status === "ready") {
        sendWhatsAppMessage(order.customer.phone, `✅ *Ready for pickup*\n📎 ${billUrl}`).catch(() => {});
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
