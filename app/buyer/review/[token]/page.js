// /app/buyer/review/[token]/page.js

import { notFound } from "next/navigation";

async function getBuyerReviewPayload(token) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000";

  const res = await fetch(
    `${baseUrl}/api/review/buyer/${encodeURIComponent(token)}`,
    {
      cache: "no-store",
    },
  );

  let payload = null;

  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok) {
    return {
      ok: false,
      error:
        payload?.error ||
        `Buyer review request failed with status ${res.status}`,
      status: res.status,
    };
  }

  return {
    ok: true,
    data: payload?.data || null,
  };
}

function WarningBox({ warning }) {
  const level = String(warning?.level || "info").toLowerCase();

  const levelClasses = {
    error: "border-red-300 bg-red-50 text-red-800",
    warning: "border-amber-300 bg-amber-50 text-amber-800",
    info: "border-slate-300 bg-slate-50 text-slate-800",
  };

  const classes = levelClasses[level] || levelClasses.info;

  return (
    <div className={`rounded-lg border p-3 ${classes}`}>
      <p className="text-sm font-medium">{warning?.message || "Warning"}</p>
    </div>
  );
}

function LabelValue({ label, value }) {
  if (!value) return null;

  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-slate-900">{value}</dd>
    </div>
  );
}

function QuoteCard({ quote }) {
  const purchaseType = quote?.commercialTerms?.purchaseType || "";
  const isFinance = purchaseType === "Finance";
  const isLease = purchaseType === "Lease";
  const isCash = purchaseType === "Cash";

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {quote?.displayLabel || "Quote"}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            {quote?.scoring?.scoreLabel || "Quote"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {quote?.scoring?.scoreDeltaLabel || ""}
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm font-medium text-slate-700">
            Rank: {quote?.rank ?? "-"}
          </p>
          {quote?.isBuyerChoice ? (
            <p className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">
              Selected Quote
            </p>
          ) : null}
          {!quote?.isBuyerChoice && quote?.isWinningCandidate ? (
            <p className="mt-1 inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
              Top Ranked
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <LabelValue
          label="Primary Price"
          value={quote?.scoring?.primaryPriceLabel}
        />
        <LabelValue
          label="Purchase Type"
          value={quote?.commercialTerms?.purchaseType}
        />
        <LabelValue label="Compliance" value={quote?.compliance?.status} />
        <LabelValue
          label="Vehicle"
          value={[
            quote?.offeredVehicle?.year,
            quote?.offeredVehicle?.make,
            quote?.offeredVehicle?.model,
            quote?.offeredVehicle?.trim,
          ]
            .filter(Boolean)
            .join(" ")}
        />
        <LabelValue
          label="Exterior Color"
          value={quote?.offeredVehicle?.exteriorColor}
        />
        <LabelValue
          label="Delivery"
          value={quote?.delivery?.dealerDeliveryTimeline}
        />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isCash ? (
          <LabelValue
            label="OTD Total"
            value={formatCurrency(quote?.commercialTerms?.otdTotal)}
          />
        ) : null}

        {isFinance ? (
          <>
            <LabelValue
              label="OTD Total"
              value={formatCurrency(quote?.commercialTerms?.otdTotal)}
            />
            <LabelValue
              label="APR"
              value={formatPercent(quote?.commercialTerms?.aprPercent)}
            />
            <LabelValue
              label="Finance Term"
              value={formatMonths(quote?.commercialTerms?.financeTermMonths)}
            />
            <LabelValue
              label="Down Payment"
              value={formatCurrency(quote?.commercialTerms?.downPaymentAssumed)}
            />
            <LabelValue
              label="Monthly Payment"
              value={formatCurrency(
                quote?.commercialTerms?.monthlyPaymentFinance,
              )}
            />
            <LabelValue
              label="Finance All-In"
              value={formatCurrency(quote?.commercialTerms?.financeAllInCost)}
            />
          </>
        ) : null}

        {isLease ? (
          <>
            <LabelValue
              label="Lease Term"
              value={formatMonths(quote?.commercialTerms?.leaseTermMonths)}
            />
            <LabelValue
              label="Lease Monthly"
              value={formatCurrency(quote?.commercialTerms?.leaseMonthly)}
            />
            <LabelValue
              label="Due at Signing"
              value={formatCurrency(quote?.commercialTerms?.leaseDas)}
            />
            <LabelValue
              label="Miles / Year"
              value={formatNumber(quote?.commercialTerms?.leaseMilesPerYear)}
            />
            <LabelValue
              label="Lease All-In"
              value={formatCurrency(quote?.commercialTerms?.leaseAllInCost)}
            />
          </>
        ) : null}
      </div>

      {quote?.offeredVehicle?.accessories ||
      quote?.offeredVehicle?.trimNotesPackages ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <LabelValue
            label="Accessories"
            value={quote?.offeredVehicle?.accessories}
          />
          <LabelValue
            label="Trim Notes / Packages"
            value={quote?.offeredVehicle?.trimNotesPackages}
          />
        </div>
      ) : null}

      {quote?.notes?.quoteNotes ? (
        <div className="mt-5 rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Quote Notes
          </p>
          <p className="mt-1 text-sm text-slate-800">
            {quote.notes.quoteNotes}
          </p>
        </div>
      ) : null}
    </article>
  );
}

