// /components/ops/Round2SelectionPanel.js

export default function Round2SelectionPanel({
  requestData,
  round2,
  workflow,
  disabled = false,
}) {
  const rows = round2?.rows || [];

  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Round 2 Selection
        </h2>
        <p className="text-sm text-gray-600">
          Future shortlist view for second-round dealer continuation.
        </p>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Request
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {requestData?.requestId || "—"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Current Round
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {workflow?.roundNumber || "R1"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Eligible Count
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {round2?.eligibleCount ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Selected Count
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {round2?.selectedCount ?? 0}
          </p>
        </div>
      </div>

      {!rows.length ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
          No Round 2 shortlist data yet. That is expected for the current Phase
          3 foundation.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Dealer
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Reason
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row, index) => (
                <tr key={row?.id || row?.recordId || index}>
                  <td className="px-4 py-3 text-gray-900">
                    {row?.dealerName || row?.dealer || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {row?.reason || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {row?.status || "Eligible"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        disabled={disabled}
        className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Run Round 2 Selection
      </button>
    </section>
  );
}
