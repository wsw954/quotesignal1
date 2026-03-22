// /app/ops/requests/[requestId]/page.js

import { notFound } from "next/navigation";

import { getRequestData } from "@/lib/airtable/requestData";
import { getDealerSelectionPreview } from "@/lib/workflow/applyDealerSelectionRules";
import { getInvitationData } from "@/lib/airtable/invitationData";

import RequestWorkflowHeader from "@/components/ops/RequestWorkflowHeader";
import DealerSelectionPanel from "@/components/ops/DealerSelectionPanel";
import DealerMatchTable from "@/components/ops/DealerMatchTable";
import InvitationStatusTable from "@/components/ops/InvitationStatusTable";
import SendRfqPanel from "@/components/ops/SendRfqPanel";
import Round2SelectionPanel from "@/components/ops/Round2SelectionPanel";

function buildPendingSectionData(requestData) {
  return {
    invitations: {
      total: requestData?.links?.requestDealerRecordIds?.length || 0,
      ready: 0,
      sent: 0,
      quoted: requestData?.metrics?.quotedDealerCount || 0,
      pending: 0,
      rows: [],
    },

    round2: {
      eligibleCount: 0,
      selectedCount: 0,
      rows: [],
    },
  };
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-3">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </span>
      <span className="text-sm text-gray-900">{value || "—"}</span>
    </div>
  );
}

function ManualSelectionStatusNote({ requestData, dealerSelection }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Manual Selection Status
        </h2>
        <p className="text-sm text-gray-600">
          Phase 4 supports manual include and manual exclude logic in the
          backend selection engine, but operator controls are not exposed in the
          page yet.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Request
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {requestData?.requestId || "—"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Manual Include Count
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {dealerSelection?.manualIncludeDealerIds?.length ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Manual Exclude Count
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {dealerSelection?.manualExcludeDealerIds?.length ?? 0}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-900">
          The current operator page reflects backend selection outcomes only.
          Manual controls can be added later without changing the Phase 4
          selection engine.
        </p>
      </div>
    </section>
  );
}

function EmptyDealerMatchState({ requestId }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Dealer Match Table
        </h2>
        <p className="text-sm text-gray-600">
          Candidate dealer review surface for {requestId || "—"}.
        </p>
        <p className="mt-1 text-xs text-gray-500">Mode: phase4-live</p>
      </div>

      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
        No candidate dealers matched the current selection rules for this
        Request.
      </div>
    </section>
  );
}

export default async function OpsRequestWorkflowPage({ params }) {
  const { requestId: rawRequestId } = await params;

  const requestId = String(rawRequestId || "")
    .trim()
    .toUpperCase();

  if (!requestId) {
    notFound();
  }

  let requestData;

  try {
    requestData = await getRequestData(requestId);
  } catch (error) {
    if (error?.message?.toLowerCase().includes("request not found")) {
      notFound();
    }

    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h1 className="text-xl font-semibold text-red-900">
            Request workflow failed to load
          </h1>
          <p className="mt-2 text-sm text-red-800">
            The page could not load this Request right now.
          </p>
          <p className="mt-2 text-sm text-red-700">
            Request ID: <span className="font-medium">{requestId}</span>
          </p>
          <p className="mt-1 text-sm text-red-700">
            Error: {error?.message || "Unknown error"}
          </p>
        </div>
      </main>
    );
  }

  const pendingSectionData = buildPendingSectionData(requestData);
  const dealerSelection = await getDealerSelectionPreview(requestData);
  const invitations = await getInvitationData(requestData);

  const pageData = {
    request: requestData,
    dealerSelection,
    invitations,
    round2: pendingSectionData.round2,
  };

  const hasCandidateDealers =
    (pageData.dealerSelection?.candidates?.length ?? 0) > 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-8">
        <header className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Internal Ops
          </p>
          <h1 className="text-3xl font-semibold text-gray-900">
            Request Workflow
          </h1>
          <p className="text-sm text-gray-600">
            Operator control center for {requestData.requestId}
          </p>
        </header>

        <RequestWorkflowHeader
          requestData={requestData}
          request={requestData}
          buyer={requestData.buyer}
          vehicle={requestData.vehicle}
          workflow={requestData.workflow}
          metrics={requestData.metrics}
          flags={requestData.flags}
        />

        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Request Summary
            </h2>
            <p className="text-sm text-gray-600">
              Core operator context for this Request.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DetailRow label="Request ID" value={requestData.requestId} />
            <DetailRow
              label="Buyer"
              value={requestData.buyer.fullName || "—"}
            />
            <DetailRow
              label="Buyer Email"
              value={requestData.buyer.email || "—"}
            />
            <DetailRow
              label="Buyer Phone"
              value={requestData.buyer.phone || "—"}
            />
            <DetailRow
              label="Location"
              value={
                [
                  requestData.buyer.zip,
                  requestData.buyer.state,
                  requestData.buyer.region,
                ]
                  .filter(Boolean)
                  .join(" • ") || "—"
              }
            />
            <DetailRow
              label="Vehicle"
              value={requestData.vehicle.vehicleSpec || "—"}
            />
            <DetailRow
              label="Purchase Type"
              value={requestData.request.purchaseTypeRequested || "—"}
            />
            <DetailRow
              label="Credit Score Range"
              value={requestData.request.creditScoreRange || "—"}
            />
            <DetailRow
              label="Request Status"
              value={requestData.workflow.requestStatus || "—"}
            />
            <DetailRow
              label="Dealer Selection Status"
              value={requestData.workflow.dealerSelectionStatus || "—"}
            />
            <DetailRow
              label="Round Number"
              value={requestData.workflow.roundNumber || "R1"}
            />
            <DetailRow
              label="Send Status"
              value={requestData.workflow.sendStatus?.label || "Not Sent"}
            />
            <DetailRow
              label="Quotes Received"
              value={String(requestData.metrics.quotesReceived ?? 0)}
            />
            <DetailRow
              label="Compliant Quotes"
              value={String(requestData.metrics.compliantQuotes ?? 0)}
            />
            <DetailRow
              label="Selected Dealers"
              value={String(
                pageData.dealerSelection.selectedCount ??
                  requestData.metrics.selectedDealerCount ??
                  0,
              )}
            />
            <DetailRow
              label="Candidate Dealers"
              value={String(pageData.dealerSelection.candidateCount ?? 0)}
            />
          </div>
        </section>

        <DealerSelectionPanel
          requestData={requestData}
          dealerSelection={pageData.dealerSelection}
          candidates={pageData.dealerSelection.candidates}
          selected={pageData.dealerSelection.selected}
          excluded={pageData.dealerSelection.excluded}
        />

        {hasCandidateDealers ? (
          <DealerMatchTable
            requestData={requestData}
            dealers={pageData.dealerSelection.candidates}
            selectedDealers={pageData.dealerSelection.selected}
            excludedDealers={pageData.dealerSelection.excluded}
            mode="phase4-live"
          />
        ) : (
          <EmptyDealerMatchState requestId={requestData.requestId} />
        )}

        <InvitationStatusTable
          requestData={requestData}
          invitationSummary={pageData.invitations}
          invitations={pageData.invitations.rows}
        />

        <ManualSelectionStatusNote
          requestData={requestData}
          dealerSelection={pageData.dealerSelection}
        />

        <SendRfqPanel
          requestData={requestData}
          invitationSummary={pageData.invitations}
          workflow={requestData.workflow}
          disabled
        />

        <Round2SelectionPanel
          requestData={requestData}
          round2={pageData.round2}
          workflow={requestData.workflow}
          disabled
        />
      </div>
    </main>
  );
}
