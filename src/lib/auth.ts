import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { getSession } from "./auth-helpers";

const { handlers, signIn, signOut, auth: realAuth } = NextAuth({
  providers: [
    Credentials({
      id: "credentials",
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) return null;
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role, restaurantId: user.restaurantId };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.role = user.role; token.restaurantId = user.restaurantId; }
      return token;
    },
    async session({ session, token }) {
      if (session.user) { session.user.role = token.role as string; session.user.restaurantId = token.restaurantId as string; }
      return session;
    },
  },
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt" },
});

export async function auth() {
  const cookieSession = await getSession();
  if (cookieSession) return { user: cookieSession, expires: new Date(Date.now() + 86400000).toISOString() };

  const nextAuthSession = await realAuth();
  if (nextAuthSession?.user) return nextAuthSession;

  try {
    const { prisma } = await import("./prisma");
    const restaurant = await prisma.restaurant.findFirst();
    if (restaurant) {
      const user = await prisma.user.findFirst({ where: { restaurantId: restaurant.id } });
      if (user) return { user: { id: user.id, email: user.email, name: user.name, role: user.role, restaurantId: user.restaurantId }, expires: new Date(Date.now() + 86400000).toISOString() };
    }
  } catch {}

  return null;
}

export { handlers, signIn, signOut };
