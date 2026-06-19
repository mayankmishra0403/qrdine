"use client";

import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";

type BillItem = {
  sr: number; name: string; hsn: string; qty: number; rate: number; amount: number;
};
type HsnRow = {
  hsn: string; taxable: number; cgst: number; sgst: number; igst: number;
};
type PaymentInfo = {
  method: string; amount: number; reference: string | null; createdAt: string;
};
type CustomerInfo = {
  name: string | null; phone: string | null; gstin: string | null; gstCategory: string | null;
};
type RestaurantInfo = {
  name: string; address: string | null; phone: string | null; email: string | null;
  gstin: string | null; pan: string | null; currency: string | null; billFooter: string | null;
};
type BillData = {
  invoiceNo: string; date: string; time: string; total: number; totalWords: string;
  restaurant: RestaurantInfo; tableNumber: number;
  customer: CustomerInfo | null;
  payment: PaymentInfo | null;
  items: BillItem[]; subtotal: number; discount: number; taxableAmt: number;
  cgst: number; sgst: number; igst: number; serviceCharge: number;
  hsnSummary: HsnRow[]; isGst: boolean;
};

export default function BillContent({ data: raw }: { data: unknown }) {
  const data = raw as BillData;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [billUrl, setBillUrl] = useState("");
  const [format, setFormat] = useState<"thermal" | "a4">("thermal");

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
    const url = window.location.href.split("?")[0];
    setBillUrl(url);
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 130, margin: 2, color: { dark: "#000", light: "#fff" } })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("print") !== "false") {
      setTimeout(() => window.print(), 500);
    }
  }, []);

  return (
    <>
      <div className="bill-container">
        <div className="text-center">
          <p className="bill-header">{data.restaurant.name}</p>
          <p className="bill-addr">{data.restaurant.address}</p>
          {data.restaurant.phone && <p className="bill-addr">📞 {data.restaurant.phone}</p>}
          {data.restaurant.email && <p className="bill-addr">✉️ {data.restaurant.email}</p>}
        </div>
        <div className="bill-divider" />

        <div className="flex justify-between bill-meta">
          <span className="bill-bold">{data.invoiceNo}</span>
          <span>{data.date} {data.time}</span>
        </div>
        {data.tableNumber > 0 && <div className="bill-meta">Table: {data.tableNumber}</div>}
        {data.customer?.name && <div className="bill-meta">Customer: {data.customer.name}</div>}
        {data.customer?.phone && <div className="bill-meta">Phone: {data.customer.phone}</div>}
        {data.customer?.gstin && <div className="bill-meta">GSTIN: {data.customer.gstin}</div>}
        <div className="bill-divider" />

        <table className="bill-table">
          <thead>
            <tr>
              <th className="text-left">#</th>
              <th className="text-left">Item</th>
              {data.isGst && <th style={{fontSize:"9px", textAlign:"center"}}>HSN</th>}
              <th className="text-right">Qty</th>
              <th className="text-right">Rate</th>
              <th className="text-right">Amt</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((i) => (
              <tr key={i.sr}>
                <td className="text-center" style={{fontSize:"11px"}}>{i.sr}</td>
                <td>{i.name}</td>
                {data.isGst && <td className="text-center" style={{fontSize:"9px", color:"#666"}}>{i.hsn}</td>}
                <td className="text-right">{i.qty}</td>
                <td className="text-right">{i.rate.toFixed(2)}</td>
                <td className="text-right bill-bold">{i.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="bill-divider" />

        <div className="bill-totals">
          <div className="bill-total-row"><span>Subtotal</span><span>₹{data.subtotal.toFixed(2)}</span></div>
          {data.discount > 0 && <div className="bill-total-row" style={{color:'#d32f2f'}}><span>Discount</span><span>-₹{data.discount.toFixed(2)}</span></div>}
          {data.cgst > 0 && <div className="bill-total-row"><span>CGST @ {(data.cgst / data.taxableAmt * 100).toFixed(1)}%</span><span>₹{data.cgst.toFixed(2)}</span></div>}
          {data.sgst > 0 && <div className="bill-total-row"><span>SGST @ {(data.sgst / data.taxableAmt * 100).toFixed(1)}%</span><span>₹{data.sgst.toFixed(2)}</span></div>}
          {data.igst > 0 && <div className="bill-total-row"><span>IGST @ {(data.igst / data.taxableAmt * 100).toFixed(1)}%</span><span>₹{data.igst.toFixed(2)}</span></div>}
          {data.serviceCharge > 0 && <div className="bill-total-row"><span>Service Charge</span><span>₹{data.serviceCharge.toFixed(2)}</span></div>}
          <div className="bill-divider" />
          <div className="bill-total-row bill-grand-total"><span>Total</span><span>₹{data.total.toFixed(2)}</span></div>
        </div>
        <p className="bill-words">{data.totalWords}</p>

        {data.payment && (
          <div className="bill-meta text-center">
            Paid via {data.payment.method.toUpperCase()}
            {data.payment.reference ? ` (${data.payment.reference})` : ""}
            {data.payment.amount ? ` · ₹${data.payment.amount.toFixed(2)}` : ""}
          </div>
        )}

        <div className="bill-footer">{data.restaurant.billFooter || "Thank you! Visit again!"}</div>

        <div className="qr-section no-print">
          <p className="qr-section-label">📱 Digital Bill</p>
          <canvas ref={canvasRef} />
          <p className="bill-url-text">{billUrl}</p>
        </div>
      </div>

      <div style={{display:"flex", gap:8, justifyContent:"center", marginTop: 8}} className="no-print">
        <button onClick={() => window.print()} className="px-4 py-1.5 bg-gray-900 text-white text-xs rounded-lg">
          🖨️ Print
        </button>
        <button onClick={handleA4Print} className="px-4 py-1.5 border-2 border-gray-900 text-gray-900 text-xs rounded-lg bg-white">
          📄 PDF (A4)
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: getAdminBillStyles(format) }} />
    </>
  );
}

