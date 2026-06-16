import { prisma } from "./prisma";
import { headers } from "next/headers";

function extractSubdomain(host: string | null): string | null {
  if (!host) return null;
  const parts = host.split(".");
  if (parts.length < 3) return null;
  return parts[0];
}

export async function getCurrentRestaurant() {
  const headersList = await headers();
  const host = headersList.get("host");
  const slug = extractSubdomain(host);
  if (!slug) return null;

  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  return restaurant;
}
