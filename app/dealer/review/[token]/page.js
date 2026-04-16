// /app/dealer/review/[token]/page.js

import { notFound } from "next/navigation";

async function getDealerReviewPayload(token) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000";

  const res = await fetch(
    `${baseUrl}/api/review/dealer/${encodeURIComponent(token)}`,
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
        `Dealer review request failed with status ${res.status}`,
      status: res.status,
    };
  }

  return {
    ok: true,
    data: payload?.data || null,
  };
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
  if (!value && value !== 0) return null;

  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-slate-900">{value}</dd>
    </div>
  );
}

function OwnQuoteSection({ ownQuote }) {
  const purchaseType = ownQuote?.commercialTerms?.purchaseType || "";
  const isFinance = purchaseType === "Finance";
  const isLease = purchaseType === "Lease";
  const isCash = purchaseType === "Cash";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Your Quote
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {ownQuote?.scoring?.scoreLabel || "Quote Summary"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {ownQuote?.scoring?.scoreDeltaLabel || ""}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Compliance
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {ownQuote?.compliance?.status || "-"}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <LabelValue
          label="Vehicle"
          value={[
            ownQuote?.offeredVehicle?.year,
            ownQuote?.offeredVehicle?.make,
            ownQuote?.offeredVehicle?.model,
            ownQuote?.offeredVehicle?.trim,
          ]
            .filter(Boolean)
            .join(" ")}
        />
        <LabelValue
          label="Exterior Color"
          value={ownQuote?.offeredVehicle?.exteriorColor}
        />
        <LabelValue
          label="Delivery"
          value={ownQuote?.delivery?.dealerDeliveryTimeline}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isCash ? (
          <LabelValue
            label="OTD Total"
            value={formatCurrency(ownQuote?.commercialTerms?.otdTotal)}
          />
        ) : null}

        {isFinance ? (
          <>
            <LabelValue
              label="OTD Total"
              value={formatCurrency(ownQuote?.commercialTerms?.otdTotal)}
            />
            <LabelValue
              label="APR"
              value={formatPercent(ownQuote?.commercialTerms?.aprPercent)}
            />
            <LabelValue
              label="Finance Term"
              value={formatMonths(ownQuote?.commercialTerms?.financeTermMonths)}
            />
            <LabelValue
              label="Down Payment"
              value={formatCurrency(
                ownQuote?.commercialTerms?.downPaymentAssumed,
              )}
            />
            <LabelValue
              label="Monthly Payment"
              value={formatCurrency(
                ownQuote?.commercialTerms?.monthlyPaymentFinance,
              )}
            />
            <LabelValue
              label="Finance All-In"
              value={formatCurrency(
                ownQuote?.commercialTerms?.financeAllInCost,
              )}
            />
          </>
        ) : null}

        {isLease ? (
          <>
            <LabelValue
              label="Lease Term"
              value={formatMonths(ownQuote?.commercialTerms?.leaseTermMonths)}
            />
            <LabelValue
              label="Lease Monthly"
              value={formatCurrency(ownQuote?.commercialTerms?.leaseMonthly)}
            />
            <LabelValue
              label="Due at Signing"
              value={formatCurrency(ownQuote?.commercialTerms?.leaseDas)}
            />
            <LabelValue
              label="Miles / Year"
              value={formatNumber(ownQuote?.commercialTerms?.leaseMilesPerYear)}
            />
            <LabelValue
              label="Lease All-In"
              value={formatCurrency(ownQuote?.commercialTerms?.leaseAllInCost)}
            />
          </>
        ) : null}
      </div>

      {(ownQuote?.offeredVehicle?.accessories ||
        ownQuote?.offeredVehicle?.trimNotesPackages) && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <LabelValue
            label="Accessories"
            value={ownQuote?.offeredVehicle?.accessories}
          />
          <LabelValue
            label="Trim Notes / Packages"
            value={ownQuote?.offeredVehicle?.trimNotesPackages}
          />
        </div>
      )}

      {ownQuote?.notes?.quoteNotes ? (
        <div className="mt-6 rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Quote Notes
          </p>
          <p className="mt-1 text-sm text-slate-800">
            {ownQuote.notes.quoteNotes}
          </p>
        </div>
      ) : null}
    </section>
  );
}

