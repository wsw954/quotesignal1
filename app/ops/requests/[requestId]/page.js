// /app/ops/requests/[requestId]/page.js

import { notFound } from "next/navigation";

import { getRequestData } from "@/lib/airtable/requestData";
import { getDealerSelectionPreview } from "@/lib/airtable/dealerData";
import { getInvitationData } from "@/lib/airtable/invitationData";
import { getWorkflowSnapshot } from "@/lib/airtable/workflowActions"; //Phase 3 final Test

import RequestWorkflowHeader from "@/components/ops/RequestWorkflowHeader";
import DealerSelectionPanel from "@/components/ops/DealerSelectionPanel";
import DealerMatchTable from "@/components/ops/DealerMatchTable";
import InvitationStatusTable from "@/components/ops/InvitationStatusTable";
import ManualOverridePanel from "@/components/ops/ManualOverridePanel";
import SendRfqPanel from "@/components/ops/SendRfqPanel";
import Round2SelectionPanel from "@/components/ops/Round2SelectionPanel";

function buildPhase3PlaceholderData(requestData) {
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

  const placeholderData = buildPhase3PlaceholderData(requestData);
  const dealerSelection = await getDealerSelectionPreview(requestData);
  const invitations = await getInvitationData(requestData);
  const workflowSnapshot = await getWorkflowSnapshot(requestData);

  const pageData = {
    request: requestData,
    dealerSelection,
    invitations,
    round2: placeholderData.round2,
  };

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

        <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-blue-900">
              Workflow Snapshot Smoke Test
            </h2>
            <p className="text-sm text-blue-800">
              Temporary read-only debug panel for workflowActions.js
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DetailRow
              label="Snapshot Request ID"
              value={workflowSnapshot.requestData?.requestId || "—"}
            />
            <DetailRow
              label="Current Round"
              value={workflowSnapshot.currentRound || "—"}
            />
            <DetailRow
              label="Candidate Count"
              value={String(workflowSnapshot.counts?.candidateCount ?? 0)}
            />
            <DetailRow
              label="Invitation Count"
              value={String(workflowSnapshot.counts?.invitationCount ?? 0)}
            />
            <DetailRow
              label="Ready Invitations"
              value={String(workflowSnapshot.counts?.readyInvitationCount ?? 0)}
            />
            <DetailRow
              label="Sent Invitations"
              value={String(workflowSnapshot.counts?.sentInvitationCount ?? 0)}
            />
            <DetailRow
              label="Quoted Invitations"
              value={String(
                workflowSnapshot.counts?.quotedInvitationCount ?? 0,
              )}
            />
            <DetailRow
              label="Pending Dealer Review"
              value={String(
                workflowSnapshot.counts?.pendingDealerReviewCount ?? 0,
              )}
            />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <DetailRow
              label="Can Mark Needs Review"
              value={workflowSnapshot.gates?.canMarkNeedsReview ? "Yes" : "No"}
            />
            <DetailRow
              label="Can Mark Ready For Invitations"
              value={
                workflowSnapshot.gates?.canMarkReadyForInvitations
                  ? "Yes"
                  : "No"
              }
            />
            <DetailRow
              label="Can Mark No Eligible Dealers"
              value={
                workflowSnapshot.gates?.canMarkNoEligibleDealers ? "Yes" : "No"
              }
            />
            <DetailRow
              label="Can Generate Invitations"
              value={
                workflowSnapshot.gates?.canGenerateInvitations ? "Yes" : "No"
              }
            />
            <DetailRow
              label="Can Send Round 1"
              value={workflowSnapshot.gates?.canSendRound1 ? "Yes" : "No"}
            />
            <DetailRow
              label="Can Send Round 2"
              value={workflowSnapshot.gates?.canSendRound2 ? "Yes" : "No"}
            />
            <DetailRow
              label="Can Mark Buyer Review Ready"
              value={
                workflowSnapshot.gates?.canMarkBuyerReviewReady ? "Yes" : "No"
              }
            />
            <DetailRow
              label="Can Release Dealer Review"
              value={
                workflowSnapshot.gates?.canReleaseDealerReview ? "Yes" : "No"
              }
            />
            <DetailRow
              label="Can Close Request"
              value={workflowSnapshot.gates?.canCloseRequest ? "Yes" : "No"}
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

        <DealerMatchTable
          requestData={requestData}
          dealers={pageData.dealerSelection.candidates}
          selectedDealers={pageData.dealerSelection.selected}
          excludedDealers={pageData.dealerSelection.excluded}
          mode="phase3-live"
        />

        <InvitationStatusTable
          requestData={requestData}
          invitationSummary={pageData.invitations}
          invitations={pageData.invitations.rows}
        />

        <ManualOverridePanel
          requestData={requestData}
          dealerSelection={pageData.dealerSelection}
          disabled
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
