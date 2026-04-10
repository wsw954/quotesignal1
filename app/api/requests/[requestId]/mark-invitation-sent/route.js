// /app/api/requests/[requestId]/mark-invitation-sent/route.js

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { markInvitationSentAndMaybeFinalize } from "@/lib/airtable/workflowActions";

function normalizeRequestId(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function normalizeSecret(value) {
  return String(value || "").trim();
}

function isAuthorized(request) {
  const expected = normalizeSecret(process.env.WORKFLOW_INTERNAL_SECRET);
  const received = normalizeSecret(request.headers.get("x-workflow-secret"));
  return Boolean(expected) && received === expected;
}

function badRequest(message) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

export async function POST(request, { params }) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
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

  const requestDealerRecordId = String(
    body?.requestDealerRecordId || body?.recordId || "",
  ).trim();

  const roundNumber = String(body?.roundNumber || "R1")
    .trim()
    .toUpperCase();

  if (!requestDealerRecordId) {
    return badRequest("requestDealerRecordId is required");
  }

  try {
    const result = await markInvitationSentAndMaybeFinalize(requestId, {
      requestDealerRecordId,
      roundNumber,
    });

    revalidatePath(`/ops/requests/${requestId}`);

    return NextResponse.json({
      ok: true,
      requestId,
      requestDealerRecordId,
      roundNumber,
      finalized: result.finalized,
      dealerSelectionStatus:
        result?.snapshot?.requestData?.workflow?.dealerSelectionStatus || null,
      rfqRound1SentAt:
        result?.snapshot?.requestData?.workflow?.sendStatus?.r1SentAt || null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        requestId,
        error: error?.message || "Failed to mark invitation sent",
      },
      { status: 500 },
    );
  }
}
