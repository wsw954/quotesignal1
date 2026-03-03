//app/api/vehicle/models/route.js
import { NextResponse } from "next/server";
import { getModelsByMake } from "@/lib/airtable/vehicleData";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const makeId = searchParams.get("makeId");

    if (!makeId) {
      return NextResponse.json(
        { ok: false, error: "Missing required query param: makeId" },
        { status: 400 },
      );
    }

    const models = await getModelsByMake(makeId);
    return NextResponse.json({ ok: true, data: models }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/vehicle/models]", err);
    return NextResponse.json(
      { ok: false, error: "Failed to load models." },
      { status: 500 },
    );
  }
}
