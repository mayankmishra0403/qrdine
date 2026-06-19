"use client";

import { logout } from "@/lib/actions/auth";

export function LogoutButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        await logout();
        window.location.href = "/admin/login";
      }}
      className={`text-sm text-red-600 hover:underline ${className}`}
    >
      Logout
    </button>
  );
}
