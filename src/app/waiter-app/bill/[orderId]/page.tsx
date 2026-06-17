"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getBillData } from "@/lib/actions/bill";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function BillView() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBillData(orderId).then((r) => {
      if (r.success) setData((r as { data: Record<string, unknown> }).data);
      setLoading(false);
    });
  }, [orderId]);

  if (loading) return <div className="flex items-center justify-center min-h-dvh bg-gray-50"><p className="text-muted-foreground animate-pulse">Loading bill...</p></div>;
  if (!data) return <div className="flex items-center justify-center min-h-dvh bg-gray-50"><p className="text-muted-foreground">Bill not found</p></div>;

  const bill = data as unknown as {
    invoiceNo: string; date: string; time: string; total: number; totalWords: string;
    restaurant: { name: string; address: string | null };
    tableNumber: number; customer: { name: string | null; phone: string | null } | null;
    payment: { method: string; reference: string | null } | null;
    items: Array<{ sr: number; name: string; qty: number; rate: number; amount: number }>;
    subtotal: number; discount: number; taxableAmt: number;
    cgst: number; sgst: number; serviceCharge: number;
  };

  return (
    <div className="min-h-dvh bg-gray-50 p-4 max-w-lg mx-auto pb-28">
      <div className="flex items-center justify-between mb-3">
        <button className="text-lg" onClick={() => router.back()}>←</button>
        <h1 className="text-base font-bold">🧾 Bill</h1>
        <div className="flex gap-1">
          <Button size="sm" className="text-[10px] h-7" onClick={() => window.print()}>🖨️ Print</Button>
          <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => { window.print(); }}>💾 PDF</Button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3" style={{ fontFamily: "'Courier New', monospace" }}>
        <div className="text-center">
          <p className="text-sm font-bold">{bill.restaurant.name}</p>
          <p className="text-[10px] text-muted-foreground">{bill.restaurant.address}</p>
        </div>

        <Separator />

        <div className="flex justify-between text-[10px]">
          <span>{bill.invoiceNo}</span>
          <span>{bill.date} {bill.time}</span>
        </div>

        <Separator />

        <table className="w-full text-[10px]">
          <thead><tr className="border-b"><th className="text-left py-1">Item</th><th className="text-right">Qty</th><th className="text-right">Amt</th></tr></thead>
          <tbody>
            {bill.items.map((i) => (
              <tr key={i.sr}><td className="py-0.5">{i.name}</td><td className="text-right">{i.qty}</td><td className="text-right font-medium">₹{i.amount.toFixed(2)}</td></tr>
            ))}
          </tbody>
        </table>

        <Separator />

        <div className="text-[10px] space-y-0.5">
          <div className="flex justify-between"><span>Subtotal</span><span>₹{bill.subtotal.toFixed(2)}</span></div>
          {bill.discount > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>-₹{bill.discount.toFixed(2)}</span></div>}
          {bill.cgst > 0 && <div className="flex justify-between"><span>CGST</span><span>₹{bill.cgst.toFixed(2)}</span></div>}
          {bill.sgst > 0 && <div className="flex justify-between"><span>SGST</span><span>₹{bill.sgst.toFixed(2)}</span></div>}
          {bill.serviceCharge > 0 && <div className="flex justify-between"><span>Service Charge</span><span>₹{bill.serviceCharge.toFixed(2)}</span></div>}
          <Separator />
          <div className="flex justify-between font-bold text-sm"><span>Total</span><span>₹{bill.total.toFixed(2)}</span></div>
        </div>

        <p className="text-[9px] text-muted-foreground italic text-center">{bill.totalWords}</p>

        {bill.payment && (
          <p className="text-[9px] text-muted-foreground text-center">
            Paid via {bill.payment.method.toUpperCase()}{bill.payment.reference ? ` (${bill.payment.reference})` : ""}
          </p>
        )}

        <p className="text-[9px] text-muted-foreground text-center pt-2">Thank you!</p>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 pb-6">
        <div className="max-w-lg mx-auto grid grid-cols-2 gap-2">
          <Button size="sm" className="text-xs h-10" onClick={() => window.print()}>🖨️ Print</Button>
          <Button size="sm" variant="outline" className="text-xs h-10" onClick={() => { window.print(); }}>💾 Save PDF</Button>
        </div>
      </div>
    </div>
  );
}
