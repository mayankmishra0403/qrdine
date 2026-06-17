"use client";

import { generateQRDataUrl } from "@/lib/qr";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function QRCodeDisplay({ url, showDownload = false }: { url: string; showDownload?: boolean }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    generateQRDataUrl(url).then(setDataUrl);
  }, [url]);

  if (!dataUrl) {
    return <div className="w-[120px] h-[120px] bg-muted animate-pulse rounded" />;
  }

  const qrUrl: string = dataUrl;

  function handleDownload() {
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `table-qr-${url.split("/").pop()}.png`;
    a.click();
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Image src={qrUrl} alt={`QR for ${url}`} width={120} height={120} className="rounded border" unoptimized />
      {showDownload && (
        <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={handleDownload}>
          ⬇ Download
        </Button>
      )}
    </div>
  );
}
