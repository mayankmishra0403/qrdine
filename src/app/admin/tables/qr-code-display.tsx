"use client";

import { generateQRDataUrl } from "@/lib/qr";
import Image from "next/image";
import { useEffect, useState } from "react";

export function QRCodeDisplay({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    generateQRDataUrl(url).then(setDataUrl);
  }, [url]);

  if (!dataUrl) {
    return <div className="w-[150px] h-[150px] bg-muted animate-pulse rounded" />;
  }

  return (
    <a href={dataUrl} download="qr.png" className="inline-block">
      <Image
        src={dataUrl}
        alt={`QR for ${url}`}
        width={150}
        height={150}
        className="rounded border"
        unoptimized
      />
    </a>
  );
}
