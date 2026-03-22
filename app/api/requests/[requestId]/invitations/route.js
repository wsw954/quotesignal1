// /app/api/requests/[requestId]/invitations/route.js

import { NextResponse } from "next/server";

import { getRequestData } from "@/lib/airtable/requestData";
import {
  getWorkflowSnapshot,
  markInvitationsCreated,
  DEALER_SELECTION_STATUS,
} from "@/lib/airtable/workflowActions";
import { getInvitationData } from "@/lib/airtable/invitationData";
import { createRequestDealerRecords } from "@/lib/workflow/createRequestDealerRecords";

function normalizeRequestId(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function errorResponse(message, status = 400, extra = {}) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      ...extra,
    },
    { status },
  );
}

async function readJsonBodySafe(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function resolveRequestIdFromParams(paramsPromiseOrObject) {
  const params = await paramsPromiseOrObject;
  return normalizeRequestId(params?.requestId);
}

function buildSnapshotPayload(snapshot) {
  return {
    requestId: snapshot?.requestData?.requestId || "",
    currentRound: snapshot?.currentRound || "R1",
    requestStatus: snapshot?.requestData?.workflow?.requestStatus || "",
    dealerSelectionStatus:
      snapshot?.requestData?.workflow?.dealerSelectionStatus || "",
    counts: snapshot?.counts || {},
    gates: snapshot?.gates || {},
    invitations: snapshot?.invitations || {
      total: 0,
      ready: 0,
      sent: 0,
      quoted: 0,
      pending: 0,
      rows: [],
    },
  };
}

export async function GET(_request, { params }) {
  const requestId = await resolveRequestIdFromParams(params);

  if (!requestId) {
    return errorResponse("Request ID is required", 400);
  }

  try {
    const [requestData, snapshot, invitations] = await Promise.all([
      getRequestData(requestId),
      getWorkflowSnapshot(requestId),
      getInvitationData(requestId),
    ]);

    return NextResponse.json({
      ok: true,
      requestId,
      request: {
        recordId: requestData.recordId,
        requestId: requestData.requestId,
        workflow: requestData.workflow,
        metrics: requestData.metrics,
        flags: requestData.flags,
      },
      snapshot: buildSnapshotPayload(snapshot),
      invitations,
    });
  } catch (error) {
    const message = error?.message || "Failed to load invitation state";

    if (message.toLowerCase().includes("request not found")) {
      return errorResponse(message, 404, { requestId });
    }

    return errorResponse(message, 500, { requestId });
  }
}

export async function POST(request, { params }) {
  const requestId = await resolveRequestIdFromParams(params);

  if (!requestId) {
    return errorResponse("Request ID is required", 400);
  }

  const body = await readJsonBodySafe(request);

  const action = String(body?.action || "generate")
    .trim()
    .toLowerCase();

  const roundNumber = body?.roundNumber;
  const quoteTokenDays = body?.quoteTokenDays;
  const reviewTokenDays = body?.reviewTokenDays;

  const refreshExistingTokens = body?.refreshExistingTokens === true;
  const backfillMissingTokens = body?.backfillMissingTokens !== false;
  const returnInvitationSummary = body?.returnInvitationSummary !== false;

  try {
    const beforeSnapshot = await getWorkflowSnapshot(requestId);

    if (beforeSnapshot?.requestData?.flags?.isClosed) {
      return errorResponse(
        "Cannot create or refresh invitations for a closed Request",
        409,
        {
          requestId,
          snapshot: buildSnapshotPayload(beforeSnapshot),
        },
      );
    }

    if (action === "generate" && !beforeSnapshot.gates.canGenerateInvitations) {
      return errorResponse(
        "This Request is not currently eligible to generate invitations",
        409,
        {
          requestId,
          snapshot: buildSnapshotPayload(beforeSnapshot),
        },
      );
    }

    if (
      action === "refresh" &&
      beforeSnapshot.invitations.total < 1 &&
      beforeSnapshot.dealerSelection.selectedCount < 1
    ) {
      return errorResponse(
        "Nothing to refresh yet because no invitations or selected dealers were found",
        409,
        {
          requestId,
          snapshot: buildSnapshotPayload(beforeSnapshot),
        },
      );
    }

    const result = await createRequestDealerRecords(requestId, {
      roundNumber,
      quoteTokenDays,
      reviewTokenDays,
      refreshExistingTokens,
      backfillMissingTokens,
      returnInvitationSummary,
    });

    let snapshot;

    const shouldMarkInvitationsCreated =
      (result.createdCount > 0 || result.refreshedCount > 0) &&
      (beforeSnapshot.requestData.workflow.dealerSelectionStatus !==
        DEALER_SELECTION_STATUS.INVITATIONS_CREATED ||
        beforeSnapshot.invitations.total < 1);

    if (shouldMarkInvitationsCreated) {
      snapshot = await markInvitationsCreated(requestId);
    } else {
      snapshot = await getWorkflowSnapshot(requestId);
    }

    const responseStatus =
      action === "generate" && beforeSnapshot.invitations.total === 0
        ? 201
        : 200;

    return NextResponse.json(
      {
        ok: true,
        action,
        requestId,
        message:
          action === "refresh"
            ? "Invitation records refreshed"
            : "Invitation records generated",
        result,
        snapshot: buildSnapshotPayload(snapshot),
        invitations: snapshot.invitations,
      },
      { status: responseStatus },
    );
  } catch (error) {
    const message = error?.message || "Failed to create invitation records";

    if (message.toLowerCase().includes("request not found")) {
      return errorResponse(message, 404, { requestId });
    }

    return errorResponse(message, 500, { requestId });
  }
}
