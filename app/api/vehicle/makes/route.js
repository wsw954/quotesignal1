// app/api/vehicle/makes/route.js
import { NextResponse } from "next/server";
import { getMakes } from "@/lib/airtable/vehicleData";

export const dynamic = "force-dynamic"; // avoid caching during dev

export async function GET() {
  try {
    const makes = await getMakes();
    return NextResponse.json({ ok: true, data: makes }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/vehicle/makes]", err);
    return NextResponse.json(
      { ok: false, error: "Failed to load makes." },
      { status: 500 },
    );
  }
}
