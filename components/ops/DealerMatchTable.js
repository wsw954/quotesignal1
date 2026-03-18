// /components/ops/DealerMatchTable.js

function getDealerName(dealer, index) {
  return (
    dealer?.dealerName ||
    dealer?.name ||
    dealer?.dealer ||
    dealer?.storeName ||
    `Dealer ${index + 1}`
  );
}

export default function DealerMatchTable({
  requestData,
  dealers = [],
  selectedDealers = [],
  excludedDealers = [],
  mode = "phase3-placeholder",
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Dealer Match Table
        </h2>
        <p className="text-sm text-gray-600">
          Candidate dealer review surface for {requestData?.requestId || "—"}.
        </p>
        <p className="mt-1 text-xs text-gray-500">Mode: {mode}</p>
      </div>

      {!dealers.length ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
          No candidate dealers loaded yet. This is normal for Phase 3
          placeholder mode.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Dealer
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Location
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Region
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Rank / Score
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {dealers.map((dealer, index) => {
                const name = getDealerName(dealer, index);
                const location =
                  [dealer?.city, dealer?.state].filter(Boolean).join(", ") ||
                  "—";
                const region = dealer?.region || "—";
                const rankScore =
                  dealer?.rank ?? dealer?.score ?? dealer?.matchScore ?? "—";

                const isSelected = selectedDealers.some(
                  (d) =>
                    d?.id === dealer?.id ||
                    d?.recordId === dealer?.recordId ||
                    d?.dealerName === dealer?.dealerName,
                );

                const isExcluded = excludedDealers.some(
                  (d) =>
                    d?.id === dealer?.id ||
                    d?.recordId === dealer?.recordId ||
                    d?.dealerName === dealer?.dealerName,
                );

                let status = "Candidate";
                if (isSelected) status = "Selected";
                if (isExcluded) status = "Excluded";

                return (
                  <tr
                    key={dealer?.id || dealer?.recordId || `${name}-${index}`}
                  >
                    <td className="px-4 py-3 text-gray-900">{name}</td>
                    <td className="px-4 py-3 text-gray-700">{location}</td>
                    <td className="px-4 py-3 text-gray-700">{region}</td>
                    <td className="px-4 py-3 text-gray-700">{rankScore}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
