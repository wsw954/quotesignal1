// /components/ops/ManualOverridePanel.js

export default function ManualOverridePanel({
  requestData,
  dealerSelection,
  disabled = false,
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Manual Override</h2>
        <p className="text-sm text-gray-600">
          Future operator controls for manually adjusting dealer selection.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Request
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {requestData?.requestId || "—"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Candidate Count
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {dealerSelection?.candidateCount ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Selected Count
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {dealerSelection?.selectedCount ?? 0}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
        <p className="text-sm text-gray-700">
          In a later phase, this panel can support actions like:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>force-add a dealer</li>
          <li>exclude a dealer</li>
          <li>override rank-based selection</li>
          <li>annotate operator reasoning</li>
        </ul>

        <button
          type="button"
          disabled={disabled}
          className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Manual Override Controls
        </button>
      </div>
    </section>
  );
}
