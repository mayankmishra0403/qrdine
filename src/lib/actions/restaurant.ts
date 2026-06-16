"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { restaurantUpdateSchema } from "@/lib/validation";
import { handleActionError, ValidationError } from "@/lib/errors";

export async function updateRestaurant(data: {
  name?: string;
  address?: string;
  phone?: string;
  currency?: string;
}) {
  try {
    const session = await requireAuth();

    const parsed = restaurantUpdateSchema.safeParse(data);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    await prisma.restaurant.update({
      where: { id: session.user.restaurantId },
      data: parsed.data,
    });

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function getCurrentRestaurant() {
  const session = await requireAuth();

  return prisma.restaurant.findUnique({
    where: { id: session.user.restaurantId },
  });
}
