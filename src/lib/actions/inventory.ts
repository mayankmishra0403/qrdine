"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { handleActionError, ValidationError } from "@/lib/errors";
import { serialize } from "@/lib/serialize";
import { isWhatsAppConfigured, sendWhatsAppMessage } from "@/lib/actions/whatsapp";

export async function getInventoryItems() {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    const rid = session.user.restaurantId;

    const items = await prisma.inventoryItem.findMany({
      where: { restaurantId: rid },
      include: { supplier: true, recipeItems: { include: { menuItem: true } } },
      orderBy: { name: "asc" },
    });

    return {
      success: true as const,
      data: serialize(items.map((i) => ({
        ...i,
        isLowStock: Number(i.stockQty) <= Number(i.minStockQty),
      }))),
    };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function createInventoryItem(data: {
  name: string;
  sku?: string;
  category?: string;
  unit: string;
  stockQty: number;
  minStockQty?: number;
  costPrice?: number;
  supplierId?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const item = await prisma.inventoryItem.create({
      data: {
        ...data,
        minStockQty: data.minStockQty || 0,
        restaurantId: session.user.restaurantId,
      },
    });

    revalidatePath("/admin/inventory");
    return { success: true, data: serialize(item) };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function updateInventoryItem(id: string, data: {
  name?: string;
  sku?: string;
  category?: string;
  unit?: string;
  stockQty?: number;
  minStockQty?: number;
  costPrice?: number;
  supplierId?: string | null;
}) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const old = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!old) throw new Error("Item not found");

    const item = await prisma.inventoryItem.update({ where: { id }, data });

    if (data.stockQty !== undefined && data.stockQty !== Number(old.stockQty)) {
      const diff = data.stockQty - Number(old.stockQty);
      await prisma.stockMovement.create({
        data: {
          type: diff > 0 ? "purchase" : "adjustment",
          quantity: Math.abs(diff),
          previousStock: Number(old.stockQty),
          newStock: data.stockQty,
          notes: `Manual adjustment: ${diff > 0 ? "+" : ""}${diff}`,
          inventoryItemId: id,
        },
      });

      if (Number(data.stockQty) <= Number(old.minStockQty) && Number(old.minStockQty) > 0) {
        await sendLowStockAlert(item.name, Number(data.stockQty));
      }
    }

    revalidatePath("/admin/inventory");
    return { success: true, data: serialize(item) };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function deleteInventoryItem(id: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    await prisma.inventoryItem.delete({ where: { id } });
    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

async function sendLowStockAlert(itemName: string, stockQty: number) {
  try {
    if (!(await isWhatsAppConfigured())) return;
    const session = await auth();
    if (!session?.user) return;
    const owner = await prisma.user.findFirst({
      where: { restaurantId: session.user.restaurantId, role: "owner" },
    });
    if (!owner) return;
  } catch {}
}

export async function getSuppliers() {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    const suppliers = await prisma.supplier.findMany({
      where: { restaurantId: session.user.restaurantId },
      include: { inventoryItems: true, purchaseOrders: true },
      orderBy: { name: "asc" },
    });
    return { success: true as const, data: serialize(suppliers) };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function createSupplier(data: {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    const supplier = await prisma.supplier.create({
      data: { ...data, restaurantId: session.user.restaurantId },
    });
    revalidatePath("/admin/inventory/suppliers");
    return { success: true, data: serialize(supplier) };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function deleteSupplier(id: string) {
  try {
    await prisma.supplier.delete({ where: { id } });
    revalidatePath("/admin/inventory/suppliers");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function getRecipes() {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    const rid = session.user.restaurantId;

    const [menuItems, inventoryItems] = await Promise.all([
      prisma.menuItem.findMany({
        where: { restaurantId: rid },
        include: { recipeItems: { include: { inventoryItem: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.inventoryItem.findMany({
        where: { restaurantId: rid },
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      success: true as const,
      data: serialize({ menuItems, inventoryItems }),
    };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function saveRecipe(data: {
  menuItemId: string;
  inventoryItemId: string;
  quantity: number;
  unit: string;
}) {
  try {
    const existing = await prisma.recipeItem.findFirst({
      where: { menuItemId: data.menuItemId, inventoryItemId: data.inventoryItemId },
    });

    if (existing) {
      await prisma.recipeItem.update({
        where: { id: existing.id },
        data: { quantity: data.quantity, unit: data.unit },
      });
    } else {
      await prisma.recipeItem.create({ data });
    }

    revalidatePath("/admin/inventory/recipes");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function deleteRecipe(id: string) {
  try {
    await prisma.recipeItem.delete({ where: { id } });
    revalidatePath("/admin/inventory/recipes");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function getPurchaseOrders() {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    const pos = await prisma.purchaseOrder.findMany({
      where: { restaurantId: session.user.restaurantId },
      include: {
        supplier: true,
        purchaseItems: { include: { inventoryItem: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true as const, data: serialize(pos) };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function createPurchaseOrder(data: {
  supplierId: string;
  items: Array<{ inventoryItemId: string; quantity: number; unitCost: number }>;
  notes?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const poNumber = `PO-${Date.now().toString(36).toUpperCase()}`;
    const totalAmount = data.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: data.supplierId,
        status: "draft",
        totalAmount,
        notes: data.notes,
        restaurantId: session.user.restaurantId,
        purchaseItems: {
          create: data.items.map((i) => ({
            inventoryItemId: i.inventoryItemId,
            quantity: i.quantity,
            unitCost: i.unitCost,
            totalCost: i.quantity * i.unitCost,
          })),
        },
      },
      include: {
        supplier: true,
        purchaseItems: { include: { inventoryItem: true } },
      },
    });

    revalidatePath("/admin/inventory/purchase-orders");
    return { success: true, data: serialize(po) };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function receivePurchaseOrder(poId: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { purchaseItems: true },
    });
    if (!po) throw new Error("Purchase order not found");

    await prisma.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: "received", receivedAt: new Date() },
      });

      for (const item of po.purchaseItems) {
        const inv = await tx.inventoryItem.findUnique({ where: { id: item.inventoryItemId } });
        if (!inv) continue;

        const prevQty = Number(inv.stockQty);
        const newQty = prevQty + Number(item.quantity);

        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { stockQty: newQty },
        });

        await tx.stockMovement.create({
          data: {
            type: "purchase",
            quantity: Number(item.quantity),
            previousStock: prevQty,
            newStock: newQty,
            reference: po.poNumber,
            inventoryItemId: item.inventoryItemId,
          },
        });
      }
    });

    revalidatePath("/admin/inventory/purchase-orders");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function deductStockForOrder(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            item: {
              include: { recipeItems: { include: { inventoryItem: true } } },
            },
          },
        },
      },
    });
    if (!order) throw new Error("Order not found");

    for (const orderItem of order.items) {
      for (const recipe of orderItem.item.recipeItems) {
        const totalQty = Number(recipe.quantity) * orderItem.quantity;
        const inv = recipe.inventoryItem;
        const prevQty = Number(inv.stockQty);
        const newQty = prevQty - totalQty;

        await prisma.inventoryItem.update({
          where: { id: inv.id },
          data: { stockQty: Math.max(0, newQty) },
        });

        await prisma.stockMovement.create({
          data: {
            type: "consumption",
            quantity: totalQty,
            previousStock: prevQty,
            newStock: Math.max(0, newQty),
            reference: `Order #${order.id.slice(-6).toUpperCase()}`,
            inventoryItemId: inv.id,
          },
        });

        if (newQty <= Number(inv.minStockQty) && Number(inv.minStockQty) > 0 && newQty >= 0) {
          await sendLowStockAlert(inv.name, Math.max(0, newQty));
        }
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Stock deduction failed" };
  }
}
