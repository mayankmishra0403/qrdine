"use server";

import { setTunnelUrl as setUrl } from "@/lib/qr";
import { revalidatePath } from "next/cache";

export async function setPublicUrl(url: string) {
  setUrl(url);
  revalidatePath("/admin/tables");
  return { success: true };
}

export async function getPublicUrl() {
  const tunnelUrl = process.env.TUNNEL_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return { url: tunnelUrl };
}
