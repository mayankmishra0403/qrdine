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
  email?: string;
  gstin?: string;
  pan?: string;
  currency?: string;
  timezone?: string;
  taxRate?: number;
  serviceCharge?: number;
  logo?: string;
  billFooter?: string;
  kitchenPhone?: string;
  waiterPhone?: string;
}) {
  try {
    const session = await requireAuth();

    const cleanData = { ...data };
    for (const [key, val] of Object.entries(cleanData)) {
      if (val === "") cleanData[key as keyof typeof cleanData] = undefined as never;
    }

    const parsed = restaurantUpdateSchema.safeParse(cleanData);
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
