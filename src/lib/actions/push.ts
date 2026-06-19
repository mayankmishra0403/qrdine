import { prisma } from "@/lib/prisma";

const webpush = require("web-push");

function getVapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@rb.com";

  if (!publicKey || !privateKey) {
    return null;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return { publicKey, privateKey };
}

export function getVapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY || "";
}

export async function saveSubscription(params: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userId: string;
  restaurantId: string;
  userAgent?: string;
}) {
  try {
    await prisma.pushSubscription.upsert({
      where: {
        endpoint_userId: {
          endpoint: params.endpoint,
          userId: params.userId,
        },
      },
      create: params,
      update: { p256dh: params.p256dh, auth: params.auth, userAgent: params.userAgent },
    });
    return { success: true };
  } catch (error) {
    console.error("[Push] Save subscription error:", error);
    return { success: false, error: "Failed to save subscription" };
  }
}

export async function removeSubscription(endpoint: string, userId: string) {
  try {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId },
    });
    return { success: true };
  } catch (error) {
    console.error("[Push] Remove subscription error:", error);
    return { success: false, error: "Failed to remove subscription" };
  }
}

async function sendPush(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}, payload: { title: string; body: string; data?: Record<string, unknown> }) {
  const config = getVapidConfig();
  if (!config) return { success: false, error: "VAPID not configured" };

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
    return { success: true };
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    if (err.statusCode === 410 || err.statusCode === 404) {
      return { success: false, expired: true, error: "Subscription expired" };
    }
    return { success: false, error: err.message || "Push failed" };
  }
}

export async function sendPushToRole(
  restaurantId: string,
  role: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { restaurantId, user: { role, isActive: true } },
    });

    if (!subs.length) return { success: true, sent: 0 };

    const results = await Promise.allSettled(
      subs.map((sub) =>
        sendPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          { title, body, data },
        ),
      ),
    );

    const expired: Array<{ endpoint: string; userId: string }> = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value.expired) {
        expired.push({ endpoint: subs[i].endpoint, userId: subs[i].userId });
      }
    });

    if (expired.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: {
          OR: expired.map((e) => ({ endpoint: e.endpoint, userId: e.userId })),
        },
      });
    }

    return { success: true, sent: results.filter((r) => r.status === "fulfilled" && r.value.success).length };
  } catch (error) {
    console.error("[Push] sendPushToRole error:", error);
    return { success: false, error: "Failed to send push" };
  }
}

export async function sendPushToAll(
  restaurantId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { restaurantId },
    });

    if (!subs.length) return { success: true, sent: 0 };

    const results = await Promise.allSettled(
      subs.map((sub) =>
        sendPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          { title, body, data },
        ),
      ),
    );

    return { success: true, sent: results.filter((r) => r.status === "fulfilled" && r.value.success).length };
  } catch (error) {
    console.error("[Push] sendPushToAll error:", error);
    return { success: false, error: "Failed to send push" };
  }
}
