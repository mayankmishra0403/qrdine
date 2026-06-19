"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { getPublicBillData } from "@/lib/actions/bill";
import QRCode from "qrcode";

function getBillStyles(format: "thermal" | "a4") {
  const isA4 = format === "a4";
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f3f4f6; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
    .bill-wrapper { max-width: 420px; margin: 0 auto; padding: 12px 8px; }
    .bill-container { background: white; border-radius: 16px; padding: 20px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-size: 14px; line-height: 1.6; color: #000; }
    .bill-header { font-size: 22px; font-weight: 900; text-align: center; letter-spacing: 0.5px; margin-bottom: 1px; }
    .bill-addr { font-size: 12px; color: #444; text-align: center; font-weight: 600; line-height: 1.4; }
    .bill-divider { border: none; border-top: 2px solid #000; margin: 10px 0; }
    .bill-divider-dashed { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    .bill-meta { font-size: 13px; padding: 2px 0; font-weight: 600; }
    .bill-meta .label { color: #555; }
    .bill-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .bill-table th { border-bottom: 2px solid #000; padding: 6px 2px; font-weight: 700; font-size: 12px; text-align: left; white-space: nowrap; }
    .bill-table th:not(:first-child) { text-align: right; }
    .bill-table td { padding: 5px 2px; border-bottom: 1px solid #e5e7eb; font-weight: 600; }
    .bill-table td:not(:first-child) { text-align: right; }
    .bill-table td:last-child { font-weight: 700; }
    .bill-totals { margin: 6px 0; font-size: 13px; }
    .bill-total-row { display: flex; justify-content: space-between; padding: 3px 0; font-weight: 600; }
    .bill-grand-total { font-size: 20px; font-weight: 900; border-top: 2px solid #000; padding-top: 8px; margin-top: 6px; }
    .bill-words { font-size: 11px; color: #555; font-weight: 600; font-style: italic; text-align: center; margin: 8px 0; }
    .bill-footer { font-size: 13px; font-weight: 700; text-align: center; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #000; }
    .bill-paid { background: #dcfce7; color: #166534; text-align: center; padding: 8px; border-radius: 8px; font-weight: 700; font-size: 13px; margin-bottom: 12px; }
    .qr-section { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-top: 16px; padding-top: 12px; border-top: 1px dashed #000; }
    .qr-section canvas { border-radius: 8px; }
    .bill-link { font-size: 10px; color: #2563eb; word-break: break-all; text-align: center; font-weight: 600; max-width: 100%; }
    .bill-link-label { font-size: 11px; color: #444; font-weight: 700; text-align: center; }
    .print-btn { display: block; width: 100%; padding: 14px; background: #111827; color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; text-align: center; }
    .print-btn:active { opacity: 0.8; }
    .print-btn-outline { display: block; width: 100%; padding: 14px; border: 2px solid #111827; color: #111827; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; text-align: center; background: white; }
    .print-btn-outline:active { opacity: 0.8; }
    .no-print { display: block; }
    .btn-row { display: flex; gap: 8px; margin-top: 12px; }
    .btn-row .print-btn { margin-top: 0; flex: 1; }
    .btn-row .print-btn-outline { margin-top: 0; flex: 1; }
    @media print {
      @page { size: ${isA4 ? "A4" : "90mm 297mm"}; margin: ${isA4 ? "15mm" : "0"}; }
      body { background: white; padding: 0; margin: 0; }
      .no-print { display: none !important; }
      .bill-wrapper { max-width: none; padding: 0; margin: 0; }
      .bill-container {
        ${isA4 ? "padding: 0; width: 100%; font-family: system-ui, -apple-system, sans-serif; font-size: 14px; line-height: 1.6;" : "padding: 0; width: 90mm; font-family: 'Courier New', 'Courier', monospace; font-size: 12px; line-height: 1.35; border-radius: 0; box-shadow: none; margin: 0;"}
        color: #000; background: none;
      }
      .bill-header { font-size: ${isA4 ? "24px" : "20px"}; font-weight: 900; letter-spacing: 1px; }
      .bill-addr { font-size: ${isA4 ? "14px" : "10px"}; color: #333; font-weight: 600; }
      .bill-divider { border-top: ${isA4 ? "2px solid" : "1px dashed"} #000; margin: ${isA4 ? "14px" : "3px"} 0; }
      .bill-divider-dashed { border-top: 1px dashed #666; margin: 3px 0; }
      .bill-meta { font-size: ${isA4 ? "14px" : "10px"}; padding: ${isA4 ? "3px 0" : "1px 0"}; font-weight: 600; }
      .bill-table { font-size: ${isA4 ? "14px" : "11px"}; width: 100%; }
      .bill-table th { padding: ${isA4 ? "8px 4px" : "2px 1px"}; font-size: ${isA4 ? "13px" : "10px"}; font-weight: 700; }
      .bill-table td { padding: ${isA4 ? "6px 4px" : "2px 1px"}; font-weight: 600; }
      .bill-totals { font-size: ${isA4 ? "14px" : "11px"}; margin: ${isA4 ? "8px 0" : "3px 0"}; }
      .bill-total-row { padding: ${isA4 ? "4px 0" : "1.5px 0"}; font-weight: 600; }
      .bill-grand-total { font-size: ${isA4 ? "22px" : "16px"}; font-weight: 900; border-top: 2px solid #000; padding-top: ${isA4 ? "12px" : "5px"}; margin-top: ${isA4 ? "8px" : "3px"}; }
      .bill-words { font-size: ${isA4 ? "13px" : "9px"}; color: #444; }
      .bill-footer { font-size: ${isA4 ? "14px" : "11px"}; font-weight: 700; margin-top: ${isA4 ? "12px" : "3px"}; padding-top: ${isA4 ? "12px" : "3px"}; }
      .qr-section { display: none !important; }
      .bill-paid { display: none !important; }
    }
  `;
}

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-dvh bg-gray-50">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 text-sm font-semibold">Loading bill...</p>
      </div>
    </div>
  );
}

function ErrorState({ msg }: { msg: string }) {
  return (
    <div className="flex items-center justify-center min-h-dvh bg-gray-50 p-6">
      <div className="text-center space-y-2 max-w-sm">
        <p className="text-3xl">😕</p>
        <p className="text-gray-700 font-bold">{msg}</p>
        <p className="text-xs text-gray-400 font-semibold">Please contact the restaurant</p>
      </div>
    </div>
  );
}

export default function PublicBillPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [format, setFormat] = useState<"thermal" | "a4">("thermal");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [billUrl, setBillUrl] = useState("");

  function handleA4Print() {
    setFormat("a4");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.print());
    });
  }

  useEffect(() => {
    if (format === "a4") {
      const onAfterPrint = () => setFormat("thermal");
      window.addEventListener("afterprint", onAfterPrint, { once: true });
      return () => window.removeEventListener("afterprint", onAfterPrint);
    }
  }, [format]);

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
    if (data) {
      const url = window.location.href.split("?")[0];
      setBillUrl(url);
      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, url, { width: 140, margin: 2, color: { dark: "#000", light: "#fff" } })
          .catch(() => {});
      }
    }
  }, [data]);

  if (loading) return <Loading />;
  if (error) return <ErrorState msg={error} />;
  if (!data) return <ErrorState msg="Bill not found" />;

  const bill = data as unknown as {
    invoiceNo: string; date: string; time: string;
    restaurant: { name: string; address: string | null; phone: string | null; email: string | null; gstin: string | null; pan: string | null; billFooter: string | null };
    tableNumber: number;
    customer: { name: string | null; phone: string | null; gstin: string | null } | null;
    payment: { method: string; amount: number; reference: string | null } | null;
    items: Array<{ sr: number; name: string; hsn: string; qty: number; rate: number; amount: number }>;
    subtotal: number; discount: number; taxableAmt: number;
    cgst: number; sgst: number; igst: number; serviceCharge: number;
    total: number; totalWords: string;
    hsnSummary: Array<{ hsn: string; taxable: number; cgst: number; sgst: number; igst: number }>;
    isGst: boolean;
  };

  return (
    <div className="bill-wrapper">
      {bill.payment && (
        <div className="bill-paid no-print">✅ Payment Complete — ₹{bill.total.toFixed(2)}</div>
      )}

      <div className="bill-container">
        <div className="text-center">
          <p className="bill-header">{bill.restaurant.name}</p>
          {bill.restaurant.address && <p className="bill-addr">{bill.restaurant.address}</p>}
          {bill.restaurant.phone && <p className="bill-addr">📞 {bill.restaurant.phone}</p>}
          {bill.restaurant.email && <p className="bill-addr">✉️ {bill.restaurant.email}</p>}
        </div>
        <div className="bill-divider" />

        <div className="flex justify-between bill-meta">
          <span><span className="label">Invoice:</span> {bill.invoiceNo}</span>
          <span>{bill.date} {bill.time}</span>
        </div>
        {bill.tableNumber > 0 && <div className="bill-meta"><span className="label">Table:</span> {bill.tableNumber}</div>}
        {bill.customer?.name && <div className="bill-meta"><span className="label">Customer:</span> {bill.customer.name}</div>}
        {bill.customer?.phone && <div className="bill-meta"><span className="label">Phone:</span> {bill.customer.phone}</div>}
        {bill.customer?.gstin && <div className="bill-meta"><span className="label">GSTIN:</span> {bill.customer.gstin}</div>}
        <div className="bill-divider" />

        <table className="bill-table">
          <thead>
            <tr>
              <th>Item</th>
              {bill.isGst && <th style={{fontSize:"10px", textAlign:"center"}}>HSN</th>}
              <th>Qty</th>
              <th>Rate</th>
              <th>Amt</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((i) => (
              <tr key={i.sr}>
                <td>{i.name}</td>
                {bill.isGst && <td style={{fontSize:"10px", textAlign:"center"}}>{i.hsn}</td>}
                <td>{i.qty}</td>
                <td>₹{i.rate.toFixed(2)}</td>
                <td>₹{i.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="bill-divider" />

        <div className="bill-totals">
          <div className="bill-total-row"><span>Subtotal</span><span>₹{bill.subtotal.toFixed(2)}</span></div>
          {bill.discount > 0 && <div className="bill-total-row" style={{color:"#dc2626"}}><span>Discount</span><span>-₹{bill.discount.toFixed(2)}</span></div>}
          {bill.cgst > 0 && <div className="bill-total-row"><span>CGST @ {(bill.cgst / bill.taxableAmt * 100).toFixed(1)}%</span><span>₹{bill.cgst.toFixed(2)}</span></div>}
          {bill.sgst > 0 && <div className="bill-total-row"><span>SGST @ {(bill.sgst / bill.taxableAmt * 100).toFixed(1)}%</span><span>₹{bill.sgst.toFixed(2)}</span></div>}
          {bill.serviceCharge > 0 && <div className="bill-total-row"><span>Service Charge</span><span>₹{bill.serviceCharge.toFixed(2)}</span></div>}
          <div className="bill-divider-dashed" />
          <div className="bill-total-row bill-grand-total"><span>Total</span><span>₹{bill.total.toFixed(2)}</span></div>
        </div>
        <p className="bill-words">{bill.totalWords}</p>

        {bill.payment && (
          <div className="bill-meta text-center" style={{marginTop: 6}}>
            Paid via {bill.payment.method.toUpperCase()}
            {bill.payment.reference ? ` (Ref: ${bill.payment.reference})` : ""}
            {bill.payment.amount != null ? ` · ₹${Number(bill.payment.amount).toFixed(2)}` : ""}
          </div>
        )}

        <div className="bill-footer">{bill.restaurant.billFooter || "Thank you! Visit again!"}</div>

        <div className="qr-section no-print">
          <p className="bill-link-label">📱 Scan for Digital Bill</p>
          <canvas ref={canvasRef} />
          <p className="bill-link-label">Bill Link</p>
          <p className="bill-link">{billUrl}</p>
        </div>
      </div>

      <div className="btn-row no-print">
        <button className="print-btn" onClick={() => window.print()}>
          🖨️ Print
        </button>
        <button className="print-btn-outline" onClick={handleA4Print}>
          📄 Save as PDF (A4)
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: getBillStyles(format) }} />
    </div>
  );
}
