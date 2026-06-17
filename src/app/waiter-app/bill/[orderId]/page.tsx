"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getBillData } from "@/lib/actions/bill";

export default function BillView() {
  const params = useParams();
  const orderId = params.orderId as string;

  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBillData(orderId).then((r) => {
      if (r.success) setData((r as { data: Record<string, unknown> }).data);
      setLoading(false);
    });
  }, [orderId]);

  useEffect(() => {
    setTimeout(() => window.print(), 500);
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-dvh bg-white"><p className="text-muted-foreground animate-pulse">Loading bill...</p></div>;
  if (!data) return <div className="flex items-center justify-center min-h-dvh bg-white"><p className="text-muted-foreground">Bill not found</p></div>;

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
    <>
      <div className="bill-container">
        <div className="text-center">
          <p className="text-sm font-bold">{bill.restaurant.name}</p>
          <p className="text-[10px] text-gray-600">{bill.restaurant.address}</p>
        </div>

        <div className="bill-divider" />

        <div className="flex justify-between text-[10px]">
          <span>{bill.invoiceNo}</span>
          <span>{bill.date} {bill.time}</span>
        </div>

        <div className="bill-divider" />

        <table className="bill-table">
          <thead><tr><th className="text-left">Item</th><th className="text-right">Qty</th><th className="text-right">Amt</th></tr></thead>
          <tbody>
            {bill.items.map((i) => (
              <tr key={i.sr}><td>{i.name}</td><td className="text-right">{i.qty}</td><td className="text-right font-medium">₹{i.amount.toFixed(2)}</td></tr>
            ))}
          </tbody>
        </table>

        <div className="bill-divider" />

        <div className="bill-totals">
          <div className="bill-total-row"><span>Subtotal</span><span>₹{bill.subtotal.toFixed(2)}</span></div>
          {bill.discount > 0 && <div className="bill-total-row" style={{color:'#d32f2f'}}><span>Discount</span><span>-₹{bill.discount.toFixed(2)}</span></div>}
          {bill.cgst > 0 && <div className="bill-total-row"><span>CGST</span><span>₹{bill.cgst.toFixed(2)}</span></div>}
          {bill.sgst > 0 && <div className="bill-total-row"><span>SGST</span><span>₹{bill.sgst.toFixed(2)}</span></div>}
          {bill.serviceCharge > 0 && <div className="bill-total-row"><span>Service Charge</span><span>₹{bill.serviceCharge.toFixed(2)}</span></div>}
          <div className="bill-divider" />
          <div className="bill-total-row bill-grand-total"><span>Total</span><span>₹{bill.total.toFixed(2)}</span></div>
        </div>

        <p className="text-[9px] text-gray-500 italic text-center">{bill.totalWords}</p>

        {bill.payment && (
          <p className="text-[9px] text-gray-500 text-center">
            Paid via {bill.payment.method.toUpperCase()}{bill.payment.reference ? ` (${bill.payment.reference})` : ""}
          </p>
        )}

        <p className="text-[10px] font-bold text-center pt-2">Thank you! Visit again!</p>
      </div>

      <style jsx global>{`
        @page { size: 80mm 297mm; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: white !important; margin: 0 !important; padding: 0 !important; }
        .bill-container { width: 72mm; margin: 0 auto; padding: 2mm 0; font-family: 'Courier New', monospace; font-size: 10px; line-height: 1.4; color: #000; }
        @media print { .bill-container { width: 72mm; } }
        .bill-divider { border-top: 1px dashed #000; margin: 4px 0; }
        .bill-table { width: 100%; border-collapse: collapse; font-size: 9px; }
        .bill-table th { border-bottom: 1px solid #000; padding: 2px 1px; }
        .bill-table td { padding: 2px 1px; }
        .bill-totals { margin: 4px 0; font-size: 9px; }
        .bill-total-row { display: flex; justify-content: space-between; padding: 1px 0; }
        .bill-grand-total { font-size: 12px; font-weight: bold; border-top: 2px solid #000; padding-top: 3px; }
      `}</style>
    </>
  );
}
