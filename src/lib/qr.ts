import QRCode from "qrcode";

export async function generateQRDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: {
      dark: "#171717",
      light: "#ffffff",
    },
  });
}

export function getTableUrl(tableId: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.AUTH_URL ||
    "http://localhost:3000";
  return `${base}/table/${tableId}`;
}
