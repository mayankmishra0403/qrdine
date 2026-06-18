"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { handleActionError, ValidationError } from "@/lib/errors";
import { serialize } from "@/lib/serialize";
import { isWhatsAppConfigured, sendWhatsAppMessage } from "@/lib/actions/whatsapp";
import { earnLoyaltyPoints } from "@/lib/actions/loyalty";
import { numberToWords } from "@/lib/number-to-words";

export async function getPosData() {
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
      prisma.restaurant.findUnique({ where: { id: rid } }),
    ]);

    const orders = await prisma.order.findMany({
      where: {
        restaurantId: rid,
        status: { notIn: ["served", "cancelled"] },
      },
      include: {
        items: { include: { item: true, variant: true } },
        table: true,
        customer: true,
      },
      orderBy: { createdAt: "desc" },
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
            variants: item.variants.map((v) => ({
              id: v.id,
              name: v.name,
              priceMod: Number(v.priceMod),
            })),
          })),
        })),
        orders,
        restaurant: restaurant
          ? {
              currency: restaurant.currency,
              taxRate: Number(restaurant.taxRate),
              serviceCharge: Number(restaurant.serviceCharge),
            }
          : null,
      }),
    };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function createPosOrder(data: {
  tableId: string;
  items: Array<{
    itemId: string;
    variantId?: string | null;
    quantity: number;
    unitPrice: number;
  }>;
  orderType?: string;
  waiterId?: string;
  customerPhone?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const table = await prisma.table.findUnique({
      where: { id: data.tableId },
    });
    if (!table) throw new Error("Table not found");
    if (table.status === "merged") throw new Error("Cannot create order on a merged table. Unmerge first.");
    if (table.status === "occupied" && data.orderType !== "takeaway" && data.orderType !== "delivery") {
      throw new Error("Table is occupied. Use the existing order or mark it as served first.");
    }

    const subtotal = data.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const orderType = data.orderType || "dine-in";

    let customerId: string | undefined;
    if (data.customerPhone) {
      const customer = await prisma.customer.upsert({
        where: {
          restaurantId_phone: {
            restaurantId: session.user.restaurantId,
            phone: data.customerPhone,
          },
        },
        create: {
          phone: data.customerPhone,
          restaurantId: session.user.restaurantId,
          totalOrders: 1,
          lastVisit: new Date(),
        },
        update: {
          totalOrders: { increment: 1 },
          lastVisit: new Date(),
        },
      });
      customerId = customer.id;
    }

    const order = await prisma.order.create({
      data: {
        status: "confirmed",
        type: orderType,
        subtotal,
        total: subtotal,
        tableId: data.tableId,
        restaurantId: session.user.restaurantId,
        waiterId: data.waiterId,
        customerId,
        items: {
          create: data.items.map((i) => ({
            itemId: i.itemId,
            variantId: i.variantId || null,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
        statusHistory: {
          create: {
            status: "confirmed",
            changedBy: session.user.name || "pos",
          },
        },
      },
      include: {
        items: { include: { item: true, variant: true } },
        table: true,
      },
    });

    if (orderType === "dine-in") {
      await prisma.table.update({
        where: { id: data.tableId },
        data: { status: "occupied" },
      });
    }

    revalidatePath("/admin/pos");
    return { success: true, data: serialize(order) };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function processPayment(data: {
  orderId: string;
  method: string;
  amount: number;
  reference?: string;
  customerPhone?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: {
        items: { include: { item: true } },
        table: true,
        restaurant: true,
        customer: true,
      },
    });
    if (!order) throw new Error("Order not found");

    if (data.customerPhone && !order.customerId) {
      const customer = await prisma.customer.upsert({
        where: {
          restaurantId_phone: {
            restaurantId: session.user.restaurantId,
            phone: data.customerPhone,
          },
        },
        create: {
          phone: data.customerPhone,
          restaurantId: session.user.restaurantId,
          totalOrders: 1,
          lastVisit: new Date(),
        },
        update: {
          totalOrders: { increment: 1 },
          lastVisit: new Date(),
        },
      });
      await prisma.order.update({
        where: { id: data.orderId },
        data: { customerId: customer.id },
      });
      order.customerId = customer.id;
      order.customer = customer;
    }

    const payment = await prisma.payment.create({
      data: {
        orderId: data.orderId,
        amount: data.amount,
        method: data.method,
        reference: data.reference,
        userId: session.user.id,
      },
    });

    const totalTax = Number(order.taxAmount);
    const invoiceNo = `GST-${order.id.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        orderId: data.orderId,
        subTotal: Number(order.subtotal),
        taxAmount: totalTax,
        cgstAmount: totalTax / 2,
        sgstAmount: totalTax / 2,
        igstAmount: 0,
        discount: Number(order.discount),
        serviceCharge: Number(order.serviceCharge),
        total: Number(order.total),
        amountInWords: numberToWords(Number(order.total)),
        paymentStatus: "paid",
        restaurantId: session.user.restaurantId,
        customerId: order.customerId,
      },
    });

    await prisma.order.update({
      where: { id: data.orderId },
      data: { status: "served" },
    });

    await prisma.orderStatusHistory.create({
      data: {
        status: "served",
        orderId: data.orderId,
        changedBy: session.user.name || "pos",
      },
    });

    const activeOrders = await prisma.order.count({
      where: {
        tableId: order.tableId,
        status: { notIn: ["served", "cancelled"] },
      },
    });

    if (activeOrders === 0 && order.tableId) {
      await prisma.table.update({
        where: { id: order.tableId },
        data: { status: "vacant" },
      });
    }

    let loyaltyMsg = "";
    if (order.customerId) {
      const earnResult = await earnLoyaltyPoints(data.orderId);
      if (earnResult?.success && earnResult.points && order.customer?.phone) {
        const loyalty = await prisma.loyaltyProgram.findUnique({
          where: { customerId: order.customerId },
        });
        if (loyalty) {
          const available = loyalty.pointsEarned - loyalty.pointsRedeemed;
          loyaltyMsg = `\n\n⭐ You earned ${earnResult.points} loyalty points!\nTotal: ${loyalty.pointsEarned} pts | Available: ${available} pts`;
        }
      }
    }

    if (order.customer?.phone && (await isWhatsAppConfigured())) {
      const itemLines = order.items
        .map(
          (i) =>
            `  ${i.item.name} ×${i.quantity} — ₹${(Number(i.unitPrice) * i.quantity).toFixed(2)}`
        )
        .join("\n");
      const msg =
        `Thanks for dining at ${order.restaurant.name}!\n\n── Final Bill ──\n${itemLines}\n────────────────\n` +
        `Subtotal: ₹${Number(order.subtotal).toFixed(2)}` +
        (Number(order.taxAmount) > 0 ? `\nTax: ₹${Number(order.taxAmount).toFixed(2)}` : "") +
        (Number(order.discount) > 0 ? `\nDiscount: -₹${Number(order.discount).toFixed(2)}` : "") +
        `\nTotal: ₹${Number(order.total).toFixed(2)}\n` +
        `Paid via: ${data.method.toUpperCase()}` +
        `\n\nInvoice #${invoiceNo}\nWe hope to see you again!` +
        loyaltyMsg;

      sendWhatsAppMessage(order.customer.phone, msg).catch((err: Error) => console.error("[WhatsApp] Send message error:", err.message));
    }

    revalidatePath("/admin/pos");
    revalidatePath("/admin/orders");
    return { success: true, data: serialize({ payment, invoice }) };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function updateOrderTotals(data: {
  orderId: string;
  discount: number;
  discountType?: string;
  taxRate: number;
  serviceCharge: number;
}) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: { items: true },
    });
    if (!order) throw new Error("Order not found");

    const subtotal = Number(order.subtotal);
    const discountAmount =
      data.discountType === "percentage"
        ? subtotal * (data.discount / 100)
        : data.discount;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (data.taxRate / 100);
    const chargeAmount = afterDiscount * (data.serviceCharge / 100);
    const total = afterDiscount + taxAmount + chargeAmount;

    await prisma.order.update({
      where: { id: data.orderId },
      data: {
        discount: discountAmount,
        discountType: data.discountType || "fixed",
        taxAmount,
        serviceCharge: chargeAmount,
        total: Math.round(total * 100) / 100,
      },
    });

    revalidatePath("/admin/pos");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function mergeTables(mainTableId: string, mergedTableId: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    const rid = session.user.restaurantId;

    const [mainTable, mergedTable] = await Promise.all([
      prisma.table.findUnique({ where: { id: mainTableId } }),
      prisma.table.findUnique({ where: { id: mergedTableId } }),
    ]);
    if (!mainTable || !mergedTable) throw new Error("Table not found");

    await prisma.order.updateMany({
      where: { tableId: mergedTableId, status: { notIn: ["served", "cancelled"] } },
      data: { tableId: mainTableId },
    });

    await prisma.table.update({
      where: { id: mergedTableId },
      data: { status: "merged", mergedIntoId: mainTableId },
    });

    const hasActiveOrders = await prisma.order.count({
      where: { tableId: mainTableId, status: { notIn: ["served", "cancelled"] } },
    });
    if (hasActiveOrders > 0) {
      await prisma.table.update({
        where: { id: mainTableId },
        data: { status: "occupied" },
      });
    }

    revalidatePath("/admin/pos");
    revalidatePath("/admin/tables");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function unmergeTable(tableId: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    await prisma.table.update({
      where: { id: tableId },
      data: { status: "vacant", mergedIntoId: null },
    });

    revalidatePath("/admin/pos");
    revalidatePath("/admin/tables");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function transferOrder(orderId: string, newTableId: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { table: true },
    });
    if (!order) throw new Error("Order not found");

    const oldTableId = order.tableId;
    if (!oldTableId) throw new Error("Order has no table to transfer from");

    await prisma.order.update({
      where: { id: orderId },
      data: { tableId: newTableId },
    });

    const oldTableHasOrders = await prisma.order.count({
      where: { tableId: oldTableId, status: { notIn: ["served", "cancelled"] } },
    });
    if (oldTableHasOrders === 0) {
      await prisma.table.update({
        where: { id: oldTableId },
        data: { status: "vacant" },
      });
    }

    await prisma.table.update({
      where: { id: newTableId },
      data: { status: "occupied" },
    });

    revalidatePath("/admin/pos");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}
