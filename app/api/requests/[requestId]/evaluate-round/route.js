// /app/api/requests/[requestId]/evaluate-round/route.js

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import {
  evaluateCurrentRoundLifecycle,
  evaluateAndCloseCurrentRound,
} from "@/lib/airtable/workflowActions";

function normalizeRequestId(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
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

function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ ok: false, error: message }, { status: 401 });
}

function badRequest(message) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

function buildLifecycleResponse({
  requestId,
  status,
  snapshot,
  lifecycle,
  closeReason = null,
  action = "evaluate-round",
}) {
  return {
    ok: true,
    requestId,
    action,
    status,
    currentRound: snapshot?.currentRound || lifecycle?.currentRound || null,

    requestStatus: snapshot?.requestData?.workflow?.requestStatus || null,
    dealerSelectionStatus:
      snapshot?.requestData?.workflow?.dealerSelectionStatus || null,

    lifecycle: {
      closeReason: closeReason || lifecycle?.closeReason || null,

      timestamps: {
        now: lifecycle?.timestamps?.now || null,
        startedAt: lifecycle?.timestamps?.startedAt || null,
        deadlineAt: lifecycle?.timestamps?.deadlineAt || null,
        closedAt: lifecycle?.timestamps?.closedAt || null,
      },

      counts: {
        selectedInvitationCount:
          lifecycle?.counts?.selectedInvitationCount ?? null,
        quotedInvitationCount: lifecycle?.counts?.quotedInvitationCount ?? null,
        requestQuoteCount: lifecycle?.counts?.requestQuoteCount ?? null,
        compliantQuoteCount: lifecycle?.counts?.compliantQuoteCount ?? null,
      },

      flags: {
        isRoundStarted: lifecycle?.flags?.isRoundStarted === true,
        isRoundLive: lifecycle?.flags?.isRoundLive === true,
        isRoundClosedPersisted:
          lifecycle?.flags?.isRoundClosedPersisted === true,
        deadlineExpired: lifecycle?.flags?.deadlineExpired === true,
        earlyCloseReached: lifecycle?.flags?.earlyCloseReached === true,
        shouldCloseRoundNow: lifecycle?.flags?.shouldCloseRoundNow === true,
        hasAnyValidQuote: lifecycle?.flags?.hasAnyValidQuote === true,
        shouldEnableBuyerReview:
          lifecycle?.flags?.shouldEnableBuyerReview === true,
      },
    },

    request: {
      reviewReady: snapshot?.requestData?.workflow?.reviewReady === true,
      round1ClosedAt: snapshot?.requestData?.workflow?.round1ClosedAt || null,
      requestClosedAt: snapshot?.requestData?.workflow?.requestClosedAt || null,
      rfqRound1SentAt:
        snapshot?.requestData?.workflow?.sendStatus?.r1SentAt || null,
      rfqRound2SentAt:
        snapshot?.requestData?.workflow?.sendStatus?.r2SentAt || null,
    },

    gates: snapshot?.gates || {},
  };
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

  const dryRun = body?.dryRun === true;

  try {
    if (dryRun) {
      const snapshot = await evaluateCurrentRoundLifecycle(requestId);
      const lifecycle = snapshot.lifecycle;

      revalidatePath(`/ops/requests/${requestId}`);

      return NextResponse.json(
        buildLifecycleResponse({
          requestId,
          status: "evaluated",
          snapshot,
          lifecycle,
        }),
      );
    }

    const result = await evaluateAndCloseCurrentRound(requestId);

    const snapshot = result?.snapshot;
    const lifecycle = result?.lifecycle;

    revalidatePath(`/ops/requests/${requestId}`);

    if (result?.status === "not-eligible") {
      return NextResponse.json(
        buildLifecycleResponse({
          requestId,
          status: "not-eligible",
          snapshot,
          lifecycle,
          action: "evaluate-round",
        }),
      );
    }

    if (result?.status === "still-open") {
      return NextResponse.json(
        buildLifecycleResponse({
          requestId,
          status: "still-open",
          snapshot,
          lifecycle,
          action: "evaluate-round",
        }),
      );
    }

    if (result?.status === "closed") {
      return NextResponse.json(
        buildLifecycleResponse({
          requestId,
          status: "closed",
          snapshot,
          lifecycle,
          closeReason: result?.closeReason || null,
          action: "evaluate-round",
        }),
      );
    }

    return NextResponse.json(
      buildLifecycleResponse({
        requestId,
        status: result?.status || "evaluated",
        snapshot,
        lifecycle,
        closeReason: result?.closeReason || null,
        action: "evaluate-round",
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        requestId,
        action: "evaluate-round",
        error: error?.message || "Failed to evaluate round lifecycle",
      },
      { status: 500 },
    );
  }
}
