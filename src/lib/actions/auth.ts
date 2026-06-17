"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { handleActionError } from "@/lib/errors";

export async function loginWithEmail(email: string, password: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return { success: false, error: "Invalid email or password" };

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return { success: false, error: "Invalid email or password" };

    const sessionData = JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      restaurantId: user.restaurantId,
    });

    const cookieStore = await cookies();
    cookieStore.set("session", Buffer.from(sessionData).toString("base64"), {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });

    return { success: true, role: user.role };
  } catch (error) {
    return { success: false, error: handleActionError(error).error };
  }
}

export async function loginWithPin(pin: string) {
  try {
    const user = await prisma.user.findFirst({ where: { pin, isActive: true } });
    if (!user) return { success: false, error: "Invalid PIN" };

    const sessionData = JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      restaurantId: user.restaurantId,
    });

    const cookieStore = await cookies();
    cookieStore.set("session", Buffer.from(sessionData).toString("base64"), {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });

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
    return JSON.parse(Buffer.from(sessionCookie.value, "base64").toString());
  } catch {
    return null;
  }
}
