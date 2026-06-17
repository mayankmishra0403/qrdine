"use client";

import { generateQRDataUrl } from "@/lib/qr";
import { getTableUrl } from "@/lib/qr";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

type Table = { id: string; tableNumber: number };

export function PrintAllQR({ tables }: { tables: Table[] }) {
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const urls: Record<string, string> = {};
      for (const t of tables) {
        urls[t.id] = await generateQRDataUrl(getTableUrl(t.id));
      }
      setQrUrls(urls);
    }
    load();
  }, [tables]);

  function handlePrint() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>All Table QR Codes</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .card { text-align: center; border: 1px dashed #ccc; padding: 15px; border-radius: 8px; page-break-inside: avoid; }
        .card img { width: 150px; height: 150px; }
        .card p { margin: 5px 0; font-size: 14px; font-weight: bold; }
        .card .url { font-size: 9px; color: #999; word-break: break-all; }
        @media print { .no-print { display: none; } }
      </style></head><body>
      <h1 style="text-align:center;">Restaurant Table QR Codes</h1>
      <div class="grid">
    `);
    for (const t of tables) {
      const url = getTableUrl(t.id);
      const qr = qrUrls[t.id];
      win.document.write(`
        <div class="card">
          <p>Table ${t.tableNumber}</p>
          ${qr ? `<img src="${qr}" alt="QR for Table ${t.tableNumber}" />` : '<div style="width:150px;height:150px;background:#eee;margin:auto;"></div>'}
          <p class="url">${url}</p>
        </div>
      `);
    }
    win.document.write("</div><p class='no-print' style='text-align:center;margin-top:20px;'><button onclick='window.print()'>Print</button></p></body></html>");
    win.document.close();
  }

  return (
    <Button variant="outline" size="sm" className="text-xs h-8" onClick={handlePrint}>
      🖨️ Print All QR
    </Button>
  );
}
