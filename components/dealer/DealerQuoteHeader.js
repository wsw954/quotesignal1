// components/dealer/DealerQuoteHeader.js

function InfoNote({ children }) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
      {children}
    </div>
  );
}

function SummaryTile({ label, value }) {
  return (
    <div className="rounded-lg bg-gray-50 px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-1 text-sm text-gray-900">{value || "—"}</div>
    </div>
  );
}

export default function DealerQuoteHeader({
  requestId,
  dealerName,
  roundNumber,
  purchaseType,
  dealerResponseStatus,
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Request ID" value={requestId} />
        <SummaryTile label="Dealer" value={dealerName} />
        <SummaryTile label="Round" value={roundNumber} />
        <SummaryTile label="Purchase Type" value={purchaseType} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <SummaryTile label="Response Status" value={dealerResponseStatus} />
      </div>

      <div className="mt-5">
        <InfoNote>
          Purchase Type is locked to the buyer request. Dealers should submit an
          offer that matches the requested purchase structure while still being
          free to offer a different vehicle configuration if needed.
        </InfoNote>
      </div>
    </div>
  );
}
