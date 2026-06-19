import { NextRequest } from "next/server";
import { redis, CHANNELS } from "@/lib/redis";
import { createHmac } from "node:crypto";

const CHANNEL_TO_EVENT: Record<string, string> = {
  [CHANNELS.KDS_NEW_ORDER]: "new-order",
  [CHANNELS.KDS_STATUS_UPDATE]: "status-update",
  [CHANNELS.KDS_ORDER_DELETED]: "order-deleted",
  [CHANNELS.WAITER_ORDER_READY]: "order-ready",
  [CHANNELS.POS_TABLE_UPDATE]: "table-update",
  [CHANNELS.OWNER_ALERT]: "owner-alert",
};

const ROLE_CHANNELS: Record<string, readonly string[]> = {
  kitchen: [
    CHANNELS.KDS_NEW_ORDER,
    CHANNELS.KDS_STATUS_UPDATE,
    CHANNELS.KDS_ORDER_DELETED,
  ],
  waiter: [
    CHANNELS.WAITER_ORDER_READY,
    CHANNELS.POS_TABLE_UPDATE,
    CHANNELS.KDS_STATUS_UPDATE,
  ],
  admin: [
    CHANNELS.OWNER_ALERT,
    CHANNELS.POS_TABLE_UPDATE,
    CHANNELS.KDS_STATUS_UPDATE,
    CHANNELS.WAITER_ORDER_READY,
    CHANNELS.KDS_NEW_ORDER,
  ],
  owner: [
    CHANNELS.OWNER_ALERT,
    CHANNELS.POS_TABLE_UPDATE,
    CHANNELS.KDS_STATUS_UPDATE,
    CHANNELS.WAITER_ORDER_READY,
    CHANNELS.KDS_NEW_ORDER,
  ],
  cashier: [CHANNELS.POS_TABLE_UPDATE],
};

function getSessionFromCookie(request: NextRequest) {
  const cookie = request.cookies.get("session")?.value;
  if (!cookie) return null;
  try {
    const secret = process.env.AUTH_SECRET || "";
    const [payload, signature] = cookie.split(".");
    if (!payload || !signature) return null;
    const expected = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    if (signature !== expected) return null;
    return JSON.parse(
      Buffer.from(payload, "base64url").toString()
    ) as { id: string; role: string; restaurantId: string };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const session = getSessionFromCookie(request);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const role = session.role as string;
  const channels = ROLE_CHANNELS[role] || [];

  if (channels.length === 0) {
    return new Response("Forbidden", { status: 403 });
  }

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const sub = redis.duplicate();

      sub.on("message", (channel, message) => {
        try {
          const eventType = CHANNEL_TO_EVENT[channel] || channel;
          const payload = JSON.parse(message);
          payload.type = eventType;
          controller.enqueue(`data: ${JSON.stringify(payload)}\n\n`);
        } catch {}
      });

      sub.subscribe(...channels).catch((err) => {
        controller.error(err);
      });

      controller.enqueue(`event: connected\ndata: {"role":"${role}"}\n\n`);

      const ping = setInterval(() => {
        try {
          controller.enqueue(`:ping\n\n`);
        } catch {}
      }, 30000);

      cleanup = () => {
        clearInterval(ping);
        sub.unsubscribe().catch(() => {});
        sub.disconnect();
      };

      request.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
