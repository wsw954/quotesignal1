// /components/ops/RequestWorkflowHeader.js

function MetricCard({ label, value, tone = "default" }) {
  const toneClasses = {
    default: "border-gray-200 bg-white text-gray-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    green: "border-green-200 bg-green-50 text-green-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
  };

  return (
    <div
      className={`rounded-xl border p-4 ${toneClasses[tone] || toneClasses.default}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value ?? "—"}</p>
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <div className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
      <span className="font-medium text-gray-900">{label}:</span> {value || "—"}
    </div>
  );
}

export default function RequestWorkflowHeader({
  requestData,
  buyer,
  vehicle,
  workflow,
  metrics,
  flags,
}) {
  const requestId = requestData?.requestId || "—";
  const buyerName = buyer?.fullName || "—";
  const vehicleSpec = vehicle?.vehicleSpec || "—";
  const requestStatus = workflow?.requestStatus || "—";
  const dealerSelectionStatus = workflow?.dealerSelectionStatus || "—";
  const roundNumber = workflow?.roundNumber || "R1";
  const sendStatus = workflow?.sendStatus?.label || "Not Sent";

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Request Workflow
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-gray-900">
              {requestId}
            </h2>
            <p className="mt-2 text-sm text-gray-600">{vehicleSpec}</p>
            <p className="mt-1 text-sm text-gray-600">Buyer: {buyerName}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <InfoPill label="Request Status" value={requestStatus} />
            <InfoPill label="Selection Status" value={dealerSelectionStatus} />
            <InfoPill label="Round" value={roundNumber} />
            <InfoPill label="Send Status" value={sendStatus} />
            <InfoPill
              label="Review Ready"
              value={flags?.isReviewReady ? "Yes" : "No"}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Quotes Received"
            value={metrics?.quotesReceived ?? 0}
            tone="blue"
          />
          <MetricCard
            label="Compliant Quotes"
            value={metrics?.compliantQuotes ?? 0}
            tone="green"
          />
          <MetricCard
            label="Selected Dealers"
            value={metrics?.selectedDealerCount ?? 0}
          />
          <MetricCard
            label="Quoted Dealers"
            value={metrics?.quotedDealerCount ?? 0}
          />
          <MetricCard
            label="Target Dealers"
            value={metrics?.targetDealerCount ?? 0}
            tone="amber"
          />
        </div>
      </div>
    </section>
  );
}
