import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const event = body.event as string | undefined;
    const instance = body.instance as string | undefined;
    const data = body.data as Record<string, unknown> | undefined;

    if (event === "connection.update" && instance) {
      const state = data?.state as string | undefined;
      console.log(`[Evolution Webhook] Instance ${instance}: state=${state}`);

      if (state === "open") {
        await prisma.whatsAppConfig.updateMany({
          where: { sessionId: null },
          data: { isConnected: true },
        });
        console.log(`[Evolution Webhook] DB updated: connected=true`);
      } else if (state === "close" || state === "disconnected" || state === "connecting") {
        await prisma.whatsAppConfig.updateMany({
          where: { sessionId: null },
          data: { isConnected: false },
        });
        console.log(`[Evolution Webhook] DB updated: connected=false`);
      }
    }

    if (event === "messages.upsert") {
      const messages = data?.messages as Array<Record<string, unknown>> | undefined;
      if (messages) {
        for (const msg of messages) {
          const key = msg.key as Record<string, unknown> | undefined;
          const pushName = msg.pushName as string | undefined;
          const messageType = msg.messageType as string | undefined;
          const from = key?.remoteJid as string | undefined;

          if (from && pushName) {
            const phone = from.replace(/[^0-9]/g, "").replace(/@.*$/, "");
            if (phone) {
              await prisma.customer.upsert({
                where: { restaurantId_phone: { restaurantId: "", phone } },
                create: {
                  phone,
                  name: pushName,
                  restaurantId: "",
                  totalOrders: 0,
                },
                update: { name: pushName },
              }).catch(() => {});
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
