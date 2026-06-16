import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4 max-w-md mx-auto px-4">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-xl text-muted-foreground">Page not found</p>
        <p className="text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-foreground text-background px-6 py-2 text-sm font-medium hover:opacity-90"
        >
          Go Home
        </Link>
      </div>
    </main>
  );
}
