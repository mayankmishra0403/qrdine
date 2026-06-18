import { cookies } from "next/headers";
import { createHmac } from "node:crypto";

export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie) return null;

  try {
    const secret = process.env.AUTH_SECRET || "";
    const [payload, signature] = sessionCookie.value.split(".");
    if (!payload || !signature) return null;

    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    if (signature !== expected) return null;

    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) throw new Error("Authentication required");
  return { user: session };
}

export async function requireRole(...roles: string[]) {
  const session = await requireAuth();
  if (!roles.includes(session.user.role)) throw new Error("Forbidden");
  return session;
}

export async function auth() {
  const session = await getSession();
  if (!session) return null;
  return { user: session, expires: new Date(Date.now() + 86400000).toISOString() };
}
