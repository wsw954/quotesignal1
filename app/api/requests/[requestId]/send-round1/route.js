// /app/api/requests/[requestId]/send-round1/route.js

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { createBase } from "@/lib/airtable/client";
import {
  getWorkflowSnapshot,
  markRound1SendReady,
} from "@/lib/airtable/workflowActions";
import { buildRound1RfqPayload } from "@/lib/workflow/rfqPayloadBuilder";

const base = createBase();
const REQUEST_DEALER_TABLE = "RequestDealer";

function normalizeRequestId(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function wantsJsonResponse(request) {
  const accept = request.headers.get("accept") || "";
  return accept.includes("application/json");
}

function buildOpsRedirect(request, requestId, values = {}) {
  const url = new URL(`/ops/requests/${requestId}`, request.url);

  for (const [key, value] of Object.entries(values)) {
    if (value == null || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  return url;
}

function summarizeInvalidRows(rows = []) {
  return rows
    .slice(0, 3)
    .map((row) => {
      const name = row?.dealerName || row?.dealerId || "Unknown dealer";
      const reason = (row?.validationErrors || []).join(", ") || "Invalid row";
      return `${name}: ${reason}`;
    })
    .join(" | ");
}

async function backfillTemplateTypes(templateBackfills = []) {
  const updates = templateBackfills
    .filter((row) => row?.id && row?.templateType)
    .map((row) => ({
      id: row.id,
      fields: {
        "RFQ Template Type": row.templateType,
      },
    }));

  if (!updates.length) {
    return 0;
  }

  await base.safeBatchUpdate(REQUEST_DEALER_TABLE, updates);
  return updates.length;
}

export async function GET(request, { params }) {
  const { requestId: rawRequestId } = await params;
  const requestId = normalizeRequestId(rawRequestId);

  if (!requestId) {
    return NextResponse.json({ error: "Missing Request ID" }, { status: 400 });
  }

  try {
    const payload = await buildRound1RfqPayload(requestId, {
      baseUrl: new URL(request.url).origin,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to build Round 1 payload preview" },
      { status: 400 },
    );
  }
}

export async function POST(request, { params }) {
  const { requestId: rawRequestId } = await params;
  const requestId = normalizeRequestId(rawRequestId);

  if (!requestId) {
    if (wantsJsonResponse(request)) {
      return NextResponse.json(
        { error: "Missing Request ID" },
        { status: 400 },
      );
    }

    return NextResponse.redirect(
      buildOpsRedirect(request, "UNKNOWN", {
        phase6Action: "send-round1-ready",
        phase6Status: "error",
        phase6Message: "Missing Request ID",
      }),
      { status: 303 },
    );
  }

  try {
    const snapshot = await getWorkflowSnapshot(requestId);

    if (!snapshot?.gates?.canSendRound1) {
      throw new Error("Round 1 send is not currently allowed for this Request");
    }

    const payload = await buildRound1RfqPayload(requestId, {
      baseUrl: new URL(request.url).origin,
      invitations: snapshot.invitations,
      roundNumber: "R1",
    });

    if ((payload?.selectedInvitationCount ?? 0) < 1) {
      throw new Error("No selected Round 1 invitation rows were found");
    }

    if ((payload?.invalidCount ?? 0) > 0) {
      throw new Error(
        `Cannot mark Round 1 send-ready until every selected dealer has a valid email and quote token. ${summarizeInvalidRows(
          payload.invalidRows,
        )}`,
      );
    }

    const templateBackfillCount = await backfillTemplateTypes(
      payload.templateBackfills,
    );

    await markRound1SendReady(requestId);

    revalidatePath(`/ops/requests/${requestId}`);

    const result = {
      ok: true,
      requestId,
      action: "send-round1-ready",
      readyCount: payload.payloadCount,
      introCount: payload.introCount,
      standardCount: payload.standardCount,
      templateBackfillCount,
      message: "Round 1 invitations marked Ready To Send for Zap handoff",
    };

    if (wantsJsonResponse(request)) {
      return NextResponse.json(result);
    }

    return NextResponse.redirect(
      buildOpsRedirect(request, requestId, {
        phase6Action: result.action,
        phase6Status: "ok",
        phase6Message: result.message,
        readyCount: result.readyCount,
        introCount: result.introCount,
        standardCount: result.standardCount,
        templateBackfillCount: result.templateBackfillCount,
      }),
      { status: 303 },
    );
  } catch (error) {
    const message =
      error?.message || "Failed to mark Round 1 invitations send-ready";

    if (wantsJsonResponse(request)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.redirect(
      buildOpsRedirect(request, requestId, {
        phase6Action: "send-round1-ready",
        phase6Status: "error",
        phase6Message: message,
      }),
      { status: 303 },
    );
  }
}
