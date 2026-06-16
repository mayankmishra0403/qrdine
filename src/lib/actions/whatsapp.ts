"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import {
  createInstance,
  getQRCode,
  getConnectionState,
  sendText,
  disconnectInstance,
  deleteInstance,
  fetchInstances,
  createInstanceWithNumber,
  getPairingCode,
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
    data.instanceName = process.env.EVOLUTION_INSTANCE_NAME || "qrdine-instance";
    return data;
  } catch {
    return null;
  }
}

export async function connectWhatsApp() {
  try {
    const session = await requireAuth();
    const restaurantId = session.user.restaurantId;

    if (!isWhatsAppConfigured()) {
      return { success: false, error: "Set EVOLUTION_API_KEY in your .env file" };
    }

    const existing = await prisma.whatsAppConfig.findUnique({
      where: { restaurantId },
    });

    if (existing?.isConnected) {
      const state = await getConnectionState();
      if (state.success && state.state === "open") {
        return { success: true, connected: true };
      }
    }

    const instances = await fetchInstances();
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME || "qrdine-instance";
    const match = instances.success
      ? instances.data?.find((i) => i.name === instanceName)
      : null;

    if (match) {
      if (match.connectionStatus === "open") {
        await prisma.whatsAppConfig.upsert({
          where: { restaurantId },
          create: { restaurantId, isConnected: true },
          update: { isConnected: true },
        });
        return { success: true, connected: true };
      }

      const qr = await getQRCode(instanceName);
      if (qr.success && qr.qrCode) {
        return { success: true, qrcode: qr.qrCode, connected: false };
      }
    }

    const created = await createInstance(instanceName);
    if (!created.success) {
      return { success: false, error: created.error || "Failed to create instance" };
    }

    return { success: true, qrcode: created.qrCode, connected: false };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function connectWithPairingCode(phone: string) {
  try {
    const session = await requireAuth();
    if (!isWhatsAppConfigured()) {
      return { success: false, error: "Set EVOLUTION_API_KEY in your .env file" };
    }

    const instanceName = process.env.EVOLUTION_INSTANCE_NAME || "qrdine-instance";
    const normalized = phone.replace(/[^0-9]/g, "");

    if (!normalized) {
      return { success: false, error: "Enter a valid phone number" };
    }

    // Delete old instance if exists
    await deleteInstance(instanceName).catch(() => {});

    // Create new instance with phone number
    const created = await createInstanceWithNumber(instanceName, normalized);
    if (!created.success) {
      return { success: false, error: created.error || "Failed to create instance" };
    }

    // Get pairing code
    const code = await getPairingCode(instanceName, normalized);
    if (!code.success) {
      return { success: false, error: code.error || "Failed to generate pairing code" };
    }

    return { success: true, pairingCode: code.pairingCode as string };
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
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME || "qrdine-instance";

    await disconnectInstance(instanceName);
    await deleteInstance(instanceName);

    await prisma.whatsAppConfig.update({
      where: { restaurantId: session.user.restaurantId },
      data: { isConnected: false },
    });

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
