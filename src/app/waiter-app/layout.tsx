import type { ReactNode } from "react";
import { PwaRegister } from "@/components/pwa-register";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";

export default function WaiterAppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PwaRegister />
      <PwaInstallPrompt />
      {children}
    </>
  );
}
