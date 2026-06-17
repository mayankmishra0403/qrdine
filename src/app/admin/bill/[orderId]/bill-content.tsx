"use client";

import { useEffect } from "react";

type BillItem = { sr: number; name: string; hsn: string; qty: number; rate: number; amount: number };
type HsnRow = { hsn: string; taxable: number; cgst: number; sgst: number; igst: number };
type PaymentInfo = { method: string; amount: number; reference: string | null; createdAt: string };
type CustomerInfo = { name: string | null; phone: string | null; gstin: string | null; gstCategory: string | null };
type RestaurantInfo = { name: string; address: string | null; phone: string | null; email: string | null; gstin: string | null; pan: string | null; billFooter: string | null };

type BillData = {
  invoiceNo: string;
  date: string;
  time: string;
  restaurant: RestaurantInfo;
  tableNumber: number;
  customer: CustomerInfo | null;
  payment: PaymentInfo | null;
  items: BillItem[];
  subtotal: number;
  discount: number;
  taxableAmt: number;
  cgst: number;
  sgst: number;
  igst: number;
  serviceCharge: number;
  total: number;
  totalWords: string;
  hsnSummary: HsnRow[];
  isGst: boolean;
};

export function BillContent({ data }: { data: Record<string, unknown> }) {
  const bill = data as unknown as BillData;

  useEffect(() => {
    setTimeout(() => window.print(), 500);
  }, []);

  return (
    <>
      <div className="bill-container">
        <div className="bill-header">
          <h1 className="bill-restaurant-name">{bill.restaurant.name}</h1>
          <p className="bill-address">{bill.restaurant.address || ""}</p>
          {bill.restaurant.phone && <p className="bill-info">{bill.restaurant.phone}</p>}
          {bill.restaurant.email && <p className="bill-info">{bill.restaurant.email}</p>}
          <div className="bill-gst-row">
            {bill.restaurant.gstin && <span>GSTIN: {bill.restaurant.gstin}</span>}
            {bill.restaurant.pan && <span>PAN: {bill.restaurant.pan}</span>}
          </div>
        </div>

        <div className="bill-divider" />

        <div className="bill-meta">
          <div className="bill-meta-left">
            <p><strong>Bill No:</strong> {bill.invoiceNo}</p>
            <p><strong>Date:</strong> {bill.date}</p>
            <p><strong>Time:</strong> {bill.time}</p>
          </div>
          <div className="bill-meta-right">
            <p><strong>Table:</strong> {bill.tableNumber}</p>
            {bill.customer?.name && <p><strong>Customer:</strong> {bill.customer.name}</p>}
            {bill.customer?.phone && <p><strong>Phone:</strong> {bill.customer.phone}</p>}
          </div>
        </div>

        <div className="bill-divider" />

        <table className="bill-table">
          <thead>
            <tr>
              <th className="col-sr">#</th>
              <th className="col-item">Item</th>
              <th className="col-hsn">HSN/SAC</th>
              <th className="col-qty">Qty</th>
              <th className="col-rate">Rate</th>
              <th className="col-amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item) => (
              <tr key={item.sr}>
                <td className="col-sr">{item.sr}</td>
                <td className="col-item">{item.name}</td>
                <td className="col-hsn">{item.hsn}</td>
                <td className="col-qty">{item.qty}</td>
                <td className="col-rate">{item.rate.toFixed(2)}</td>
                <td className="col-amount">{item.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="bill-divider" />

        <div className="bill-totals">
          <div className="bill-total-row">
            <span>Subtotal</span>
            <span>₹{bill.subtotal.toFixed(2)}</span>
          </div>
          {bill.discount > 0 && (
            <div className="bill-total-row bill-discount">
              <span>Discount</span>
              <span>-₹{bill.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="bill-total-row">
            <span>Taxable Amount</span>
            <span>₹{bill.taxableAmt.toFixed(2)}</span>
          </div>
          {bill.isGst && (
            <>
              {bill.cgst > 0 && (
                <div className="bill-total-row">
                  <span>CGST</span>
                  <span>₹{bill.cgst.toFixed(2)}</span>
                </div>
              )}
              {bill.sgst > 0 && (
                <div className="bill-total-row">
                  <span>SGST</span>
                  <span>₹{bill.sgst.toFixed(2)}</span>
                </div>
              )}
              {bill.igst > 0 && (
                <div className="bill-total-row">
                  <span>IGST</span>
                  <span>₹{bill.igst.toFixed(2)}</span>
                </div>
              )}
            </>
          )}
          {bill.serviceCharge > 0 && (
            <div className="bill-total-row">
              <span>Service Charge</span>
              <span>₹{bill.serviceCharge.toFixed(2)}</span>
            </div>
          )}
          <div className="bill-divider" />
          <div className="bill-total-row bill-grand-total">
            <span>Total</span>
            <span>₹{bill.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="bill-words">
          <p><strong>Amount in Words:</strong></p>
          <p className="bill-words-text">{bill.totalWords}</p>
        </div>

        {bill.payment && (
          <div className="bill-payment">
            <div className="bill-divider" />
            <p><strong>Payment:</strong> {bill.payment.method.toUpperCase()}
              {bill.payment.reference ? ` (Ref: ${bill.payment.reference})` : ""}
            </p>
          </div>
        )}

        {bill.isGst && bill.hsnSummary.length > 0 && (
          <div className="bill-hsn-summary">
            <div className="bill-divider" />
            <p className="bill-section-title">HSN/SAC Summary</p>
            <table className="bill-table bill-table-sm">
              <thead>
                <tr>
                  <th>HSN/SAC</th>
                  <th>Taxable</th>
                  <th>CGST</th>
                  <th>SGST</th>
                  <th>IGST</th>
                </tr>
              </thead>
              <tbody>
                {bill.hsnSummary.map((h, i) => (
                  <tr key={i}>
                    <td>{h.hsn}</td>
                    <td>{h.taxable.toFixed(2)}</td>
                    <td>{h.cgst.toFixed(2)}</td>
                    <td>{h.sgst.toFixed(2)}</td>
                    <td>{h.igst.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="bill-footer">
          <div className="bill-divider" />
          <p className="bill-thanks">{(bill.restaurant as unknown as Record<string, string>).billFooter || "Thank you! Visit again!"}</p>
          {bill.customer?.gstin && <p className="bill-customer-gst">Customer GSTIN: {bill.customer.gstin}</p>}
          <p className="bill-powered">This is a computer-generated invoice</p>
          <p className="bill-powered">Powered by Ritam Bharat POS</p>
        </div>
      </div>

      <style jsx global>{`
        @page { size: 80mm 297mm; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { background: white !important; margin: 0 !important; padding: 0 !important; min-height: auto !important; }
        body > div, body > div > div { min-height: auto !important; }
        nav, header, footer, .md\\:hidden, .md\\:flex, [class*="fixed"], .min-h-screen.bg-background > *:not(main) { display: none !important; }
        .min-h-screen.bg-background { display: block !important; background: white !important; min-height: auto !important; }
        .min-h-screen.bg-background main { margin: 0 !important; padding: 0 !important; max-width: 100% !important; min-height: auto !important; }
        .bill-container { width: 72mm; margin: 0 auto; padding: 2mm 0; font-family: 'Courier New', monospace; font-size: 10px; line-height: 1.4; color: #000; }
        @media print { .bill-container { width: 72mm; } }
        .bill-header { text-align: center; margin-bottom: 6px; }
        .bill-restaurant-name { font-size: 16px; font-weight: bold; margin: 0 0 2px; text-transform: uppercase; letter-spacing: 1px; }
        .bill-address { font-size: 9px; color: #333; margin: 1px 0; }
        .bill-info { font-size: 9px; color: #333; margin: 1px 0; }
        .bill-gst-row { font-size: 8px; color: #555; display: flex; justify-content: center; gap: 12px; margin-top: 2px; }
        .bill-divider { border-top: 1px dashed #000; margin: 5px 0; }
        .bill-meta { display: flex; justify-content: space-between; font-size: 9px; }
        .bill-meta p { margin: 1px 0; }
        .bill-table { width: 100%; border-collapse: collapse; font-size: 9px; }
        .bill-table th { border-bottom: 1px solid #000; padding: 3px 1px; text-align: left; font-weight: bold; }
        .bill-table td { padding: 2px 1px; border-bottom: 1px dotted #aaa; }
        .bill-table-sm th { font-size: 8px; }
        .bill-table-sm td { font-size: 8px; }
        .col-sr { width: 20px; text-align: center; }
        .col-item { text-align: left; }
        .col-hsn { width: 60px; text-align: center; font-size: 8px; }
        .col-qty { width: 30px; text-align: center; }
        .col-rate { width: 50px; text-align: right; }
        .col-amount { width: 60px; text-align: right; font-weight: bold; }
        .bill-totals { margin: 5px 0; font-size: 9px; }
        .bill-total-row { display: flex; justify-content: space-between; padding: 1px 0; }
        .bill-discount { color: #d32f2f; }
        .bill-grand-total { font-size: 12px; font-weight: bold; border-top: 2px solid #000; padding-top: 3px; }
        .bill-words { margin: 5px 0; font-size: 9px; }
        .bill-words-text { font-style: italic; color: #333; margin: 1px 0; }
        .bill-payment { margin: 5px 0; font-size: 9px; }
        .bill-section-title { font-weight: bold; font-size: 9px; margin: 2px 0; }
        .bill-footer { text-align: center; margin-top: 10px; }
        .bill-thanks { font-size: 10px; font-weight: bold; margin: 5px 0; }
        .bill-customer-gst { font-size: 8px; color: #555; }
        .bill-powered { font-size: 7px; color: #777; margin: 1px 0; }
        .bill-hsn-summary { margin: 5px 0; }
      `}</style>
    </>
  );
}
