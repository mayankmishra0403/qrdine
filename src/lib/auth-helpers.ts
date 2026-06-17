import { cookies } from "next/headers";
import { prisma } from "./prisma";

export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie) return null;

  try {
    return JSON.parse(Buffer.from(sessionCookie.value, "base64").toString());
  } catch {
    return null;
  }
}

async function getDemoSession() {
  const restaurant = await prisma.restaurant.findFirst();
  if (!restaurant) throw new Error("No restaurant found. Run seed first.");

  const user = await prisma.user.findFirst({
    where: { restaurantId: restaurant.id },
  });
  if (!user) throw new Error("No user found. Run seed first.");

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      restaurantId: user.restaurantId,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };
}

export async function requireAuth() {
  const session = await getSession();
  if (session) {
    return { user: session };
  }
  try {
    return await getDemoSession();
  } catch {
    throw new Error("Authentication required");
  }
}

export async function requireRole(...roles: string[]) {
  const session = await requireAuth();
  if (!roles.includes(session.user.role)) throw new Error("Forbidden");
  return session;
}

export async function auth() {
  const session = await getSession();
  if (session) {
    return { user: session, expires: new Date(Date.now() + 86400000).toISOString() };
  }
  try {
    return await getDemoSession();
  } catch {
    return null;
  }
}
