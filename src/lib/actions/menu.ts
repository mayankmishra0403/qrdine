"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  categorySchema,
  menuItemSchema,
  menuItemUpdateSchema,
  variantSchema,
} from "@/lib/validation";
import { handleActionError, ValidationError } from "@/lib/errors";

export async function createCategory(name: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const parsed = categorySchema.safeParse({ name });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const existing = await prisma.menuCategory.findUnique({
      where: {
        restaurantId_name: {
          restaurantId: session.user.restaurantId,
          name: parsed.data.name,
        },
      },
    });

    if (existing) throw new Error("Category already exists");

    const count = await prisma.menuCategory.count({
      where: { restaurantId: session.user.restaurantId },
    });

    const category = await prisma.menuCategory.create({
      data: { name: parsed.data.name, sortOrder: count, restaurantId: session.user.restaurantId },
    });

    revalidatePath("/admin/menu");
    return { success: true, data: category };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function deleteCategory(id: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    await prisma.menuCategory.delete({
      where: { id, restaurantId: session.user.restaurantId },
    });

    revalidatePath("/admin/menu");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function createItem(data: {
  name: string;
  description?: string;
  price: number;
  categoryId: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const parsed = menuItemSchema.safeParse(data);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const item = await prisma.menuItem.create({
      data: { ...parsed.data, restaurantId: session.user.restaurantId },
    });

    revalidatePath("/admin/menu");
    return { success: true, data: item };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function updateItem(
  id: string,
  data: {
    name?: string;
    description?: string;
    price?: number;
    isAvailable?: boolean;
    categoryId?: string;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const parsed = menuItemUpdateSchema.safeParse(data);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const item = await prisma.menuItem.update({
      where: { id, restaurantId: session.user.restaurantId },
      data: parsed.data,
    });

    revalidatePath("/admin/menu");
    return { success: true, data: item };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function deleteItem(id: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    await prisma.menuItem.delete({
      where: { id, restaurantId: session.user.restaurantId },
    });

    revalidatePath("/admin/menu");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function createVariant(data: {
  name: string;
  priceMod: number;
  itemId: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const parsed = variantSchema.safeParse(data);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const variant = await prisma.menuItemVariant.create({ data: parsed.data });
    revalidatePath("/admin/menu");
    return { success: true, data: variant };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function deleteVariant(id: string) {
  try {
    await prisma.menuItemVariant.delete({ where: { id } });
    revalidatePath("/admin/menu");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function toggleItemAvailability(id: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const item = await prisma.menuItem.findUnique({
      where: { id, restaurantId: session.user.restaurantId },
    });
    if (!item) throw new Error("Item not found");

    await prisma.menuItem.update({
      where: { id },
      data: { isAvailable: !item.isAvailable },
    });

    revalidatePath("/admin/menu");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}
