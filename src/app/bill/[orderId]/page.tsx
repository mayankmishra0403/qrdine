"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getPublicBillData } from "@/lib/actions/bill";

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-dvh bg-gray-50">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 text-sm">Loading bill...</p>
      </div>
    </div>
  );
}

function ErrorState({ msg }: { msg: string }) {
  return (
    <div className="flex items-center justify-center min-h-dvh bg-gray-50 p-6">
      <div className="text-center space-y-2 max-w-sm">
        <p className="text-3xl">😕</p>
        <p className="text-gray-700 font-medium">{msg}</p>
        <p className="text-xs text-gray-400">Please contact the restaurant</p>
      </div>
    </div>
  );
}

export default function PublicBillPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const [doPrint, setDoPrint] = useState(false);

  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getPublicBillData(orderId).then((r) => {
      if (r.success) {
        setData((r as { data: Record<string, unknown> }).data);
      } else {
        setError((r as { error: string }).error);
      }
      setLoading(false);
    });
  }, [orderId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("print") === "true") setDoPrint(true);
    }
  }, []);

  useEffect(() => {
    if (doPrint && data) {
      setTimeout(() => window.print(), 500);
    }
  }, [doPrint, data]);

  if (loading) return <Loading />;
  if (error) return <ErrorState msg={error} />;
  if (!data) return <ErrorState msg="Bill not found" />;

  const bill = data as unknown as {
    invoiceNo: string;
    date: string;
    time: string;
    restaurant: { name: string; address: string | null; phone: string | null; email: string | null; gstin: string | null; pan: string | null; billFooter: string | null };
    tableNumber: number;
    customer: { name: string | null; phone: string | null; gstin: string | null } | null;
    payment: { method: string; amount: number; reference: string | null } | null;
    items: Array<{ sr: number; name: string; hsn: string; qty: number; rate: number; amount: number }>;
    subtotal: number;
    discount: number;
    taxableAmt: number;
    cgst: number;
    sgst: number;
    igst: number;
    serviceCharge: number;
    total: number;
    totalWords: string;
    hsnSummary: Array<{ hsn: string; taxable: number; cgst: number; sgst: number; igst: number }>;
    isGst: boolean;
  };

  const P = bill.isGst ? "GST" : "";

  return (
    <>
      {/* Screen: Mobile-friendly card view */}
      {!doPrint && (
        <div className="min-h-dvh bg-gray-50 p-4 md:p-8">
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gray-900 text-white px-5 py-6 text-center">
              <p className="text-lg font-bold">{bill.restaurant.name}</p>
              {bill.restaurant.address && <p className="text-xs text-gray-300 mt-1">{bill.restaurant.address}</p>}
              {bill.restaurant.phone && <p className="text-xs text-gray-300">{bill.restaurant.phone}</p>}
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <div>
                  <p className="font-semibold">{bill.invoiceNo}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{bill.date} · {bill.time}</p>
                </div>
                {bill.payment ? (
                  <span className="text-green-700 bg-green-100 px-3 py-1 rounded-full text-xs font-semibold">Paid</span>
                ) : (
                  <span className="text-amber-700 bg-amber-100 px-3 py-1 rounded-full text-xs font-semibold">Unpaid</span>
                )}
              </div>

              {bill.tableNumber > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Table {bill.tableNumber}</span>
                </div>
              )}

              {bill.customer?.name && <p className="text-sm">Customer: {bill.customer.name}</p>}
              {bill.customer?.phone && <p className="text-sm text-gray-500">{bill.customer.phone}</p>}

              <div className="border-t pt-3">
                <div className="flex justify-between text-xs text-gray-500 pb-1 font-medium">
                  <span className="flex-1">Item</span>
                  <span className="w-12 text-right">Qty</span>
                  <span className="w-20 text-right">Amount</span>
                </div>
                {bill.items.map((i) => (
                  <div key={i.sr} className="flex justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                    <span className="flex-1">{i.name}</span>
                    <span className="w-12 text-right text-gray-500">{i.qty}</span>
                    <span className="w-20 text-right font-medium">₹{i.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>₹{bill.subtotal.toFixed(2)}</span></div>
                {bill.discount > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>-₹{bill.discount.toFixed(2)}</span></div>}
                {bill.cgst > 0 && <div className="flex justify-between"><span>CGST</span><span>₹{bill.cgst.toFixed(2)}</span></div>}
                {bill.sgst > 0 && <div className="flex justify-between"><span>SGST</span><span>₹{bill.sgst.toFixed(2)}</span></div>}
                {bill.serviceCharge > 0 && <div className="flex justify-between"><span className="text-gray-500">Service Charge</span><span>₹{bill.serviceCharge.toFixed(2)}</span></div>}
                <div className="border-t pt-2 flex justify-between text-lg font-bold"><span>Total</span><span>₹{bill.total.toFixed(2)}</span></div>
              </div>

              <p className="text-xs text-gray-400 italic text-center">{bill.totalWords}</p>

              {bill.payment && (
                <div className="bg-green-50 rounded-xl px-4 py-3 text-sm text-center text-green-800">
                  Paid via {bill.payment.method.toUpperCase()}
                  {bill.payment.reference && <span> · Ref: {bill.payment.reference}</span>}
                </div>
              )}

              <p className="text-xs text-gray-400 text-center">{bill.restaurant.billFooter || "Thank you! Visit again!"}</p>
            </div>

            {bill.restaurant.gstin && (
              <div className="border-t bg-gray-50 px-5 py-3 text-xs text-gray-500 space-y-0.5">
                <p>GSTIN: {bill.restaurant.gstin}</p>
                {bill.restaurant.pan && <p>PAN: {bill.restaurant.pan}</p>}
                {bill.restaurant.email && <p>{bill.restaurant.email}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Print version: Thermal format */}
      <div className="print-only">
        <div className="bill-container">
          <div className="text-center">
            <p className="bill-header">{bill.restaurant.name}</p>
            {bill.restaurant.address && <p className="bill-addr">{bill.restaurant.address}</p>}
            {bill.restaurant.phone && <p className="bill-addr">{bill.restaurant.phone}</p>}
            {bill.restaurant.email && <p className="bill-addr">{bill.restaurant.email}</p>}
          </div>
          <div className="bill-divider" />
          <div className="flex justify-between bill-meta">
            <span className="bill-bold">{bill.invoiceNo}</span>
            <span>{bill.date} {bill.time}</span>
          </div>
          {bill.tableNumber > 0 && <div className="bill-meta">Table: {bill.tableNumber}</div>}
          {bill.customer?.name && <div className="bill-meta">Customer: {bill.customer.name}</div>}
          {bill.customer?.gstin && <div className="bill-meta">GSTIN: {bill.customer.gstin}</div>}
          <div className="bill-divider" />

          <table className="bill-table">
            <thead>
              <tr>
                <th className="text-left">Item</th>
                {bill.isGst && <th className="text-center" style={{fontSize:"9px"}}>HSN</th>}
                <th className="text-right">Qty</th>
                <th className="text-right">Rate</th>
                <th className="text-right">Amt</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((i) => (
                <tr key={i.sr}>
                  <td>{i.name}</td>
                  {bill.isGst && <td className="text-center" style={{fontSize:"9px", color:"#666"}}>{i.hsn}</td>}
                  <td className="text-right">{i.qty}</td>
                  <td className="text-right">{i.rate.toFixed(2)}</td>
                  <td className="text-right bill-bold">{i.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bill-divider" />

          <div className="bill-totals">
            <div className="bill-total-row"><span>Subtotal</span><span>₹{bill.subtotal.toFixed(2)}</span></div>
            {bill.discount > 0 && <div className="bill-total-row" style={{color:'#d32f2f'}}><span>Discount</span><span>-₹{bill.discount.toFixed(2)}</span></div>}
            {bill.cgst > 0 && <div className="bill-total-row"><span>CGST @ {(bill.cgst / bill.taxableAmt * 100).toFixed(1)}%</span><span>₹{bill.cgst.toFixed(2)}</span></div>}
            {bill.sgst > 0 && <div className="bill-total-row"><span>SGST @ {(bill.sgst / bill.taxableAmt * 100).toFixed(1)}%</span><span>₹{bill.sgst.toFixed(2)}</span></div>}
            {bill.serviceCharge > 0 && <div className="bill-total-row"><span>Service Charge</span><span>₹{bill.serviceCharge.toFixed(2)}</span></div>}
            <div className="bill-divider" />
            <div className="bill-total-row bill-grand-total"><span>Total</span><span>₹{bill.total.toFixed(2)}</span></div>
          </div>
          <p className="bill-words">{bill.totalWords}</p>

          {bill.payment && (
            <div className="bill-meta text-center">
              Paid via {bill.payment.method.toUpperCase()}{bill.payment.reference ? ` (${bill.payment.reference})` : ""}
              {bill.payment.amount ? ` · ₹${bill.payment.amount.toFixed(2)}` : ""}
            </div>
          )}

          <div className="bill-footer">{bill.restaurant.billFooter || "Thank you! Visit again!"}</div>
        </div>
      </div>

      <style jsx global>{`
        .print-only { display: none; }
        @media print {
          body { margin: 0 !important; padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          nav, header, footer, .no-print, .min-h-dvh { display: none !important; }
          .print-only { display: block !important; }
        }
      `}</style>

      <style jsx global>{`
        @page { size: 80mm 297mm; margin: 0; }
        body { margin: 0; padding: 0; background: #fff; }
        * { margin: 0; padding: 0; box-sizing: border-box; }

        @media print {
          .bill-container { width: 72mm; padding: 3mm 2mm; font-family: 'Courier New', 'Lucida Console', monospace; font-size: 13px; line-height: 1.45; color: #000; }
          .bill-header { font-size: 18px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 2px; }
          .bill-addr { font-size: 11px; color: #333; }
          .bill-meta { font-size: 11px; padding: 1px 0; }
          .bill-bold { font-weight: 700; }
          .bill-divider { border-top: 1px dashed #000; margin: 5px 0; }
          .bill-table { width: 100%; border-collapse: collapse; font-size: 12px; }
          .bill-table th { border-bottom: 1.5px solid #000; padding: 3px 1px; font-weight: 600; font-size: 11px; }
          .bill-table td { padding: 2px 1px; border-bottom: 1px solid #ddd; }
          .bill-totals { margin: 4px 0; font-size: 12px; }
          .bill-total-row { display: flex; justify-content: space-between; padding: 1.5px 0; }
          .bill-grand-total { font-size: 16px; font-weight: 700; border-top: 2px solid #000; padding-top: 4px; margin-top: 2px; }
          .bill-words { font-size: 10px; color: #555; font-style: italic; text-align: center; margin: 4px 0; }
          .bill-footer { font-size: 12px; font-weight: 600; text-align: center; margin-top: 6px; padding-top: 4px; border-top: 1px dashed #000; }
        }
      `}</style>
    </>
  );
}
