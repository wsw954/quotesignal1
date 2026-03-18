// /components/ops/DealerSelectionPanel.js

function BucketCard({ title, count, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}

function DealerList({ dealers, emptyText }) {
  if (!dealers?.length) {
    return <p className="text-sm text-gray-500">{emptyText}</p>;
  }

  return (
    <div className="space-y-2">
      {dealers.map((dealer, index) => {
        const name =
          dealer?.dealerName ||
          dealer?.name ||
          dealer?.dealer ||
          dealer?.storeName ||
          `Dealer ${index + 1}`;

        const location = [dealer?.city, dealer?.state]
          .filter(Boolean)
          .join(", ");
        const region = dealer?.region || "";
        const note = [location, region].filter(Boolean).join(" • ");

        return (
          <div
            key={dealer?.id || dealer?.recordId || `${name}-${index}`}
            className="rounded-lg border border-gray-200 bg-gray-50 p-3"
          >
            <p className="text-sm font-medium text-gray-900">{name}</p>
            {note ? <p className="mt-1 text-xs text-gray-600">{note}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

export default function DealerSelectionPanel({
  requestData,
  dealerSelection,
  candidates = [],
  selected = [],
  excluded = [],
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Dealer Selection
        </h2>
        <p className="text-sm text-gray-600">
          Phase 3 foundation for candidate, selected, and excluded dealer
          buckets.
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Request: {requestData?.requestId || "—"}
        </p>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Candidate Count
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {dealerSelection?.candidateCount ?? candidates.length ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Selected Count
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {dealerSelection?.selectedCount ?? selected.length ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Excluded Count
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {dealerSelection?.excludedCount ?? excluded.length ?? 0}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BucketCard title="Candidates" count={candidates.length}>
          <DealerList
            dealers={candidates}
            emptyText="No candidate dealers loaded yet."
          />
        </BucketCard>

        <BucketCard title="Selected" count={selected.length}>
          <DealerList dealers={selected} emptyText="No selected dealers yet." />
        </BucketCard>

        <BucketCard title="Excluded" count={excluded.length}>
          <DealerList dealers={excluded} emptyText="No excluded dealers yet." />
        </BucketCard>
      </div>
    </section>
  );
}
