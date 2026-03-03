//app/api/intake/route.js
import { NextResponse } from "next/server";
import { buyerIntakeSchema } from "@/lib/validation/buyerIntakeSchema";
import { createBuyerRequest } from "@/lib/airtable/intakeSubmit";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    // Zod-style validation (recommended in your roadmap)
    const parsed = buyerIntakeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Validation failed.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const result = await createBuyerRequest(parsed.data);

    // Normalize a requestId no matter what your data-layer returns
    const requestId =
      result?.id ?? result?.recordId ?? result?.requestId ?? null;

    return NextResponse.json(
      { ok: true, data: { requestId, result } },
      { status: 200 },
    );
  } catch (err) {
    console.error("[POST /api/intake]", err);
    return NextResponse.json(
      { ok: false, error: "Failed to submit intake." },
      { status: 500 },
    );
  }
}
