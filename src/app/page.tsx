import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-6 max-w-lg mx-auto px-4">
        <h1 className="text-4xl font-bold tracking-tight">QRDine</h1>
        <p className="text-xl text-muted-foreground">
          Scan. Order. Serve. Grow.
        </p>
        <p className="text-gray-500">
          QR-based digital ordering platform for restaurants.
          Customers scan, order, and pay — all from their phone.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-lg bg-foreground text-background px-6 py-3 text-sm font-medium hover:opacity-90"
          >
            Restaurant Login
          </Link>
        </div>
      </div>
    </main>
  );
}
