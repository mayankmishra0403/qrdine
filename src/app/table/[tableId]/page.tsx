import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { notFound } from "next/navigation";
import { MenuContent } from "./menu-content";

export default async function MenuPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = await params;

  const table = await prisma.table.findUnique({
    where: { id: tableId },
    include: { restaurant: true },
  });

  if (!table) notFound();

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
    />
  );
}
