import type { ReactNode } from "react";
import { InstallPrompt } from "@/components/install-prompt";

export default function WaiterAppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <InstallPrompt />
      {children}
    </>
  );
}
