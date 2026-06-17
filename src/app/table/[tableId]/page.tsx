import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { notFound, redirect } from "next/navigation";
import { MenuContent } from "./menu-content";

export default async function MenuPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = await params;

  const table = await prisma.table.findUnique({
    where: { id: tableId },
    include: { restaurant: true, mergedInto: true },
  });

  if (!table) notFound();

  if (table.status === "merged") {
    if (table.mergedInto) {
      redirect(`/table/${table.mergedInto.id}`);
    }
    notFound();
  }

  const activeOrder = await prisma.order.findFirst({
    where: {
      tableId: table.id,
      status: { notIn: ["served", "cancelled"] },
    },
    include: {
      items: { include: { item: true, variant: true } },
      statusHistory: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: table.restaurantId },
    include: {
      menuItems: {
        where: { isAvailable: true },
        include: { variants: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  const serialized = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    menuItems: cat.menuItems.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: Number(item.price),
      variants: item.variants.map((v) => ({
        id: v.id,
        name: v.name,
        priceMod: Number(v.priceMod),
      })),
    })),
  }));

  return (
    <MenuContent
      restaurantName={table.restaurant.name}
      tableNumber={table.tableNumber}
      categories={serialize(serialized)}
      tableStatus={table.status}
      activeOrder={activeOrder ? serialize({
        id: activeOrder.id,
        status: activeOrder.status,
        total: Number(activeOrder.total),
        items: activeOrder.items.map((i) => ({
          id: i.id,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          item: { id: i.item.id, name: i.item.name },
          variant: i.variant ? { id: i.variant.id, name: i.variant.name } : null,
        })),
      }) : null}
    />
  );
}
