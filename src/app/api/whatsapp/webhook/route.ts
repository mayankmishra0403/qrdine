import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { timingSafeEqual } from "node:crypto";

function verifyWebhookAuth(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key") || request.nextUrl.searchParams.get("apiKey");
  const expected = process.env.EVOLUTION_API_KEY;
  if (!apiKey || !expected) return false;
  try {
    const a = Buffer.from(apiKey);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyWebhookAuth(req)) {
      console.warn("[Evolution Webhook] Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const event = body.event as string | undefined;
    const instance = body.instance as string | undefined;
    const data = body.data as Record<string, unknown> | undefined;

    if (event === "connection.update" && instance) {
      const state = data?.state as string | undefined;
      console.log(`[Evolution Webhook] Instance ${instance}: state=${state}`);

      const instanceName = instance.replace(/^ritam-bharat-pos-?/, "");
      const restaurantId = instanceName || (data?.restaurantId as string) || "";

      if (state === "open") {
        await prisma.whatsAppConfig.updateMany({
          where: { restaurantId },
          data: { isConnected: true },
        });
        console.log(`[Evolution Webhook] DB updated: connected=true for restaurantId=${restaurantId}`);
      } else if (state === "close" || state === "disconnected" || state === "connecting") {
        await prisma.whatsAppConfig.updateMany({
          where: { restaurantId },
          data: { isConnected: false },
        });
        console.log(`[Evolution Webhook] DB updated: connected=false for restaurantId=${restaurantId}`);
      }
    }

    if (event === "messages.upsert") {
      const messages = data?.messages as Array<Record<string, unknown>> | undefined;
      if (messages) {
        for (const msg of messages) {
          const key = msg.key as Record<string, unknown> | undefined;
          const pushName = msg.pushName as string | undefined;
          const from = key?.remoteJid as string | undefined;

          if (from && pushName) {
            const phone = from.replace(/[^0-9]/g, "").replace(/@.*$/, "");
            if (phone) {
              const restaurant = await prisma.restaurant.findFirst();
              if (restaurant) {
                await prisma.customer.upsert({
                  where: { restaurantId_phone: { restaurantId: restaurant.id, phone } },
                  create: {
                    phone,
                    name: pushName,
                    restaurantId: restaurant.id,
                    totalOrders: 0,
                  },
                  update: { name: pushName },
                }).catch((err: Error) => console.error("[Evolution Webhook] Customer upsert error:", err.message));
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Evolution Webhook] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
