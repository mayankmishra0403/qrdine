"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { handleActionError } from "@/lib/errors";
import { serialize } from "@/lib/serialize";

export async function openPosSession(openingBal: number) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const existing = await prisma.posSession.findFirst({
      where: { userId: session.user.id, status: "open" },
    });
    if (existing) throw new Error("You already have an open POS session");

    const posSession = await prisma.posSession.create({
      data: {
        userId: session.user.id,
        restaurantId: session.user.restaurantId,
        openingBal,
        status: "open",
      },
    });

    revalidatePath("/admin/pos");
    return { success: true, data: serialize(posSession) };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function closePosSession(sessionId: string, closingBal: number) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const posSession = await prisma.posSession.findUnique({
      where: { id: sessionId },
      include: {
        user: { select: { name: true } },
      },
    });
    if (!posSession) throw new Error("Session not found");

    const orders = await prisma.order.findMany({
      where: {
        restaurantId: session.user.restaurantId,
        createdAt: { gte: posSession.openedAt },
        status: "served",
      },
      include: { payments: true },
    });

    const totalSales = orders.reduce((s, o) => s + Number(o.total), 0);
    const totalPayments = orders.reduce((s, o) => s + o.payments.reduce((sp, p) => sp + Number(p.amount), 0), 0);
    const orderCount = orders.length;
    const expectedBal = Number(posSession.openingBal) + totalSales;

    const updated = await prisma.posSession.update({
      where: { id: sessionId },
      data: { status: "closed", closingBal, closedAt: new Date() },
    });

    revalidatePath("/admin/pos");
    return {
      success: true,
      data: serialize(updated),
      summary: {
        openingBal: Number(posSession.openingBal),
        closingBal: Number(closingBal),
        totalSales,
        totalPayments,
        orderCount,
        expectedBal,
        difference: closingBal - expectedBal,
        cashierName: posSession.user.name,
      },
    };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function getCurrentSession() {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const posSession = await prisma.posSession.findFirst({
      where: { userId: session.user.id, status: "open" },
    });
    if (!posSession) return { success: true as const, data: null };

    const orders = await prisma.order.findMany({
      where: {
        restaurantId: session.user.restaurantId,
        createdAt: { gte: posSession.openedAt },
      },
      include: { payments: true },
    });

    const totalSales = orders.filter((o) => o.status === "served").reduce((s, o) => s + Number(o.total), 0);
    const pendingAmount = orders.filter((o) => o.status !== "served" && o.status !== "cancelled").reduce((s, o) => s + Number(o.total), 0);

    return {
      success: true as const,
      data: serialize({
        ...posSession,
        totalSales,
        pendingAmount,
        orderCount: orders.filter((o) => o.status === "served").length,
        pendingOrders: orders.filter((o) => o.status !== "served" && o.status !== "cancelled").length,
        expectedBal: Number(posSession.openingBal) + totalSales,
      }),
    };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function getRooms() {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    const rooms = await prisma.room.findMany({
      where: { restaurantId: session.user.restaurantId },
      include: {
        tables: { orderBy: { tableNumber: "asc" } },
      },
      orderBy: { sortOrder: "asc" },
    });
    return { success: true as const, data: serialize(rooms) };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function createRoom(name: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    const count = await prisma.room.count({ where: { restaurantId: session.user.restaurantId } });
    const room = await prisma.room.create({
      data: { name, sortOrder: count, restaurantId: session.user.restaurantId },
    });
    revalidatePath("/admin/rooms");
    return { success: true, data: serialize(room) };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function deleteRoom(id: string) {
  try {
    await prisma.table.updateMany({ where: { roomId: id }, data: { roomId: null } });
    await prisma.room.delete({ where: { id } });
    revalidatePath("/admin/rooms");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function assignTableToRoom(tableId: string, roomId: string | null) {
  try {
    await prisma.table.update({ where: { id: tableId }, data: { roomId } });
    revalidatePath("/admin/rooms");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}