function CompetitorSnapshotCard({ item, index }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Competitor Snapshot {index + 1}
      </p>

      <div className="mt-3 space-y-3">
        <LabelValue label="Position Band" value={item?.positionBand} />
        <LabelValue label="Score Band" value={item?.scoreBandLabel} />
        <LabelValue label="Compliance" value={item?.complianceStatus} />
        <LabelValue label="Delivery Band" value={item?.deliveryTimelineBand} />
      </div>
    </article>
  );
}

export default async function DealerReviewPage({ params }) {
  const { token } = await params;

  if (!token || typeof token !== "string") {
    notFound();
  }

  const result = await getDealerReviewPayload(token);

  if (!result.ok) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-xl font-semibold text-red-900">
            Dealer Review Unavailable
          </h1>
          <p className="mt-2 text-sm text-red-800">
            {result.error || "Unable to load dealer review data."}
          </p>
        </div>
      </main>
    );
  }

  const data = result.data || {};
  const request = data.request || {};
  const access = data.access || {};
  const summary = data.summary || {};
  const ownQuote = data.ownQuote || {};
  const marketContext = data.marketContext || {};
  const competitorSnapshot = Array.isArray(data.competitorSnapshot)
    ? data.competitorSnapshot
    : [];
  const warnings = Array.isArray(data.warnings) ? data.warnings : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Dealer Review
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Post-Close Quote Review
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          This page shows your submitted quote in detail along with anonymized
          market context after review release.
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
              Final Rank
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {summary.dealerFinalRank ?? "-"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Competitive Band
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {summary.dealerCompetitiveBand || "-"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Review Access
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {access.dealerReviewReleased ? "Released" : "Unavailable"}
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
          <LabelValue label="Request Status" value={request?.requestStatus} />
          <LabelValue label="Loss Reason" value={summary?.quoteLossReason} />
          <LabelValue
            label="Total Quotes Considered"
            value={summary?.totalQuotesConsidered}
          />
        </div>
      </section>

      {warnings.length ? (
        <section className="mt-6 space-y-3">
          {warnings.map((warning) => (
            <WarningBox
              key={`${warning.code}-${warning.audience || "dealer"}`}
              warning={warning}
            />
          ))}
        </section>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <OwnQuoteSection ownQuote={ownQuote} />

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Market Context
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <LabelValue
                label="Winning Score"
                value={marketContext?.winnerSnapshot?.scoreLabel}
              />
              <LabelValue
                label="Winning Compliance"
                value={marketContext?.winnerSnapshot?.complianceStatus}
              />
              <LabelValue
                label="Winning Delivery"
                value={marketContext?.winnerSnapshot?.deliveryTimeline}
              />
              <LabelValue
                label="Lowest Score"
                value={marketContext?.distribution?.lowestScoreLabel}
              />
              <LabelValue
                label="Median Score"
                value={marketContext?.distribution?.medianScoreLabel}
              />
              <LabelValue
                label="Highest Score"
                value={marketContext?.distribution?.highestScoreLabel}
              />
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Result Snapshot
            </h2>

            <div className="mt-5 space-y-3">
              <LabelValue label="Final Rank" value={summary?.dealerFinalRank} />
              <LabelValue
                label="Competitive Band"
                value={summary?.dealerCompetitiveBand}
              />
              <LabelValue
                label="Was Winner"
                value={summary?.dealerWasWinner ? "Yes" : "No"}
              />
              <LabelValue
                label="Loss Reason"
                value={summary?.quoteLossReason}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">
              Competitor Snapshot
            </h2>

            {competitorSnapshot.length ? (
              competitorSnapshot.map((item, index) => (
                <CompetitorSnapshotCard
                  key={`${item.positionBand}-${item.scoreBandLabel}-${index}`}
                  item={item}
                  index={index}
                />
              ))
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-600">
                  No anonymized competitor snapshot is available.
                </p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