function formatCurrency(value) {
  if (value == null || value === "") return "";

  const n = Number(value);
  if (!Number.isFinite(n)) return "";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPercent(value) {
  if (value == null || value === "") return "";

  const n = Number(value);
  if (!Number.isFinite(n)) return "";

  return `${n}%`;
}

function formatMonths(value) {
  if (value == null || value === "") return "";
  return `${value} months`;
}

function formatNumber(value) {
  if (value == null || value === "") return "";

  const n = Number(value);
  if (!Number.isFinite(n)) return "";

  return new Intl.NumberFormat("en-US").format(n);
}

export default async function BuyerReviewPage({ params }) {
  const { token } = await params;

  if (!token || typeof token !== "string") {
    notFound();
  }

  const result = await getBuyerReviewPayload(token);

  if (!result.ok) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-xl font-semibold text-red-900">
            Buyer Review Unavailable
          </h1>
          <p className="mt-2 text-sm text-red-800">
            {result.error || "Unable to load buyer review data."}
          </p>
        </div>
      </main>
    );
  }

  const data = result.data || {};
  const request = data.request || {};
  const reviewWindow = data.reviewWindow || {};
  const summary = data.summary || {};
  const warnings = Array.isArray(data.warnings) ? data.warnings : [];
  const quotes = Array.isArray(data.quotes) ? data.quotes : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Quote Review
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Compare Your Quotes
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Review the quote set for your requested vehicle and compare price,
          structure, timing, and vehicle details.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Request ID
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {request.requestId || "-"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Current Round
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {request.currentRound || "-"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Quotes Available
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {summary.rankedQuotes ?? 0}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Review Window
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {reviewWindow.isExpired ? "Expired" : "Active"}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <LabelValue label="Vehicle" value={request?.vehicle?.vehicleSpec} />
          <LabelValue
            label="Requested Color"
            value={request?.vehicle?.exteriorColorRequested}
          />
          <LabelValue label="Purchase Type" value={request?.purchaseType} />
          <LabelValue label="Status" value={request?.requestStatus} />
          <LabelValue
            label="Best Ranked Score"
            value={summary?.bestScoreLabel}
          />
          <LabelValue
            label="Review Expires"
            value={reviewWindow?.buyerReviewExpiresAt}
          />
        </div>
      </section>

      {warnings.length ? (
        <section className="mt-6 space-y-3">
          {warnings.map((warning) => (
            <WarningBox
              key={`${warning.code}-${warning.audience || "buyer"}`}
              warning={warning}
            />
          ))}
        </section>
      ) : null}

      <section className="mt-8">
        {quotes.length ? (
          <div className="space-y-5">
            {quotes.map((quote) => (
              <QuoteCard key={quote.quoteId || quote.rank} quote={quote} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              No Quotes Available
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              There are currently no ranked quotes available for this review.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
