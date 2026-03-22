// /app/ops/requests/[requestId]/page.js

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import {
  DEALER_SELECTION_STATUS,
  getWorkflowSnapshot,
  markInvitationsCreated,
  markReadyForInvitations,
} from "@/lib/airtable/workflowActions";
import { createRequestDealerRecords } from "@/lib/workflow/createRequestDealerRecords";

import RequestWorkflowHeader from "@/components/ops/RequestWorkflowHeader";
import DealerSelectionPanel from "@/components/ops/DealerSelectionPanel";
import DealerMatchTable from "@/components/ops/DealerMatchTable";
import InvitationStatusTable from "@/components/ops/InvitationStatusTable";
import SendRfqPanel from "@/components/ops/SendRfqPanel";
import Round2SelectionPanel from "@/components/ops/Round2SelectionPanel";

function normalizeRequestId(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function readParam(value) {
  if (Array.isArray(value)) return value[0] || "";
  return String(value || "");
}

function buildPendingSectionData() {
  return {
    round2: {
      eligibleCount: 0,
      selectedCount: 0,
      rows: [],
    },
  };
}

function buildRedirectPath(requestId, values = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value == null || value === "") continue;
    params.set(key, String(value));
  }

  const query = params.toString();
  return query
    ? `/ops/requests/${requestId}?${query}`
    : `/ops/requests/${requestId}`;
}

async function markReadyForInvitationsAction(formData) {
  "use server";

  const requestId = normalizeRequestId(formData.get("requestId"));

  if (!requestId) {
    redirect(
      buildRedirectPath("UNKNOWN", {
        phase5Action: "ready",
        phase5Status: "error",
        phase5Message: "Missing Request ID",
      }),
    );
  }

  let destination;

  try {
    const snapshot = await markReadyForInvitations(requestId);

    revalidatePath(`/ops/requests/${requestId}`);

    destination = buildRedirectPath(requestId, {
      phase5Action: "ready",
      phase5Status: "ok",
      phase5Message: "Dealer selection marked Ready for Invitations",
      candidateCount: snapshot?.counts?.candidateCount ?? 0,
      selectedCount: snapshot?.counts?.selectedCandidateCount ?? 0,
    });
  } catch (error) {
    destination = buildRedirectPath(requestId, {
      phase5Action: "ready",
      phase5Status: "error",
      phase5Message: error?.message || "Failed to mark Ready for Invitations",
    });
  }

  redirect(destination);
}

