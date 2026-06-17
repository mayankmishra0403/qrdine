import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: {
      restaurantId: session.user.restaurantId,
      status: { notIn: ["served", "cancelled"] },
    },
    include: {
      table: true,
      customer: true,
      items: {
        include: { item: true, variant: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const serialized = orders.map((o) => ({
    id: o.id,
    status: o.status,
    notes: o.notes,
    createdAt: o.createdAt.toISOString(),
    table: o.table ? { id: o.table.id, tableNumber: o.table.tableNumber } : null,
    customer: o.customer ? { phone: o.customer.phone, name: o.customer.name } : null,
    items: o.items.map((i) => ({
      id: i.id,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      item: { id: i.item.id, name: i.item.name },
      variant: i.variant
        ? { id: i.variant.id, name: i.variant.name }
        : null,
    })),
  }));

  return NextResponse.json(serialize(serialized));
}
