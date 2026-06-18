"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { handleActionError, ValidationError } from "@/lib/errors";
import { serialize } from "@/lib/serialize";
import { getTier, getNextTier } from "@/lib/loyalty-tiers";

export async function getLoyaltySettings() {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.user.restaurantId },
      select: {
        loyaltyEnabled: true,
        loyaltyEarnRate: true,
        loyaltyRedeemRate: true,
        loyaltyMinRedeem: true,
      },
    });

    return { success: true, data: restaurant };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function updateLoyaltySettings(data: {
  loyaltyEnabled?: boolean;
  loyaltyEarnRate?: number;
  loyaltyRedeemRate?: number;
  loyaltyMinRedeem?: number;
}) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const validKeys = ["loyaltyEnabled", "loyaltyEarnRate", "loyaltyRedeemRate", "loyaltyMinRedeem"];
    for (const key of Object.keys(data)) {
      if (!validKeys.includes(key)) throw new ValidationError(`Invalid field: ${key}`);
    }

    await prisma.restaurant.update({
      where: { id: session.user.restaurantId },
      data,
    });

    revalidatePath("/admin/settings/loyalty");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function earnLoyaltyPoints(orderId: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.user.restaurantId },
      select: { loyaltyEnabled: true, loyaltyEarnRate: true },
    });

    if (!restaurant?.loyaltyEnabled) return { success: true, skipped: true };

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { total: true, customerId: true, restaurantId: true },
    });

    if (!order || !order.customerId) return { success: true, skipped: true };
    if (order.restaurantId !== session.user.restaurantId) throw new Error("Unauthorized");

    const earnRate = restaurant.loyaltyEarnRate || 100;

    const existing = await prisma.loyaltyProgram.findUnique({
      where: { customerId: order.customerId! },
    });

    const currentPoints = existing?.pointsEarned ?? 0;
    const currentTier = getTier(currentPoints);
    const basePoints = Math.floor(Number(order.total) / earnRate);
    const points = Math.floor(basePoints * currentTier.multiplier);
    if (points <= 0) return { success: true, skipped: true };

    await prisma.$transaction(async (tx) => {
      const loyalty = await tx.loyaltyProgram.upsert({
        where: { customerId: order.customerId! },
        create: {
          customerId: order.customerId!,
          pointsEarned: points,
          tier: getTier(points).name,
        },
        update: {
          pointsEarned: { increment: points },
        },
      });

      const totalPoints = loyalty.pointsEarned + points;
      const newTier = getTier(totalPoints).name;
      if (newTier !== loyalty.tier) {
        await tx.loyaltyProgram.update({
          where: { id: loyalty.id },
          data: { tier: newTier },
        });
      }
    });

    revalidatePath("/admin/customers");
    return { success: true, points };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function redeemLoyaltyPoints(data: {
  orderId: string;
  customerId: string;
  points: number;
}) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.user.restaurantId },
      select: { loyaltyEnabled: true, loyaltyRedeemRate: true, loyaltyMinRedeem: true },
    });

    if (!restaurant?.loyaltyEnabled) throw new Error("Loyalty program is disabled");

    const customer = await prisma.customer.findFirst({
      where: {
        OR: [{ id: data.customerId }, { phone: data.customerId }],
        restaurantId: session.user.restaurantId,
      },
      select: { id: true },
    });
    if (!customer) throw new Error("Customer not found");

    const loyalty = await prisma.loyaltyProgram.findUnique({
      where: { customerId: customer.id },
    });

    if (!loyalty) throw new Error("Customer not enrolled in loyalty program");

    const availablePoints = loyalty.pointsEarned - loyalty.pointsRedeemed;
    if (data.points < (restaurant.loyaltyMinRedeem || 100)) {
      throw new Error(`Minimum ${restaurant.loyaltyMinRedeem} points required to redeem`);
    }
    if (data.points > availablePoints) {
      throw new Error(`Insufficient points. Available: ${availablePoints}`);
    }

    const redeemRate = restaurant.loyaltyRedeemRate || 100;
    const discountAmt = data.points / redeemRate;

    await prisma.$transaction(async (tx) => {
      await tx.loyaltyProgram.update({
        where: { id: loyalty.id },
        data: { pointsRedeemed: { increment: data.points } },
      });

      await tx.loyaltyReward.create({
        data: {
          customerId: customer.id,
          orderId: data.orderId,
          pointsUsed: data.points,
          discountAmt,
        },
      });

      const order = await tx.order.findUnique({
        where: { id: data.orderId },
        select: { subtotal: true, discount: true, discountType: true, taxAmount: true, serviceCharge: true },
      });

      if (!order) throw new Error("Order not found");

      const currentDiscount = Number(order.discount);
      const subtotal = Number(order.subtotal);
      const newDiscount = currentDiscount + discountAmt;

      const afterDiscount = subtotal - newDiscount;
      const taxAmount = afterDiscount * (Number(order.taxAmount) / (subtotal - currentDiscount || 1));
      const chargeAmount = afterDiscount * (Number(order.serviceCharge) / (subtotal - currentDiscount || 1));
      const total = afterDiscount + (isNaN(taxAmount) ? 0 : taxAmount) + (isNaN(chargeAmount) ? 0 : chargeAmount);

      await tx.order.update({
        where: { id: data.orderId },
        data: {
          discount: newDiscount,
          discountType: order.discountType || "fixed",
          taxAmount: isNaN(taxAmount) ? 0 : taxAmount,
          serviceCharge: isNaN(chargeAmount) ? 0 : chargeAmount,
          total: Math.round(total * 100) / 100,
        },
      });
    });

    revalidatePath("/admin/pos");
    return { success: true, discount: discountAmt };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function getCustomerLoyalty(customerIdOrPhone: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const customer = await prisma.customer.findFirst({
      where: {
        OR: [{ id: customerIdOrPhone }, { phone: customerIdOrPhone }],
        restaurantId: session.user.restaurantId,
      },
      select: { id: true },
    });
    if (!customer) return null;

    const loyalty = await prisma.loyaltyProgram.findUnique({
      where: { customerId: customer.id },
    });

    if (!loyalty) return null;

    const rewards = await prisma.loyaltyReward.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const available = loyalty.pointsEarned - loyalty.pointsRedeemed;
    const currentTier = getTier(loyalty.pointsEarned);
    const nextTier = getNextTier(loyalty.pointsEarned);

    return serialize({
      pointsEarned: loyalty.pointsEarned,
      pointsRedeemed: loyalty.pointsRedeemed,
      pointsAvailable: available,
      tier: loyalty.tier,
      tierLabel: currentTier.label,
      tierColor: currentTier.color,
      tierMultiplier: currentTier.multiplier,
      nextTier: nextTier
        ? { label: nextTier.label, pointsNeeded: nextTier.minPoints - loyalty.pointsEarned }
        : null,
      rewards,
    });
  } catch (error) {
    return null;
  }
}

