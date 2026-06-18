"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { handleActionError } from "@/lib/errors";
import { createHmac } from "node:crypto";

function signSession(payload: Record<string, unknown>): string {
  const secret = process.env.AUTH_SECRET || "";
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encoded).digest("hex");
  return `${encoded}.${signature}`;
}

function makeSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: false,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 86400,
  };
}

export async function loginWithEmail(email: string, password: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return { success: false, error: "Invalid email or password" };

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return { success: false, error: "Invalid email or password" };

    const sessionData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      restaurantId: user.restaurantId,
    };

    const cookieStore = await cookies();
    cookieStore.set("session", signSession(sessionData), makeSessionCookieOptions());

    return { success: true, role: user.role };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function loginWithPin(pin: string) {
  try {
    const user = await prisma.user.findFirst({ where: { pin, isActive: true } });
    if (!user) return { success: false, error: "Invalid PIN" };

    const sessionData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      restaurantId: user.restaurantId,
    };

    const cookieStore = await cookies();
    cookieStore.set("session", signSession(sessionData), makeSessionCookieOptions());

    return { success: true, role: user.role };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

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
