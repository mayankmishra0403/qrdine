import type { ReactNode } from "react";
import { InstallPrompt } from "@/components/install-prompt";
import { PwaRegister } from "@/components/pwa-register";
import { KitchenHeader } from "./kitchen-header";

export default function KitchenLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PwaRegister />
      <InstallPrompt />
      <KitchenHeader />
      {children}
    </>
  );
}
