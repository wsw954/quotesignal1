//app/ops/requests/[requestId]/loading.js

export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6">
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="mt-3 h-8 w-64 rounded bg-gray-200" />
          <div className="mt-3 h-4 w-96 rounded bg-gray-200" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-gray-200 bg-gray-50 p-4"
            >
              <div className="h-3 w-24 rounded bg-gray-200" />
              <div className="mt-3 h-6 w-16 rounded bg-gray-200" />
            </div>
          ))}
        </div>

        <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5">
          <div className="h-5 w-48 rounded bg-gray-200" />
          <div className="mt-4 h-24 rounded bg-gray-100" />
        </div>
      </div>
    </main>
  );
}
