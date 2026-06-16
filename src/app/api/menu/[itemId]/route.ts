import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await params;

  const item = await prisma.menuItem.findUnique({
    where: { id: itemId, restaurantId: session.user.restaurantId },
    include: { variants: true, category: true },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(serialize({
    ...item,
    price: Number(item.price),
    variants: item.variants.map((v) => ({ ...v, priceMod: Number(v.priceMod) })),
  }));
}
