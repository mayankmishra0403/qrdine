import type { ReactNode } from "react";
import { InstallPrompt } from "@/components/install-prompt";
import { KitchenHeader } from "./kitchen-header";

export default function KitchenLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <InstallPrompt />
      <KitchenHeader />
      {children}
    </>
  );
}
