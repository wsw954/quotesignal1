// /app/api/review/dealer/[token]/route.js

import { NextResponse } from "next/server";
import { getDealerReviewDataByToken } from "@/lib/airtable/reviewData";
import { buildComparisonDataset } from "@/lib/review/buildComparisonDataset";
import { buildWarnings } from "@/lib/review/warnings";
import { buildDealerViewModel } from "@/lib/review/dealerViewModel";

function getErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown dealer review error";
}

function getStatusCodeFromMessage(message) {
  const text = String(message || "").toLowerCase();

  if (
    text.includes("required") ||
    text.includes("invalid") ||
    text.includes("expired")
  ) {
    return 400;
  }

  if (text.includes("not found") || text.includes("not linked")) {
    return 404;
  }

  if (text.includes("not released")) {
    return 403;
  }

  return 500;
}

export async function GET(_request, context) {
  try {
    const { token } = await context.params;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        {
          ok: false,
          error: "Dealer review token is required",
        },
        { status: 400 },
      );
    }

    const reviewBundle = await getDealerReviewDataByToken(token);

    if (reviewBundle?.access?.dealerReviewReleased !== true) {
      return NextResponse.json(
        {
          ok: false,
          error: "Dealer review has not been released yet",
        },
        { status: 403 },
      );
    }

    const dataset = buildComparisonDataset(reviewBundle);
    const warnings = buildWarnings(dataset);
    const payload = buildDealerViewModel(dataset, warnings, {
      mode: "post_close",
    });

    return NextResponse.json(
      {
        ok: true,
        data: payload,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = getErrorMessage(error);
    const status = getStatusCodeFromMessage(message);

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status },
    );
  }
}