async function generateInvitationsAction(formData) {
  "use server";

  const requestId = normalizeRequestId(formData.get("requestId"));

  if (!requestId) {
    redirect(
      buildRedirectPath("UNKNOWN", {
        phase5Action: "generate",
        phase5Status: "error",
        phase5Message: "Missing Request ID",
      }),
    );
  }

  let destination;

  try {
    const beforeSnapshot = await getWorkflowSnapshot(requestId);

    if (!beforeSnapshot?.gates?.canGenerateInvitations) {
      throw new Error(
        "Generate Invitations is not currently allowed for this Request",
      );
    }

    const result = await createRequestDealerRecords(requestId);

    if ((result?.createdCount ?? 0) > 0 || (result?.refreshedCount ?? 0) > 0) {
      await markInvitationsCreated(requestId);
    }

    revalidatePath(`/ops/requests/${requestId}`);

    destination = buildRedirectPath(requestId, {
      phase5Action: "generate",
      phase5Status: "ok",
      phase5Message: "Invitation records generated",
      createdCount: result?.createdCount ?? 0,
      refreshedCount: result?.refreshedCount ?? 0,
      existingCount: result?.existingCount ?? 0,
      skippedCount: result?.skippedCount ?? 0,
    });
  } catch (error) {
    destination = buildRedirectPath(requestId, {
      phase5Action: "generate",
      phase5Status: "error",
      phase5Message: error?.message || "Failed to generate invitations",
    });
  }

  redirect(destination);
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

function ActionResultBanner({ flash }) {
  if (!flash) return null;

  const isSuccess = flash.status === "ok";

  return (
    <section
      className={`rounded-2xl border p-5 shadow-sm ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50"
          : "border-red-200 bg-red-50"
      }`}
    >
      <div className="space-y-2">
        <div>
          <p
            className={`text-xs font-semibold uppercase tracking-wide ${
              isSuccess ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {flash.action === "ready"
              ? "Invitation Prep Result"
              : "Invitation Creation Result"}
          </p>

          <h2
            className={`mt-1 text-lg font-semibold ${
              isSuccess ? "text-emerald-950" : "text-red-950"
            }`}
          >
            {flash.message}
          </h2>
        </div>

        {flash.action === "generate" && isSuccess ? (
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-white/70 bg-white/70 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Created
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {flash.createdCount}
              </p>
            </div>

            <div className="rounded-xl border border-white/70 bg-white/70 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Refreshed
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {flash.refreshedCount}
              </p>
            </div>

            <div className="rounded-xl border border-white/70 bg-white/70 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Existing
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {flash.existingCount}
              </p>
            </div>

            <div className="rounded-xl border border-white/70 bg-white/70 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Skipped
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {flash.skippedCount}
              </p>
            </div>
          </div>
        ) : null}

        {flash.action === "ready" && isSuccess ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-white/70 bg-white/70 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Candidates
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {flash.candidateCount}
              </p>
            </div>

            <div className="rounded-xl border border-white/70 bg-white/70 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Selected
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {flash.selectedCount}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
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

function InvitationActionsPanel({ requestData, workflowSnapshot }) {
  const gates = workflowSnapshot?.gates || {};
  const counts = workflowSnapshot?.counts || {};
  const invitationSummary = workflowSnapshot?.invitations || {};
  const workflow = requestData?.workflow || {};

  const canMarkReady = Boolean(gates.canMarkReadyForInvitations);
  const canGenerate = Boolean(gates.canGenerateInvitations);
  const hasInvitations = (invitationSummary.total ?? 0) > 0;

  let helperText =
    "Phase 5 turns the selected dealer set into RequestDealer invitation records.";

  if (requestData?.flags?.isClosed) {
    helperText = "This Request is closed, so invitation actions are disabled.";
  } else if (hasInvitations) {
    helperText =
      "Invitation records already exist for this Request. The Generate step is intentionally locked to avoid duplicate first-pass creation.";
  } else if (
    workflow.dealerSelectionStatus ===
    DEALER_SELECTION_STATUS.READY_FOR_INVITATIONS
  ) {
    helperText =
      "This Request is already marked Ready for Invitations. You can now generate RequestDealer records.";
  } else if (canMarkReady) {
    helperText =
      "Mark the Request Ready for Invitations first, then generate the RequestDealer records.";
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Invitation Actions
        </h2>
        <p className="text-sm text-gray-600">{helperText}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Dealer Selection Status
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {workflow.dealerSelectionStatus || "—"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Candidate Dealers
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {counts.candidateCount ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Selected Dealers
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {counts.selectedCandidateCount ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Invitation Rows
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {invitationSummary.total ?? 0}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <form action={markReadyForInvitationsAction}>
          <input type="hidden" name="requestId" value={requestData.requestId} />
          <button
            type="submit"
            disabled={!canMarkReady}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark Ready for Invitations
          </button>
        </form>

        <form action={generateInvitationsAction}>
          <input type="hidden" name="requestId" value={requestData.requestId} />
          <button
            type="submit"
            disabled={!canGenerate}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Generate Invitations
          </button>
        </form>
      </div>
    </section>
  );
}

function buildFlashState(searchParams) {
  const action = readParam(searchParams?.phase5Action);
  const status = readParam(searchParams?.phase5Status);

  if (!action || !status) {
    return null;
  }

  return {
    action,
    status,
    message: readParam(searchParams?.phase5Message) || "Action completed",
    candidateCount: Number(readParam(searchParams?.candidateCount) || 0),
    selectedCount: Number(readParam(searchParams?.selectedCount) || 0),
    createdCount: Number(readParam(searchParams?.createdCount) || 0),
    refreshedCount: Number(readParam(searchParams?.refreshedCount) || 0),
    existingCount: Number(readParam(searchParams?.existingCount) || 0),
    skippedCount: Number(readParam(searchParams?.skippedCount) || 0),
  };
}

export default async function OpsRequestWorkflowPage({ params, searchParams }) {
  const { requestId: rawRequestId } = await params;
  const resolvedSearchParams = (await searchParams) || {};

  const requestId = normalizeRequestId(rawRequestId);

  if (!requestId) {
    notFound();
  }

  let workflowSnapshot;

  try {
    workflowSnapshot = await getWorkflowSnapshot(requestId);
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

  const requestData = workflowSnapshot.requestData;
  const dealerSelection = workflowSnapshot.dealerSelection;
  const invitations = workflowSnapshot.invitations;
  const pendingSectionData = buildPendingSectionData();
  const flash = buildFlashState(resolvedSearchParams);

  const pageData = {
    request: requestData,
    dealerSelection,
    invitations,
    round2: pendingSectionData.round2,
  };

  const hasCandidateDealers =
    (pageData.dealerSelection?.candidates?.length ?? 0) > 0;

  const invitationRowsForTable = (pageData.invitations?.rows || []).map(
    (row) => ({
      ...row,
      sentAt: row?.rfqSentAt || "",
      quoted: Boolean(row?.quoteSubmitted),
    }),
  );

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

        <ActionResultBanner flash={flash} />

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
              value={workflowSnapshot.currentRound || "R1"}
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

        <InvitationActionsPanel
          requestData={requestData}
          workflowSnapshot={workflowSnapshot}
        />

        <InvitationStatusTable
          requestData={requestData}
          invitationSummary={pageData.invitations}
          invitations={invitationRowsForTable}
        />

        <ManualSelectionStatusNote
          requestData={requestData}
          dealerSelection={pageData.dealerSelection}
        />

        <SendRfqPanel
          requestData={requestData}
          invitationSummary={pageData.invitations}
          workflow={requestData.workflow}
          disabled={pageData.invitations.total < 1}
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
