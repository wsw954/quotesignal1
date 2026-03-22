// /app/api/requests/[requestId]/dealer-selection/route.js

import { NextResponse } from "next/server";

import { getDealerSelectionPreview } from "@/lib/workflow/applyDealerSelectionRules";
import {
  dealerSelectionRouteBodySchema,
  normalizeDealerSelectionOverrides,
} from "@/lib/validation/dealerSelectionSchema";

function splitParamValues(values) {
  return values
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function readMultiParam(searchParams, key) {
  const all = searchParams.getAll(key);

  if (all.length) {
    return splitParamValues(all);
  }

  const single = searchParams.get(key);
  if (!single) return [];

  return splitParamValues([single]);
}

function buildOverridesFromSearchParams(searchParams) {
  return {
    roundNumber: searchParams.get("roundNumber") || undefined,
    targetDealerCount: searchParams.get("targetDealerCount") || undefined,
    manualIncludeDealerIds: readMultiParam(searchParams, "manualInclude"),
    manualExcludeDealerIds: readMultiParam(searchParams, "manualExclude"),
    selectedDealerIds: readMultiParam(searchParams, "selected"),
    excludedDealerIds: readMultiParam(searchParams, "excluded"),
  };
}

function toErrorResponse(error) {
  const message = error?.message || "Unknown error";

  if (message.toLowerCase().includes("request not found")) {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  if (
    error?.name === "ZodError" ||
    message.toLowerCase().includes("cannot be both included and excluded")
  ) {
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET(request, { params }) {
  try {
    const { requestId } = await params;

    const overrides = normalizeDealerSelectionOverrides(
      buildOverridesFromSearchParams(request.nextUrl.searchParams),
    );

    const selection = await getDealerSelectionPreview(requestId, overrides);

    return NextResponse.json({
      ok: true,
      requestId: selection.requestId,
      roundNumber: selection.roundNumber,
      targetDealerCount: selection.targetDealerCount,
      candidateCount: selection.candidateCount,
      selectedCount: selection.selectedCount,
      excludedCount: selection.excludedCount,
      ineligibleCount: selection.ineligibleCount,
      candidates: selection.candidates,
      selected: selection.selected,
      excluded: selection.excluded,
      summary: selection.summary,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request, { params }) {
  try {
    const { requestId } = await params;

    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsed = dealerSelectionRouteBodySchema.parse(body);
    const selection = await getDealerSelectionPreview(
      requestId,
      parsed.overrides,
    );

    return NextResponse.json({
      ok: true,
      requestId: selection.requestId,
      roundNumber: selection.roundNumber,
      targetDealerCount: selection.targetDealerCount,
      candidateCount: selection.candidateCount,
      selectedCount: selection.selectedCount,
      excludedCount: selection.excludedCount,
      ineligibleCount: selection.ineligibleCount,
      candidates: selection.candidates,
      selected: selection.selected,
      excluded: selection.excluded,
      summary: selection.summary,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
