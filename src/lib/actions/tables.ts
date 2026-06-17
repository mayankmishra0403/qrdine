"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { tableSchema } from "@/lib/validation";
import { handleActionError, ValidationError } from "@/lib/errors";

export async function createTable(tableNumber: number, capacity: number = 4) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const parsed = tableSchema.safeParse({ tableNumber });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const existing = await prisma.table.findUnique({
      where: {
        restaurantId_tableNumber: {
          restaurantId: session.user.restaurantId,
          tableNumber: parsed.data.tableNumber,
        },
      },
    });

    if (existing) throw new Error(`Table ${tableNumber} already exists`);

    const table = await prisma.table.create({
      data: {
        tableNumber: parsed.data.tableNumber,
        capacity,
        restaurantId: session.user.restaurantId,
      },
    });

    revalidatePath("/admin/tables");
    return { success: true, data: table };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function updateTable(data: {
  id: string;
  tableNumber?: number;
  capacity?: number;
  status?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const table = await prisma.table.findUnique({
      where: { id: data.id, restaurantId: session.user.restaurantId },
    });
    if (!table) throw new Error("Table not found");

    if (data.tableNumber && data.tableNumber !== table.tableNumber) {
      const existing = await prisma.table.findUnique({
        where: {
          restaurantId_tableNumber: {
            restaurantId: session.user.restaurantId,
            tableNumber: data.tableNumber,
          },
        },
      });
      if (existing) throw new Error(`Table ${data.tableNumber} already exists`);
    }

    const updated = await prisma.table.update({
      where: { id: data.id },
      data: {
        tableNumber: data.tableNumber,
        capacity: data.capacity,
        status: data.status,
      },
    });

    revalidatePath("/admin/tables");
    revalidatePath("/admin/pos");
    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function deleteTable(id: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    await prisma.table.delete({
      where: { id, restaurantId: session.user.restaurantId },
    });

    revalidatePath("/admin/tables");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function getTables() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.table.findMany({
    where: { restaurantId: session.user.restaurantId },
    orderBy: { tableNumber: "asc" },
  });
}
