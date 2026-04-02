// /app/api/requests/[requestId]/finalize-round1-send/route.js

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import {
  getWorkflowSnapshot,
  stampRound1Sent,
  RFQ_SEND_STATUS,
  INVITATION_SELECTION_STATUS,
} from "@/lib/airtable/workflowActions";

function normalizeRequestId(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ ok: false, error: message }, { status: 401 });
}

function badRequest(message) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

function normalizeSecret(value) {
  return String(value || "").trim();
}

function getAuthDebug(request) {
  const expected = normalizeSecret(process.env.WORKFLOW_INTERNAL_SECRET);
  const received = normalizeSecret(request.headers.get("x-workflow-secret"));

  return {
    hasExpected: Boolean(expected),
    hasReceived: Boolean(received),
    expectedLength: expected.length,
    receivedLength: received.length,
    matches: received === expected,
  };
}

function isAuthorized(request) {
  const expected = normalizeSecret(process.env.WORKFLOW_INTERNAL_SECRET);
  const received = normalizeSecret(request.headers.get("x-workflow-secret"));
  return Boolean(expected) && received === expected;
}

function getSelectedRound1Rows(rows = []) {
  return rows.filter(
    (row) =>
      row?.roundNumber === "R1" &&
      row?.selectionStatus === INVITATION_SELECTION_STATUS.SELECTED,
  );
}

function areAllRound1SelectedRowsSent(rows = []) {
  if (!rows.length) return false;

  return rows.every((row) => row?.rfqSendStatus === RFQ_SEND_STATUS.SENT);
}

export async function POST(request, { params }) {
  const auth = getAuthDebug(request);

  if (!auth.matches) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized", auth },
      { status: 401 },
    );
  }

  if (!isAuthorized(request)) {
    return unauthorized();
  }

  const { requestId: rawRequestId } = await params;
  const requestId = normalizeRequestId(rawRequestId);

  if (!requestId) {
    return badRequest("Missing Request ID");
  }

  let body = {};
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const roundNumber = String(body?.roundNumber || "R1")
    .trim()
    .toUpperCase();

  if (roundNumber !== "R1") {
    return badRequest("This route only finalizes Round 1 sends");
  }

  try {
    const snapshot = await getWorkflowSnapshot(requestId);
    const selectedRound1Rows = getSelectedRound1Rows(
      snapshot?.invitations?.rows || [],
    );

    if (!selectedRound1Rows.length) {
      return NextResponse.json({
        ok: true,
        requestId,
        action: "finalize-round1-send",
        status: "noop",
        reason: "No selected Round 1 invitation rows found",
      });
    }

    const allSent = areAllRound1SelectedRowsSent(selectedRound1Rows);

    if (!allSent) {
      return NextResponse.json({
        ok: true,
        requestId,
        action: "finalize-round1-send",
        status: "waiting",
        selectedCount: selectedRound1Rows.length,
        sentCount: selectedRound1Rows.filter(
          (row) => row?.rfqSendStatus === RFQ_SEND_STATUS.SENT,
        ).length,
        reason: "Not all selected Round 1 rows have been sent yet",
      });
    }

    if (snapshot?.requestData?.workflow?.sendStatus?.r1SentAt) {
      return NextResponse.json({
        ok: true,
        requestId,
        action: "finalize-round1-send",
        status: "already-complete",
        message: "Round 1 parent request state was already stamped",
      });
    }

    const updated = await stampRound1Sent(requestId);

    revalidatePath(`/ops/requests/${requestId}`);

    return NextResponse.json({
      ok: true,
      requestId,
      action: "finalize-round1-send",
      status: "completed",
      message: "Round 1 parent request state stamped",
      dealerSelectionStatus:
        updated?.requestData?.workflow?.dealerSelectionStatus || null,
      rfqRound1SentAt:
        updated?.requestData?.workflow?.sendStatus?.r1SentAt || null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        requestId,
        action: "finalize-round1-send",
        error: error?.message || "Failed to finalize Round 1 send",
      },
      { status: 500 },
    );
  }
}
