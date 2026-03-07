//app/api/intake/route.js
import { NextResponse } from "next/server";
import { buyerIntakeSchema } from "@/lib/validation/buyerIntakeSchema";
import { createBuyerRequest } from "@/lib/airtable/intakeSubmit";
import { requiresCreditScoreRange } from "@/lib/constants/creditScoreRanges";

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = buyerIntakeSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        { ok: false, error: firstIssue?.message || "Invalid request." },
        { status: 400 },
      );
    }

    const data = parsed.data;

    const payload = {
      ...data,
      creditScoreRange: requiresCreditScoreRange(data.purchaseType)
        ? data.creditScoreRange
        : "",
    };

    const created = await createBuyerRequest(payload);

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error." },
      { status: 500 },
    );
  }
}
