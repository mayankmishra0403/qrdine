"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import {
  connectWithPairingCode,
  getConnectionState,
  sendText,
  disconnectInstance,
  deleteInstance,
  formatPhone,
} from "@/lib/whatsapp";
import { revalidatePath } from "next/cache";
import { handleActionError } from "@/lib/errors";
import { serialize } from "@/lib/serialize";

export async function isWhatsAppConfigured(): Promise<boolean> {
  return !!(process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_API_URL);
}

export async function getWhatsAppConfig() {
  try {
    const session = await requireAuth();
    const config = await prisma.whatsAppConfig.findUnique({
      where: { restaurantId: session.user.restaurantId },
    });
    const data: Record<string, unknown> = {};
    if (config) {
      Object.assign(data, serialize(config));
    }
    data.evolutionUrl = process.env.EVOLUTION_API_URL || "";
    data.instanceName = process.env.EVOLUTION_INSTANCE_NAME || "ritam-bharat-pos";
    return data;
  } catch {
    return null;
  }
}

export async function connectWhatsApp(phone: string) {
  try {
    await requireAuth();

    if (!isWhatsAppConfigured()) {
      return { success: false, error: "Set EVOLUTION_API_KEY in your .env file" };
    }

    const instanceName = process.env.EVOLUTION_INSTANCE_NAME || "ritam-bharat-pos";
    const normalized = formatPhone(phone);

    if (!normalized || normalized.length < 10) {
      return { success: false, error: "Enter a valid phone number with country code (e.g., 919876543210)" };
    }

    const result = await connectWithPairingCode(normalized, instanceName);
    if (!result.success) {
      return { success: false, error: result.error || "Failed to connect" };
    }

    return { success: true, pairingCode: result.pairingCode };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function checkWhatsAppStatus() {
  try {
    const session = await requireAuth();
    const config = await prisma.whatsAppConfig.findUnique({
      where: { restaurantId: session.user.restaurantId },
    });

    const state = await getConnectionState();
    if (state.success && state.state) {
      const connected = state.state === "open";
      if (connected !== config?.isConnected) {
        await prisma.whatsAppConfig.upsert({
          where: { restaurantId: session.user.restaurantId },
          create: { restaurantId: session.user.restaurantId, isConnected: connected },
          update: { isConnected: connected },
        });
      }
      return { success: true, connected, state: state.state };
    }

    return { success: true, connected: config?.isConnected || false };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function disconnectWhatsApp() {
  try {
    const session = await requireAuth();
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME || "ritam-bharat-pos";

    await prisma.whatsAppConfig.update({
      where: { restaurantId: session.user.restaurantId },
      data: { isConnected: false },
    });

    await disconnectInstance(instanceName).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));
    await deleteInstance(instanceName).catch(() => {});

    revalidatePath("/admin/whatsapp");
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function sendWhatsAppMessage(phone: string, text: string) {
  try {
    const result = await sendText(phone, text);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}
