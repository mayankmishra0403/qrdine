import { getBillData } from "@/lib/actions/bill";
import { notFound } from "next/navigation";
import BillContent from "./bill-content";

export default async function BillPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const result = await getBillData(orderId);

  if (!result.success || !result) notFound();

  return <BillContent data={(result as { data: Record<string, unknown> }).data} />;
}
