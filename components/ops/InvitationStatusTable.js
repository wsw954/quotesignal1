// /components/ops/InvitationStatusTable.js

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value ?? 0}</p>
    </div>
  );
}

export default function InvitationStatusTable({
  requestData,
  invitationSummary,
  invitations = [],
}) {
  const summary = invitationSummary || {};

  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Invitation Status
        </h2>
        <p className="text-sm text-gray-600">
          RFQ invitation tracking for {requestData?.requestId || "—"}.
        </p>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-5">
        <SummaryCard label="Total" value={summary.total ?? 0} />
        <SummaryCard label="Ready" value={summary.ready ?? 0} />
        <SummaryCard label="Sent" value={summary.sent ?? 0} />
        <SummaryCard label="Quoted" value={summary.quoted ?? 0} />
        <SummaryCard label="Pending" value={summary.pending ?? 0} />
      </div>

      {!invitations.length ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
          No invitation rows loaded yet. Phase 3 can still proceed with summary
          placeholders.
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
                  Round
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Sent At
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Quoted?
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invitations.map((row, index) => (
                <tr key={row?.id || row?.recordId || index}>
                  <td className="px-4 py-3 text-gray-900">
                    {row?.dealerName || row?.dealer || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {row?.roundNumber || row?.round || "R1"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {row?.status || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {row?.sentAt || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {row?.quoted ? "Yes" : "No"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
