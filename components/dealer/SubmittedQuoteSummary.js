// components/dealer/SubmittedQuoteSummary.js

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);

  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return `${datePart} at ${timePart}`;
}

function formatNumber(value) {
  if (value == null || value === "") return "—";

  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);

  return new Intl.NumberFormat("en-US").format(num);
}

function formatCurrency(value) {
  if (value == null || value === "") return "—";

  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatPercent(value) {
  if (value == null || value === "") return "—";

  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);

  return `${num}%`;
}

function DetailRow({ label, value }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[220px_1fr] sm:gap-4">
      <div className="text-sm font-medium text-gray-700">{label}</div>
      <div className="text-sm text-gray-900">{value || "—"}</div>
    </div>
  );
}

function SummaryCard({ title, children }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <div className="mt-4 divide-y divide-gray-100">{children}</div>
    </section>
  );
}

export default function SubmittedQuoteSummary({
  existingQuote,
  purchaseType,
  roundNumber,
}) {
  if (!existingQuote) return null;

  const offeredVehicle = existingQuote.offeredVehicle || {};
  const terms = existingQuote.terms || {};

  return (
    <div className="space-y-6">
      <SummaryCard title="Submitted Quote Status">
        <DetailRow label="Quote ID" value={existingQuote.quoteId} />
        <DetailRow
          label="Round"
          value={roundNumber || existingQuote.roundNumber}
        />
        <DetailRow label="Purchase Type" value={purchaseType} />
        <DetailRow
          label="Submitted At"
          value={formatDateTime(existingQuote.receivedTime)}
        />
        <DetailRow
          label="Last Updated"
          value={formatDateTime(existingQuote.lastUpdatedTime)}
        />
      </SummaryCard>

      <SummaryCard title="Offered Vehicle">
        <DetailRow label="Year" value={offeredVehicle.year} />
        <DetailRow label="Make" value={offeredVehicle.make} />
        <DetailRow label="Model" value={offeredVehicle.model} />
        <DetailRow label="Trim" value={offeredVehicle.trim} />
        <DetailRow
          label="Exterior Color"
          value={offeredVehicle.exteriorColor}
        />
        <DetailRow label="Accessories" value={offeredVehicle.accessories} />
        <DetailRow
          label="Trim Notes / Packages"
          value={offeredVehicle.trimNotesPackages}
        />
      </SummaryCard>

      <SummaryCard title="Quote Terms">
        {purchaseType === "Lease" ? (
          <>
            <DetailRow
              label="Lease Term (months)"
              value={formatNumber(terms.leaseTermMonths)}
            />
            <DetailRow
              label="Lease Monthly"
              value={formatCurrency(terms.leaseMonthly)}
            />
            <DetailRow
              label="Lease DAS"
              value={formatCurrency(terms.leaseDas)}
            />
            <DetailRow
              label="Lease Miles / Year"
              value={formatNumber(terms.leaseMilesPerYear)}
            />
          </>
        ) : purchaseType === "Finance" ? (
          <>
            <DetailRow
              label="OTD Total"
              value={formatCurrency(terms.otdTotal)}
            />
            <DetailRow label="APR %" value={formatPercent(terms.aprPercent)} />
            <DetailRow
              label="Finance Term (months)"
              value={formatNumber(terms.financeTermMonths)}
            />
            <DetailRow
              label="Down Payment Assumed"
              value={formatCurrency(terms.downPaymentAssumed)}
            />
            <DetailRow
              label="Monthly Payment (Finance)"
              value={formatCurrency(terms.monthlyPaymentFinance)}
            />
          </>
        ) : (
          <DetailRow label="OTD Total" value={formatCurrency(terms.otdTotal)} />
        )}
      </SummaryCard>

      <SummaryCard title="Additional Details">
        <DetailRow
          label="Dealer Delivery Timeline"
          value={terms.dealerDeliveryTimeline}
        />
        <DetailRow label="Quote Notes" value={terms.quoteNotes} />
      </SummaryCard>
    </div>
  );
}
