"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { handleActionError } from "@/lib/errors";
import { serialize } from "@/lib/serialize";
import { numberToWords } from "@/lib/number-to-words";

export async function getPublicBillData(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            item: { select: { name: true, hsnCode: true } },
            variant: { select: { name: true } },
          },
        },
        table: { select: { tableNumber: true } },
        restaurant: { select: { name: true, address: true, phone: true, email: true, gstin: true, pan: true, currency: true, billFooter: true, billPaperSize: true } },
        customer: { select: { name: true, phone: true, gstin: true, gstCategory: true } },
        payments: { select: { method: true, amount: true, reference: true, createdAt: true } },
        invoice: true,
      },
    });

    if (!order) throw new Error("Order not found");

    const invoice = order.invoice;
    const items = order.items.map((i, idx) => ({
      sr: idx + 1,
      name: i.item.name + (i.variant ? ` (${i.variant.name})` : ""),
      hsn: i.item.hsnCode || "—",
      qty: i.quantity,
      rate: Number(i.unitPrice),
      amount: Number(i.unitPrice) * i.quantity,
    }));

    const subtotal = items.reduce((s, i) => s + i.amount, 0);
    const discount = Number(order.discount);
    const taxableAmt = subtotal - discount;
    const cgst = invoice ? Number(invoice.cgstAmount) : 0;
    const sgst = invoice ? Number(invoice.sgstAmount) : 0;
    const igst = invoice ? Number(invoice.igstAmount) : 0;
    const serviceCharge = Number(order.serviceCharge);
    const total = invoice ? Number(invoice.total) : Number(order.total);

    const hsnSummary: Record<string, { hsn: string; taxable: number; cgst: number; sgst: number; igst: number }> = {};
    for (const item of order.items) {
      const hsn = item.item.hsnCode || "996331";
      const amt = Number(item.unitPrice) * item.quantity;
      if (!hsnSummary[hsn]) hsnSummary[hsn] = { hsn, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      hsnSummary[hsn].taxable += amt;
    }
    Object.values(hsnSummary).forEach((h) => {
      h.cgst = (h.taxable / taxableAmt) * cgst;
      h.sgst = (h.taxable / taxableAmt) * sgst;
      h.igst = (h.taxable / taxableAmt) * igst;
    });

    return {
      success: true as const,
      data: serialize({
        invoiceNo: invoice?.invoiceNo || `INV-${order.id.slice(-6).toUpperCase()}`,
        date: order.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        time: order.createdAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        restaurant: order.restaurant,
        tableNumber: order.table?.tableNumber ?? 0,
        customer: order.customer,
        payment: order.payments[0] || null,
        items,
        subtotal,
        discount,
        taxableAmt,
        cgst,
        sgst,
        igst,
        serviceCharge,
        total,
        totalWords: numberToWords(total),
        hsnSummary: Object.values(hsnSummary),
        isGst: cgst > 0 || sgst > 0 || igst > 0,
      }),
    };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function getBillData(orderId: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const order = await prisma.order.findUnique({
      where: { id: orderId, restaurantId: session.user.restaurantId },
      include: {
        items: {
          include: {
            item: { select: { name: true, hsnCode: true } },
            variant: { select: { name: true } },
          },
        },
        table: { select: { tableNumber: true } },
        restaurant: { select: { name: true, address: true, phone: true, email: true, gstin: true, pan: true, currency: true, billFooter: true, billPaperSize: true } },
        customer: { select: { name: true, phone: true, gstin: true, gstCategory: true } },
        payments: { select: { method: true, amount: true, reference: true, createdAt: true } },
        invoice: true,
      },
    });

    if (!order) throw new Error("Order not found");

    const invoice = order.invoice;
    const items = order.items.map((i, idx) => ({
      sr: idx + 1,
      name: i.item.name + (i.variant ? ` (${i.variant.name})` : ""),
      hsn: i.item.hsnCode || "—",
      qty: i.quantity,
      rate: Number(i.unitPrice),
      amount: Number(i.unitPrice) * i.quantity,
    }));

    const subtotal = items.reduce((s, i) => s + i.amount, 0);
    const discount = Number(order.discount);
    const taxableAmt = subtotal - discount;
    const cgst = invoice ? Number(invoice.cgstAmount) : 0;
    const sgst = invoice ? Number(invoice.sgstAmount) : 0;
    const igst = invoice ? Number(invoice.igstAmount) : 0;
    const serviceCharge = Number(order.serviceCharge);
    const total = invoice ? Number(invoice.total) : Number(order.total);

    const hsnSummary: Record<string, { hsn: string; taxable: number; cgst: number; sgst: number; igst: number }> = {};
    for (const item of order.items) {
      const hsn = item.item.hsnCode || "996331";
      const amt = Number(item.unitPrice) * item.quantity;
      if (!hsnSummary[hsn]) hsnSummary[hsn] = { hsn, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      hsnSummary[hsn].taxable += amt;
    }
    Object.values(hsnSummary).forEach((h) => {
      h.cgst = (h.taxable / taxableAmt) * cgst;
      h.sgst = (h.taxable / taxableAmt) * sgst;
      h.igst = (h.taxable / taxableAmt) * igst;
    });

    return {
      success: true as const,
      data: serialize({
        invoiceNo: invoice?.invoiceNo || `INV-${order.id.slice(-6).toUpperCase()}`,
        date: order.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        time: order.createdAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        restaurant: order.restaurant,
        tableNumber: order.table?.tableNumber ?? 0,
        customer: order.customer,
        payment: order.payments[0] || null,
        items,
        subtotal,
        discount,
        taxableAmt,
        cgst,
        sgst,
        igst,
        serviceCharge,
        total,
        totalWords: numberToWords(total),
        hsnSummary: Object.values(hsnSummary),
        isGst: cgst > 0 || sgst > 0 || igst > 0,
      }),
    };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}
