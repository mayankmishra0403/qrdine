"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { handleActionError } from "@/lib/errors";
import { serialize } from "@/lib/serialize";
import { numberToWords } from "@/lib/number-to-words";

const GST_SLABS = [
  { name: "GST 5%", rate: 5, cgstRate: 2.5, sgstRate: 2.5, igstRate: 5 },
  { name: "GST 12%", rate: 12, cgstRate: 6, sgstRate: 6, igstRate: 12 },
  { name: "GST 18%", rate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18 },
  { name: "GST 28%", rate: 28, cgstRate: 14, sgstRate: 14, igstRate: 28 },
  { name: "No GST", rate: 0, cgstRate: 0, sgstRate: 0, igstRate: 0 },
];

export async function initDefaultTaxSlabs() {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    const rid = session.user.restaurantId;

    const existing = await prisma.taxSlab.count({ where: { restaurantId: rid } });
    if (existing > 0) return { success: true, message: "Already initialized" };

    for (let i = 0; i < GST_SLABS.length; i++) {
      await prisma.taxSlab.create({
        data: {
          ...GST_SLABS[i],
          isDefault: i === 2,
          restaurantId: rid,
        },
      });
    }

    revalidatePath("/admin/settings/gst");
    return { success: true, message: "GST slabs initialized" };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function getTaxSlabs() {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    const slabs = await prisma.taxSlab.findMany({
      where: { restaurantId: session.user.restaurantId },
      orderBy: { rate: "asc" },
    });
    return { success: true as const, data: serialize(slabs) };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function updateTaxSlab(id: string, data: {
  name?: string; rate?: number; cgstRate?: number; sgstRate?: number; igstRate?: number; isDefault?: boolean;
}) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    if (data.isDefault) {
      await prisma.taxSlab.updateMany({
        where: { restaurantId: session.user.restaurantId },
        data: { isDefault: false },
      });
    }

    await prisma.taxSlab.update({ where: { id }, data });
    revalidatePath("/admin/settings/gst");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function updateRestaurantGst(data: { gstin?: string; pan?: string }) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    await prisma.restaurant.update({
      where: { id: session.user.restaurantId },
      data,
    });
    revalidatePath("/admin/settings/gst");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function calculateGstTax(
  subtotal: number,
  itemTaxSlabs: Array<{ slabRate: number; itemTotal: number }>,
  isInterState: boolean
) {
  const taxComponents: Array<{ name: string; rate: number; amount: number }> = [];
  let totalTax = 0;

  for (const item of itemTaxSlabs) {
    const slab = GST_SLABS.find((s) => s.rate === item.slabRate);
    if (!slab || slab.rate === 0) continue;

    if (isInterState) {
      const igst = (item.itemTotal * slab.igstRate) / 100;
      taxComponents.push({ name: `IGST ${slab.rate}%`, rate: slab.igstRate, amount: Math.round(igst * 100) / 100 });
      totalTax += igst;
    } else {
      const cgst = (item.itemTotal * slab.cgstRate) / 100;
      const sgst = (item.itemTotal * slab.sgstRate) / 100;
      taxComponents.push({ name: `CGST ${slab.cgstRate}%`, rate: slab.cgstRate, amount: Math.round(cgst * 100) / 100 });
      taxComponents.push({ name: `SGST ${slab.sgstRate}%`, rate: slab.sgstRate, amount: Math.round(sgst * 100) / 100 });
      totalTax += cgst + sgst;
    }
  }

  return { taxComponents, totalTax: Math.round(totalTax * 100) / 100 };
}

export async function generateGstInvoice(data: {
  orderId: string;
  customerGstin?: string;
  customerGstCategory?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: {
        items: { include: { item: true, variant: true } },
        table: true,
        restaurant: true,
        customer: true,
        payments: true,
      },
    });
    if (!order) throw new Error("Order not found");

    const invoiceNo = `GST-${order.id.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const subTotal = Number(order.subtotal);
    const discount = Number(order.discount);
    const taxableAmount = subTotal - discount;
    const cgstAmt = Number(order.taxAmount) / 2;
    const sgstAmt = Number(order.taxAmount) / 2;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        orderId: data.orderId,
        subTotal,
        taxAmount: Number(order.taxAmount),
        cgstAmount: cgstAmt,
        sgstAmount: sgstAmt,
        igstAmount: 0,
        discount,
        serviceCharge: Number(order.serviceCharge),
        total: Number(order.total),
        amountInWords: numberToWords(Number(order.total)),
        paymentStatus: "paid",
        restaurantId: session.user.restaurantId,
        customerId: order.customerId,
      },
    });

    revalidatePath("/admin/orders");
    return { success: true, data: serialize(invoice) };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}
