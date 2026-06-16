export default function KitchenLoading() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((col) => (
          <div key={col} className="space-y-3">
            <div className="h-6 w-24 bg-muted rounded animate-pulse" />
            {[1, 2].map((card) => (
              <div
                key={card}
                className="rounded-lg border bg-white p-4 space-y-3 animate-pulse"
              >
                <div className="h-6 w-32 bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-8 w-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
