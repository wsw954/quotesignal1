// /components/ops/DealerMatchTable.js

function getDealerKey(dealer, fallback = "") {
  return (
    dealer?.recordId ||
    dealer?.dealerId ||
    dealer?.id ||
    dealer?.airtableRecordId ||
    fallback
  );
}

function getDealerName(dealer, index) {
  return (
    dealer?.dealerName ||
    dealer?.name ||
    dealer?.dealer ||
    dealer?.storeName ||
    `Dealer ${index + 1}`
  );
}

function getDealerLocation(dealer) {
  return [dealer?.city, dealer?.state].filter(Boolean).join(", ") || "—";
}

function getDealerRegion(dealer) {
  return dealer?.region || "—";
}

function getDealerTier(dealer) {
  return dealer?.priorityTier ?? "—";
}

function getDealerRankScore(dealer) {
  return (
    dealer?.candidateRank ??
    dealer?.rank ??
    dealer?.score ??
    dealer?.matchScore ??
    dealer?.rankScore ??
    "—"
  );
}

function findMatchingDealer(targetDealer, dealerList = []) {
  const targetKey = getDealerKey(targetDealer);

  return dealerList.find((dealer) => {
    const candidateKey = getDealerKey(dealer);

    if (targetKey && candidateKey && targetKey === candidateKey) return true;

    return (
      dealer?.dealerId &&
      targetDealer?.dealerId &&
      dealer.dealerId === targetDealer.dealerId
    );
  });
}

function resolveDealerStatus(dealer, selectedDealers, excludedDealers) {
  const selectedMatch = findMatchingDealer(dealer, selectedDealers);
  if (selectedMatch) {
    return {
      label: "Selected",
      className:
        "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200",
      reason:
        selectedMatch?.selectionReason ||
        dealer?.selectionReason ||
        "Selected by current dealer selection rules.",
    };
  }

  const excludedMatch = findMatchingDealer(dealer, excludedDealers);
  if (excludedMatch) {
    return {
      label: "Excluded",
      className: "bg-red-100 text-red-800 ring-1 ring-inset ring-red-200",
      reason:
        excludedMatch?.exclusionReason ||
        dealer?.exclusionReason ||
        "Excluded by current dealer selection rules.",
    };
  }

  return {
    label: dealer?.statusLabel || "Candidate",
    className: "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200",
    reason:
      dealer?.selectionReason ||
      dealer?.exclusionReason ||
      "Eligible candidate under current dealer selection rules.",
  };
}

export default function DealerMatchTable({
  requestData,
  dealers = [],
  selectedDealers = [],
  excludedDealers = [],
  mode = "phase4-live",
}) {
  const selectedCount = selectedDealers.length;
  const excludedCount = excludedDealers.length;
  const candidateCount = dealers.length;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 space-y-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Dealer Match Table
          </h2>
          <p className="text-sm text-gray-600">
            Candidate dealer review surface for {requestData?.requestId || "—"}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700">
            Mode: {mode}
          </span>
          <span className="rounded-full bg-blue-100 px-2.5 py-1 font-medium text-blue-800">
            Candidates: {candidateCount}
          </span>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-800">
            Selected: {selectedCount}
          </span>
          <span className="rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-800">
            Excluded: {excludedCount}
          </span>
        </div>
      </div>

      {!dealers.length ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
          No candidate dealers matched the current selection rules for this
          Request.
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
                  Priority Tier
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Rank / Score
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Reason
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 bg-white">
              {dealers.map((dealer, index) => {
                const name = getDealerName(dealer, index);
                const location = getDealerLocation(dealer);
                const region = getDealerRegion(dealer);
                const tier = getDealerTier(dealer);
                const rankScore = getDealerRankScore(dealer);
                const status = resolveDealerStatus(
                  dealer,
                  selectedDealers,
                  excludedDealers,
                );

                return (
                  <tr key={getDealerKey(dealer, `${name}-${index}`)}>
                    <td className="px-4 py-3 align-top text-gray-900">
                      {name}
                    </td>
                    <td className="px-4 py-3 align-top text-gray-700">
                      {location}
                    </td>
                    <td className="px-4 py-3 align-top text-gray-700">
                      {region}
                    </td>
                    <td className="px-4 py-3 align-top text-gray-700">
                      {tier}
                    </td>
                    <td className="px-4 py-3 align-top text-gray-700">
                      {rankScore}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-gray-700">
                      <div className="max-w-md whitespace-normal">
                        {status.reason || "—"}
                      </div>
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
