// app/dealer/quote/[token]/page.js

import { getDealerQuoteInvitationByToken } from "@/lib/airtable/dealerQuoteSubmit";
import DealerQuoteForm from "@/components/dealer/DealerQuoteForm";
import DealerQuoteHeader from "@/components/dealer/DealerQuoteHeader";
import SubmittedQuoteSummary from "@/components/dealer/SubmittedQuoteSummary";

export const dynamic = "force-dynamic";

function SectionCard({ title, children }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[220px_1fr] sm:gap-4">
      <div className="text-sm font-medium text-gray-700">{label}</div>
      <div className="text-sm text-gray-900">{value || "—"}</div>
    </div>
  );
}

function ErrorState({ title = "Dealer Quote Link Unavailable", message }) {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          <p className="mt-3 text-sm text-red-700">
            {message || "This quote link is not available."}
          </p>
        </div>
      </div>
    </main>
  );
}

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

export default async function DealerQuotePage({ params }) {
  const resolvedParams = await params;
  const token = decodeURIComponent(resolvedParams?.token || "");

  if (!token) {
    return (
      <ErrorState message="This quote link is missing a valid dealer token." />
    );
  }

  let payload;

  try {
    payload = await getDealerQuoteInvitationByToken(token);
  } catch (error) {
    return (
      <ErrorState
        message={error?.message || "This quote link is invalid or expired."}
      />
    );
  }

  const { invitation, requestContext, requestedVehicle, existingQuote } =
    payload;

  const pageTitle = invitation?.requestId
    ? `Dealer Quote — ${invitation.requestId}`
    : "Dealer Quote";

  const purchaseType = requestContext?.purchaseType || "—";
  const roundNumber = invitation?.roundNumber || "R1";
  const hasSubmittedQuote = Boolean(existingQuote);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">{pageTitle}</h1>
        </div>

        <div className="mb-6">
          <DealerQuoteHeader
            requestId={invitation?.requestId}
            dealerName={invitation?.dealerName}
            roundNumber={roundNumber}
            purchaseType={purchaseType}
            dealerResponseStatus={invitation?.dealerResponseStatus}
            hasSubmittedQuote={hasSubmittedQuote}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <SectionCard title="Requested Vehicle">
              <div className="divide-y divide-gray-100">
                <DetailRow
                  label="Vehicle Spec"
                  value={requestedVehicle?.vehicleSpec}
                />
                <DetailRow label="Year" value={requestedVehicle?.year} />
                <DetailRow label="Make" value={requestedVehicle?.make} />
                <DetailRow label="Model" value={requestedVehicle?.model} />
                <DetailRow label="Trim" value={requestedVehicle?.trim} />
                <DetailRow
                  label="Exterior Color Requested"
                  value={requestedVehicle?.exteriorColorRequested}
                />
                <DetailRow
                  label="Trim Notes / Packages"
                  value={requestedVehicle?.trimNotesPackages}
                />
                <DetailRow
                  label="Accessories"
                  value={requestedVehicle?.accessories}
                />
              </div>
            </SectionCard>

            <SectionCard title="Request Context">
              <div className="divide-y divide-gray-100">
                <DetailRow label="Request ID" value={invitation?.requestId} />
                <DetailRow
                  label="Buyer Region"
                  value={requestContext?.buyerRegion}
                />
                <DetailRow
                  label="Target Close Timeline"
                  value={requestContext?.targetCloseTimeline}
                />
                {purchaseType === "Finance" || purchaseType === "Lease" ? (
                  <>
                    <DetailRow
                      label="Credit Score Range"
                      value={requestContext?.creditScoreRange}
                    />
                    <DetailRow
                      label="Credit Score Line"
                      value={requestContext?.creditScoreLineText}
                    />
                  </>
                ) : null}
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard title="Dealer Quote Submission">
              {hasSubmittedQuote ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    A quote has already been submitted for this invitation.
                    Under the current v1 workflow, dealers may submit only one
                    quote per request per round. Your previously submitted quote
                    is shown below.
                  </div>

                  <SubmittedQuoteSummary
                    existingQuote={existingQuote}
                    purchaseType={purchaseType}
                    roundNumber={roundNumber}
                  />
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-700">
                    Submit one quote for this request. The purchase type is
                    fixed by the buyer request. The offered vehicle may differ
                    from the requested vehicle, but the purchase structure
                    should match.
                  </p>

                  <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-700">
                    <DealerQuoteForm
                      token={token}
                      invitation={invitation}
                      requestContext={requestContext}
                      requestedVehicle={requestedVehicle}
                    />
                  </div>
                </>
              )}
            </SectionCard>

            <SectionCard title="Dealer Contact Context">
              <div className="divide-y divide-gray-100">
                <DetailRow label="Dealer Name" value={invitation?.dealerName} />
                <DetailRow
                  label="Main Contact"
                  value={invitation?.dealerMainContact}
                />
                <DetailRow
                  label="Main Email"
                  value={invitation?.dealerMainEmail}
                />
                <DetailRow
                  label="RFQ Sent At"
                  value={formatDateTime(invitation?.rfqSentAt)}
                />
                <DetailRow
                  label="Quote Submission Deadline"
                  value={formatDateTime(
                    requestContext?.round1ResponseDeadlineAt,
                  )}
                />
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </main>
  );
}
