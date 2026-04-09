// app/api/dealer-quote/route.js

import { NextResponse } from "next/server";
import { safeParseDealerQuote } from "@/lib/validation/dealerQuoteSchema";
import {
  getDealerQuoteInvitationByToken,
  submitDealerQuote,
} from "@/lib/airtable/dealerQuoteSubmit";

function toFieldErrors(zodError) {
  const fieldErrors = {};

  for (const issue of zodError.issues || []) {
    const key =
      Array.isArray(issue.path) && issue.path.length > 0
        ? String(issue.path[0])
        : "form";

    if (!fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }

  return fieldErrors;
}

function isValidationStyleError(message) {
  const value = String(message || "").toLowerCase();

  return (
    value.includes("required") ||
    value.includes("invalid") ||
    value.includes("must be") ||
    value.includes("should be empty") ||
    value.includes("not eligible") ||
    value.includes("already been submitted") ||
    value.includes("not found") ||
    value.includes("expired")
  );
}

export async function POST(request) {
  try {
    const body = await request.json();

    // First-pass parse: validate basic client payload shape.
    // This now includes dealerDeliveryTimeline when present.
    const initialParsed = safeParseDealerQuote(body);

    // If the only likely blocker is missing/untrusted purchaseType,
    // we'll still try to resolve trusted invitation context below.
    // Otherwise, return field errors immediately.
    if (!initialParsed.success) {
      const fieldErrors = toFieldErrors(initialParsed.error);
      const onlyPurchaseTypeIssue =
        Object.keys(fieldErrors).length === 1 && fieldErrors.purchaseType;

      if (!onlyPurchaseTypeIssue) {
        return NextResponse.json(
          {
            ok: false,
            error: "Please fix the highlighted fields and try again.",
            fieldErrors,
          },
          { status: 400 },
        );
      }
    }

    const token = String(body?.token || "").trim();

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: "Dealer Quote Token is required.",
          fieldErrors: {
            token: "Dealer Quote Token is required.",
          },
        },
        { status: 400 },
      );
    }

    // Resolve trusted invitation context from RequestDealer
    const invitationPayload = await getDealerQuoteInvitationByToken(token);
    const trustedPurchaseType =
      invitationPayload?.requestContext?.purchaseType || "";

    if (!trustedPurchaseType) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unable to determine Purchase Type from invitation context.",
          fieldErrors: {
            form: "Purchase Type context is missing for this invitation.",
          },
        },
        { status: 400 },
      );
    }

    // Re-validate with trusted purchaseType injected server-side
    const payload = {
      ...body,
      token,
      purchaseType: trustedPurchaseType,
    };

    const parsed = safeParseDealerQuote(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Please fix the highlighted fields and try again.",
          fieldErrors: toFieldErrors(parsed.error),
        },
        { status: 400 },
      );
    }

    const result = await submitDealerQuote(parsed.data);

    return NextResponse.json(
      {
        ok: true,
        data: result,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error?.message || "Internal server error.";

    if (isValidationStyleError(message)) {
      return NextResponse.json(
        {
          ok: false,
          error: message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Dealer quote route is available.",
  });
}