export async function getLoyaltyReport() {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const customers = await prisma.customer.findMany({
      where: { restaurantId: session.user.restaurantId },
      include: {
        loyalty: true,
      },
      orderBy: { lastVisit: { sort: "desc", nulls: "last" } },
    });

    const withPoints = customers
      .filter((c) => c.loyalty)
      .map((c) => ({
        id: c.id,
        name: c.name || "Unknown",
        phone: c.phone,
        pointsEarned: c.loyalty!.pointsEarned,
        pointsRedeemed: c.loyalty!.pointsRedeemed,
        pointsAvailable: c.loyalty!.pointsEarned - c.loyalty!.pointsRedeemed,
        tier: c.loyalty!.tier,
        totalOrders: c.totalOrders,
      }))
      .sort((a, b) => b.pointsAvailable - a.pointsAvailable);

    const totalEarned = withPoints.reduce((s, c) => s + c.pointsEarned, 0);
    const totalRedeemed = withPoints.reduce((s, c) => s + c.pointsRedeemed, 0);
    const enrolledCount = withPoints.length;

    const tierBreakdown = {
      bronze: withPoints.filter((c) => c.tier === "bronze").length,
      silver: withPoints.filter((c) => c.tier === "silver").length,
      gold: withPoints.filter((c) => c.tier === "gold").length,
      platinum: withPoints.filter((c) => c.tier === "platinum").length,
    };

    return serialize({
      summary: { totalEarned, totalRedeemed, enrolledCount },
      tierBreakdown,
      customers: withPoints,
    });
  } catch (error) {
    return null;
  }
}

export async function getLoyaltyCustomerList() {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const customers = await prisma.customer.findMany({
      where: { restaurantId: session.user.restaurantId },
      include: {
        loyalty: true,
        orders: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { total: true },
        },
      },
      orderBy: { lastVisit: { sort: "desc", nulls: "last" } },
    });

    return serialize(
      customers.map((c) => ({
        id: c.id,
        phone: c.phone,
        name: c.name,
        totalOrders: c.totalOrders,
        lastVisit: c.lastVisit?.toISOString() || null,
        loyalty: c.loyalty
          ? {
              pointsEarned: c.loyalty.pointsEarned,
              pointsRedeemed: c.loyalty.pointsRedeemed,
              pointsAvailable: c.loyalty.pointsEarned - c.loyalty.pointsRedeemed,
              tier: c.loyalty.tier,
            }
          : null,
      }))
    );
  } catch (error) {
    return [];
  }
}

export async function enrollCustomerInLoyalty(customerId: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const existing = await prisma.loyaltyProgram.findUnique({
      where: { customerId },
    });

    if (existing) return { success: true, message: "Already enrolled" };

    await prisma.loyaltyProgram.create({
      data: {
        customerId,
        pointsEarned: 0,
        pointsRedeemed: 0,
        tier: "bronze",
      },
    });

    revalidatePath("/admin/customers");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}
