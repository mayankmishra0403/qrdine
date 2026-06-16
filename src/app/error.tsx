"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex-1 flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4 max-w-md mx-auto px-4">
        <h1 className="text-4xl font-bold">500</h1>
        <p className="text-xl text-muted-foreground">Something went wrong</p>
        <p className="text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred"}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center rounded-lg bg-foreground text-background px-6 py-2 text-sm font-medium hover:opacity-90"
        >
          Try Again
        </button>
      </div>
    </main>
  );
}
