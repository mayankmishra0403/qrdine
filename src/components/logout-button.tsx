"use client";

import { logout } from "@/lib/actions/auth";
import { useRouter } from "next/navigation";

export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await logout();
        router.push("/admin/login");
        router.refresh();
      }}
      className={`text-sm text-red-600 hover:underline ${className}`}
    >
      Logout
    </button>
  );
}
