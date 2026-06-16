"use client";

import { updateOrderStatus } from "@/lib/actions/orders";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function OrderStatusButton({
  orderId,
  status,
  variant,
  children,
}: {
  orderId: string;
  status: string;
  variant?: "default" | "outline";
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant={variant || "default"}
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await updateOrderStatus(orderId, status);
          router.refresh();
        } catch {
          setLoading(false);
        }
      }}
    >
      {loading ? "..." : children}
    </Button>
  );
}
