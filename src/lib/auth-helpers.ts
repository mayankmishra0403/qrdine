import { prisma } from "./prisma";

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
  return getDemoSession();
}

export async function requireRole(...roles: string[]) {
  const session = await requireAuth();
  if (!roles.includes(session.user.role)) throw new Error("Forbidden");
  return session;
}

/** Drop-in replacement for `auth()` when auth is disabled */
export async function auth() {
  try {
    return await getDemoSession();
  } catch {
    return null;
  }
}
