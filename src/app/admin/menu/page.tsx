import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { AddCategoryForm } from "./add-category-form";
import { CategorySection } from "./category-section";

export default async function MenuPage() {
  const session = await requireAuth();
  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: session.user.restaurantId },
    include: {
      menuItems: {
        include: { variants: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Menu</h1>
        <AddCategoryForm />
      </div>

      <div className="space-y-8">
        {categories.map((category) => (
          <CategorySection
            key={category.id}
            category={{
              id: category.id,
              name: category.name,
              description: category.description,
            }}
            items={serialize(category.menuItems.map((item) => ({
              id: item.id,
              name: item.name,
              description: item.description,
              price: Number(item.price),
              isAvailable: item.isAvailable,
              variants: item.variants.map((v) => ({
                id: v.id,
                name: v.name,
                priceMod: Number(v.priceMod),
              })),
            })))}
          />
        ))}
      </div>

      {categories.length === 0 && (
        <p className="text-muted-foreground">
          No categories yet. Add a category to start building your menu.
        </p>
      )}
    </div>
  );
}
