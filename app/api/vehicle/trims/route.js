//app/api/vehicle/trims/route.js
import { NextResponse } from "next/server";
import { getTrimsByModel } from "@/lib/airtable/vehicleData";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const modelId = searchParams.get("modelId");

    if (!modelId) {
      return NextResponse.json(
        { ok: false, error: "Missing required query param: modelId" },
        { status: 400 },
      );
    }

    const trims = await getTrimsByModel(modelId);
    return NextResponse.json({ ok: true, data: trims }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/vehicle/trims]", err);
    return NextResponse.json(
      { ok: false, error: "Failed to load trims." },
      { status: 500 },
    );
  }
}
