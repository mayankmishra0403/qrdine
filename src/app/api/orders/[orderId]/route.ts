import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: { item: true, variant: true },
      },
      table: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(serialize({
    id: order.id,
    status: order.status,
    total: Number(order.total),
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    table: { id: order.table.id, tableNumber: order.table.tableNumber },
    items: order.items.map((i) => ({
      id: i.id,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      item: { id: i.item.id, name: i.item.name },
      variant: i.variant
        ? { id: i.variant.id, name: i.variant.name }
        : null,
    })),
    statusHistory: order.statusHistory.map((h) => ({
      status: h.status,
      changedBy: h.changedBy,
      createdAt: h.createdAt.toISOString(),
    })),
  }));
}
