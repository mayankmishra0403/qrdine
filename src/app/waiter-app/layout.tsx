import type { ReactNode } from "react";
import { WaiterAppHeader } from "./waiter-app-header";

export default function WaiterAppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <WaiterAppHeader />
      {children}
    </>
  );
}