function getAdminBillStyles(format: "thermal" | "a4") {
  const isA4 = format === "a4";
  return `
    .no-print { display: block; }
    @media print { .no-print { display: none !important; } }
    @page { size: ${isA4 ? "A4" : "80mm 297mm"}; margin: ${isA4 ? "15mm" : "0"}; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f3f4f6 !important; margin: 0 !important; padding: 16px !important; }
    nav, header, footer, .fixed, .md\\:hidden, .md\\:flex, [class*="sidebar"], [class*="navbar"], aside { display: none !important; }
    .min-h-screen.bg-background > *:not(main) { display: none !important; }
    main { margin: 0 !important; padding: 0 !important; max-width: 100% !important; }

    .bill-container { max-width: 420px; margin: 0 auto; padding: 24px 20px; font-family: system-ui, -apple-system, sans-serif; font-size: 14px; line-height: 1.6; color: #000; background: white; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .bill-header { font-size: 20px; font-weight: 800; margin-bottom: 2px; }
    .bill-addr { font-size: 12px; color: #444; font-weight: 600; }
    .bill-meta { font-size: 13px; padding: 2px 0; font-weight: 600; }
    .bill-bold { font-weight: 700; }
    .bill-divider { border-top: 2px solid #000; margin: 12px 0; }
    .bill-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .bill-table th { border-bottom: 2px solid #000; padding: 6px 2px; font-weight: 700; font-size: 12px; }
    .bill-table th:not(:first-child) { text-align: right; }
    .bill-table td { padding: 5px 2px; border-bottom: 1px solid #e5e7eb; font-weight: 600; }
    .bill-table td:not(:first-child) { text-align: right; }
    .bill-table td:last-child { font-weight: 700; }
    .bill-totals { margin: 8px 0; font-size: 13px; }
    .bill-total-row { display: flex; justify-content: space-between; padding: 3px 0; font-weight: 600; }
    .bill-grand-total { font-size: 18px; font-weight: 800; border-top: 2px solid #000; padding-top: 8px; margin-top: 4px; }
    .bill-words { font-size: 11px; color: #555; font-weight: 600; font-style: italic; text-align: center; margin: 8px 0; }
    .bill-footer { font-size: 13px; font-weight: 700; text-align: center; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #000; }
    .qr-section { display: flex; flex-direction: column; align-items: center; gap: 6px; margin-top: 14px; padding-top: 10px; border-top: 1px dashed #000; }
    .qr-section canvas { border-radius: 8px; }
    .qr-section-label { font-size: 12px; color: #444; font-weight: 700; }
    .bill-url-text { font-size: 10px; color: #2563eb; word-break: break-all; text-align: center; font-weight: 600; max-width: 100%; }

    @media print {
      .bill-container { ${isA4 ? "padding: 0; width: 100%; font-family: system-ui, -apple-system, sans-serif; font-size: 14px; line-height: 1.6; border-radius: 0; box-shadow: none; max-width: none;" : "width: 72mm; padding: 3mm 2mm; font-family: 'Courier New', 'Lucida Console', monospace; font-size: 13px; line-height: 1.45; border-radius: 0; box-shadow: none; max-width: none;"} }
      .bill-header { font-size: ${isA4 ? "22px" : "18px"}; font-weight: 700; }
      .bill-addr { font-size: ${isA4 ? "13px" : "11px"}; color: #333; }
      .bill-meta { font-size: ${isA4 ? "14px" : "11px"}; }
      .bill-divider { border-top: ${isA4 ? "2px" : "1px dashed"} #000; margin: ${isA4 ? "12px" : "5px"} 0; }
      .bill-table { font-size: ${isA4 ? "14px" : "12px"}; }
      .bill-table th { padding: ${isA4 ? "8px 4px" : "3px 1px"}; font-size: ${isA4 ? "13px" : "11px"}; }
      .bill-table td { padding: ${isA4 ? "6px 4px" : "2px 1px"}; }
      .bill-totals { font-size: ${isA4 ? "14px" : "12px"}; }
      .bill-total-row { padding: ${isA4 ? "4px 0" : "1.5px 0"}; }
      .bill-grand-total { font-size: ${isA4 ? "20px" : "16px"}; padding-top: ${isA4 ? "12px" : "4px"}; }
      .bill-words { font-size: ${isA4 ? "13px" : "10px"}; }
      .bill-footer { font-size: ${isA4 ? "14px" : "12px"}; }
      .qr-section { display: none !important; }
    }
  `;
}
