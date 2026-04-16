// /app/api/review/buyer/[token]/route.js

import { NextResponse } from "next/server";
import { getBuyerReviewDataByToken } from "@/lib/airtable/reviewData";
import { buildComparisonDataset } from "@/lib/review/buildComparisonDataset";
import { buildWarnings } from "@/lib/review/warnings";
import { buildBuyerViewModel } from "@/lib/review/buyerViewModel";

function getErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown buyer review error";
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

  return 500;
}

export async function GET(_request, context) {
  try {
    const { token } = await context.params;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        {
          ok: false,
          error: "Buyer review token is required",
        },
        { status: 400 },
      );
    }

    const reviewBundle = await getBuyerReviewDataByToken(token);

    const dataset = buildComparisonDataset(reviewBundle);
    console.log("REVIEW DATA TEST", {
      hasRequest: !!dataset?.request,
      quoteCount: dataset?.quotes?.ranked?.length,
    });

    const warnings = buildWarnings(dataset);
    const payload = buildBuyerViewModel(dataset, warnings);

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
