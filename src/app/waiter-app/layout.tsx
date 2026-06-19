import type { ReactNode } from "react";
import { PwaRegister } from "@/components/pwa-register";
import { WaiterAppHeader } from "./waiter-app-header";

export default function WaiterAppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PwaRegister />
      <WaiterAppHeader />
      {children}
    </>
  );
}
