import Link from "next/link";

export default function TableNotFound() {
  return (
    <main className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-xl text-muted-foreground">Table not found</p>
      <p className="text-sm text-muted-foreground">
        This QR code may be invalid or the table has been removed.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90"
      >
        Go Home
      </Link>
    </main>
  );
}
