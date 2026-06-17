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

let tunnelUrl: string | null = null;

export function setTunnelUrl(url: string) {
  tunnelUrl = url;
}

export function getTableUrl(tableId: string): string {
  const base =
    tunnelUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.AUTH_URL ||
    "http://localhost:3000";
  return `${base}/table/${tableId}`;
}
