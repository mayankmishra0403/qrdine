"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

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
  const router = useRouter();
  const bill = data as unknown as BillData;

  useEffect(() => {
    setTimeout(() => window.print(), 500);
  }, []);

  return (
    <>
      <div className="no-print fixed top-0 left-0 right-0 bg-white border-b z-50 px-4 py-2 flex items-center justify-between shadow-sm" style={{ display: 'flex !important' }}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>← Back</Button>
          <span className="text-xs text-muted-foreground hidden sm:inline">{bill.invoiceNo}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="text-xs" onClick={() => window.print()}>
            🖨️ Print
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => { window.print(); }}>
            💾 Save PDF
          </Button>
        </div>
      </div>

      <div className="bill-page">
        <div className="bill-container">
          {/* Header */}
          <div className="bill-header">
            <h1 className="bill-restaurant-name">{bill.restaurant.name}</h1>
            <p className="bill-address">{bill.restaurant.address || ""}</p>
          {bill.restaurant.phone && <p className="bill-info">📞 {bill.restaurant.phone}</p>}
          {bill.restaurant.email && <p className="bill-info">✉️ {bill.restaurant.email}</p>}
          <div className="bill-gst-row">
            {bill.restaurant.gstin && <span>GSTIN: {bill.restaurant.gstin}</span>}
            {bill.restaurant.pan && <span>PAN: {bill.restaurant.pan}</span>}
          </div>
          </div>

          <div className="bill-divider" />

          {/* Bill Meta */}
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

          {/* Items Table */}
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

          {/* Totals */}
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

          {/* Amount in Words */}
          <div className="bill-words">
            <p><strong>Amount in Words:</strong></p>
            <p className="bill-words-text">{bill.totalWords}</p>
          </div>

          {/* Payment */}
          {bill.payment && (
            <div className="bill-payment">
              <div className="bill-divider" />
              <p><strong>Payment:</strong> {bill.payment.method.toUpperCase()}
                {bill.payment.reference ? ` (Ref: ${bill.payment.reference})` : ""}
              </p>
            </div>
          )}

          {/* HSN Summary */}
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

          {/* Footer */}
          <div className="bill-footer">
            <div className="bill-divider" />
            <p className="bill-thanks">{(bill.restaurant as unknown as Record<string, string>).billFooter || "Thank you! Visit again!"}</p>
            {bill.customer?.gstin && <p className="bill-customer-gst">Customer GSTIN: {bill.customer.gstin}</p>}
            <p className="bill-powered">This is a computer-generated invoice</p>
            <p className="bill-powered">Powered by Ritam Bharat POS</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @page { size: A4; margin: 8mm; }
        nav.w-64 { display: none !important; }
        .flex.min-h-screen > main.flex-1 { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
        .flex.min-h-screen { display: block !important; }
        .bill-page { padding-top: 56px; display: flex; justify-content: center; background: #f5f5f5; min-height: 100vh; }
        .bill-container { width: 210mm; min-height: 297mm; background: white; padding: 15mm 12mm; font-family: 'Courier New', monospace; font-size: 11px; line-height: 1.5; }
        @media screen and (max-width: 800px) { .bill-container { width: 100%; padding: 40px 16px 16px; } }
        @media print {
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          nav.w-64 { display: none !important; }
          .flex.min-h-screen > main.flex-1 { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
          .flex.min-h-screen { display: block !important; }
          .no-print { display: none !important; }
        }
        .bill-header { text-align: center; margin-bottom: 10px; }
        .bill-restaurant-name { font-size: 20px; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px; }
        .bill-address { font-size: 10px; color: #555; margin: 2px 0; }
        .bill-info { font-size: 10px; color: #555; margin: 2px 0; }
        .bill-gst-row { font-size: 9px; color: #666; display: flex; justify-content: center; gap: 16px; margin-top: 4px; }
        .bill-divider { border-top: 1px dashed #333; margin: 8px 0; }
        .bill-meta { display: flex; justify-content: space-between; font-size: 10px; }
        .bill-meta p { margin: 2px 0; }
        .bill-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .bill-table th { border-bottom: 1px solid #333; padding: 4px 2px; text-align: left; font-weight: bold; }
        .bill-table td { padding: 3px 2px; border-bottom: 1px dotted #ccc; }
        .bill-table-sm th { font-size: 9px; }
        .bill-table-sm td { font-size: 9px; }
        .col-sr { width: 30px; text-align: center; }
        .col-item { text-align: left; }
        .col-hsn { width: 80px; text-align: center; }
        .col-qty { width: 40px; text-align: center; }
        .col-rate { width: 60px; text-align: right; }
        .col-amount { width: 80px; text-align: right; font-weight: bold; }
        .bill-totals { margin: 8px 0; font-size: 10px; }
        .bill-total-row { display: flex; justify-content: space-between; padding: 2px 0; }
        .bill-discount { color: #d32f2f; }
        .bill-grand-total { font-size: 14px; font-weight: bold; border-top: 2px solid #333; padding-top: 4px; }
        .bill-words { margin: 8px 0; font-size: 10px; }
        .bill-words-text { font-style: italic; color: #555; margin: 2px 0; }
        .bill-payment { margin: 8px 0; font-size: 10px; }
        .bill-section-title { font-weight: bold; font-size: 10px; margin: 4px 0; }
        .bill-footer { text-align: center; margin-top: 16px; }
        .bill-thanks { font-size: 12px; font-weight: bold; margin: 8px 0; }
        .bill-customer-gst { font-size: 9px; color: #666; }
        .bill-powered { font-size: 8px; color: #999; margin: 2px 0; }
        .bill-hsn-summary { margin: 8px 0; }
      `}</style>
    </>
  );
}
