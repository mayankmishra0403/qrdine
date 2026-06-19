"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getBillData } from "@/lib/actions/bill";
import { processPayment } from "@/lib/actions/pos";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash", icon: "💵" },
  { id: "upi", label: "UPI", icon: "📱" },
  { id: "card", label: "Card", icon: "💳" },
];

export default function BillView() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    getBillData(orderId).then((r) => {
      if (r.success) {
        const d = (r as { data: Record<string, unknown> }).data;
        setData(d);
        if ((d as Record<string, unknown>).payment) setPaid(true);
      }
      setLoading(false);
    });
  }, [orderId]);

  useEffect(() => {
    if (!loading && data && paid) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, data, paid]);

  async function handlePayment() {
    if (processing) return;
    setProcessing(true);
    try {
      const result = await processPayment({
        orderId,
        method,
        amount: Number((data as Record<string, unknown>).total),
        reference: reference || undefined,
      });
      if (result.success) {
        setPaid(true);
        toast.success("Payment recorded successfully");
      } else {
        toast.error(result.error || "Payment failed");
      }
    } catch {
      toast.error("Payment failed");
    }
    setProcessing(false);
  }

  if (loading) return <div className="flex items-center justify-center min-h-dvh bg-gray-50"><div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin" /></div>;
  if (!data) return <div className="flex items-center justify-center min-h-dvh bg-gray-50 p-6"><p className="text-gray-500">Bill not found</p></div>;

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
      <div className="min-h-screen bg-gray-50 p-3">
        {paid && (
          <div className="max-w-sm mx-auto mb-3 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-center text-green-800 font-medium">
            ✅ Payment Complete — ₹{bill.total.toFixed(2)}
          </div>
        )}

        <div className="bill-container">
          <div className="text-center">
            <p className="bill-header">{bill.restaurant.name}</p>
            {bill.restaurant.address && <p className="bill-addr">{bill.restaurant.address}</p>}
          </div>
          <div className="bill-divider" />
          <div className="flex justify-between bill-meta">
            <span className="bill-bold">{bill.invoiceNo}</span>
            <span>{bill.date} {bill.time}</span>
          </div>
          {bill.tableNumber > 0 && <div className="bill-meta">Table: {bill.tableNumber}</div>}
          <div className="bill-divider" />

          <table className="bill-table">
            <thead><tr><th className="text-left">Item</th><th className="text-right">Qty</th><th className="text-right">Amt</th></tr></thead>
            <tbody>
              {bill.items.map((i) => (
                <tr key={i.sr}><td>{i.name}</td><td className="text-right">{i.qty}</td><td className="text-right bill-bold">₹{i.amount.toFixed(2)}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="bill-divider" />

          <div className="bill-totals">
            <div className="bill-total-row"><span>Subtotal</span><span>₹{bill.subtotal.toFixed(2)}</span></div>
            {bill.discount > 0 && <div className="bill-total-row" style={{color:'#d32f2f'}}><span>Discount</span><span>-₹{bill.discount.toFixed(2)}</span></div>}
            {bill.cgst > 0 && <div className="bill-total-row"><span>CGST</span><span>₹{bill.cgst.toFixed(2)}</span></div>}
            {bill.sgst > 0 && <div className="bill-total-row"><span>SGST</span><span>₹{bill.sgst.toFixed(2)}</span></div>}
            {bill.serviceCharge > 0 && <div className="bill-total-row"><span>Service Chg</span><span>₹{bill.serviceCharge.toFixed(2)}</span></div>}
            <div className="bill-divider" />
            <div className="bill-total-row bill-grand-total"><span>Total</span><span>₹{bill.total.toFixed(2)}</span></div>
          </div>
          <p className="bill-words">{bill.totalWords}</p>

          {bill.payment && (
            <p className="bill-meta text-center">
              Paid via {bill.payment.method.toUpperCase()}{bill.payment.reference ? ` (${bill.payment.reference})` : ""}
            </p>
          )}
          <div className="bill-footer">Thank you! Visit again!</div>
        </div>

        {!paid && (
          <div className="no-print max-w-sm mx-auto mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.id}
                  onClick={() => setMethod(pm.id)}
                  className={`flex flex-col items-center justify-center py-3 rounded-xl text-sm font-medium transition-all ${
                    method === pm.id
                      ? "bg-gray-900 text-white ring-2 ring-gray-900"
                      : "bg-white border border-gray-200 text-gray-700 active:scale-95"
                  }`}
                >
                  <span className="text-xl mb-1">{pm.icon}</span>
                  {pm.label}
                </button>
              ))}
            </div>

            {method === "upi" && (
              <input
                type="text"
                placeholder="UPI reference (optional)"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            )}

            <button
              onClick={handlePayment}
              disabled={processing}
              className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold text-base active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                `Pay ₹${bill.total.toFixed(2)}`
              )}
            </button>

            <button
              onClick={() => router.push("/waiter-app")}
              className="w-full text-center text-sm text-gray-400 py-2"
            >
              Back to orders
            </button>
          </div>
        )}

        {paid && (
          <div className="no-print max-w-sm mx-auto mt-3 space-y-2">
            <button
              onClick={() => window.print()}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold text-sm"
            >
              🖨️ Print Bill
            </button>
            <button
              onClick={() => router.push("/waiter-app")}
              className="w-full text-center text-sm text-gray-400 py-2"
            >
              Back to orders
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        .no-print { display: block; }
        @media print { .no-print { display: none !important; } body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      `}</style>

      <style jsx global>{`
        @page { size: 80mm 297mm; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: white; margin: 0; padding: 0; }
        .bill-container { max-width: 420px; margin: 0 auto; padding: 20px 16px; background: white; border-radius: 16px; font-family: system-ui, -apple-system, sans-serif; font-size: 14px; line-height: 1.6; color: #000; }
        .bill-header { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
        .bill-addr { font-size: 12px; color: #555; }
        .bill-meta { font-size: 12px; padding: 1px 0; }
        .bill-bold { font-weight: 700; }
        .bill-divider { border-top: 1px solid #ddd; margin: 10px 0; }
        .bill-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .bill-table th { border-bottom: 2px solid #000; padding: 6px 2px; font-weight: 600; font-size: 12px; }
        .bill-table td { padding: 4px 2px; border-bottom: 1px solid #eee; }
        .bill-totals { margin: 8px 0; font-size: 13px; }
        .bill-total-row { display: flex; justify-content: space-between; padding: 2px 0; }
        .bill-grand-total { font-size: 18px; font-weight: 700; border-top: 2px solid #000; padding-top: 6px; margin-top: 2px; }
        .bill-words { font-size: 11px; color: #666; font-style: italic; text-align: center; margin: 6px 0; }
        .bill-footer { font-size: 13px; font-weight: 600; text-align: center; margin-top: 8px; padding-top: 6px; border-top: 1px dashed #ccc; }

        @media print {
          .bill-container { width: 72mm; padding: 3mm 2mm; font-family: 'Courier New', 'Lucida Console', monospace; font-size: 13px; line-height: 1.45; border-radius: 0; box-shadow: none; max-width: none; }
          .bill-header { font-size: 18px; font-weight: 700; }
          .bill-addr { font-size: 11px; color: #333; }
          .bill-meta { font-size: 11px; }
          .bill-divider { border-top: 1px dashed #000; margin: 5px 0; }
          .bill-table { font-size: 12px; }
          .bill-table th { padding: 3px 1px; font-size: 11px; }
          .bill-table td { padding: 2px 1px; }
          .bill-totals { font-size: 12px; }
          .bill-total-row { padding: 1.5px 0; }
          .bill-grand-total { font-size: 16px; padding-top: 4px; }
          .bill-words { font-size: 10px; }
          .bill-footer { font-size: 12px; }
        }
      `}</style>
    </>
  );
}
