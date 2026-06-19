import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveSubscription, removeSubscription } from "@/lib/actions/push";

async function getUserId(request: NextRequest): Promise<string | null> {
  const cookie = request.cookies.get("session")?.value;
  if (!cookie) return null;
  try {
    const secret = process.env.AUTH_SECRET || "";
    const [payload, signature] = cookie.split(".");
    if (!payload || !signature) return null;
    const { createHmac } = await import("node:crypto");
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    if (signature !== expected) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.id || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, restaurantId: true },
    });
    if (!user || !user.restaurantId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { endpoint, p256dh, auth, userAgent } = body;

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Missing subscription fields" }, { status: 400 });
    }

    const result = await saveSubscription({
      endpoint,
      p256dh,
      auth,
      userId: user.id,
      restaurantId: user.restaurantId,
      userAgent: userAgent || request.headers.get("user-agent") || undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Push/Subscribe] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint");
    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }

    await removeSubscription(endpoint, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Push/Unsubscribe] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
