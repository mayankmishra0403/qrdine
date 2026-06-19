import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/session=([^;]+)/);
  if (!match) return NextResponse.json({});

  try {
    const [payload] = match[1].split(".");
    if (!payload) return NextResponse.json({});
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    const userId = data.id;
    if (!userId) return NextResponse.json({});

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { restaurantId: true },
    });
    if (!user?.restaurantId) return NextResponse.json({});

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: user.restaurantId },
      select: { notificationSoundUrl: true, notificationSoundEnabled: true },
    });

    return NextResponse.json({
      notificationSoundUrl: restaurant?.notificationSoundUrl,
      notificationSoundEnabled: restaurant?.notificationSoundEnabled,
    });
  } catch {
    return NextResponse.json({});
  }
}
