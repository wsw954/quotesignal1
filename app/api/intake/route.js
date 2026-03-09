// app/api/intake/route.js
import { NextResponse } from "next/server";
import { buyerIntakeSchema } from "@/lib/validation/buyerIntakeSchema";
import { createBuyerRequest } from "@/lib/airtable/intakeSubmit";
import { requiresCreditScoreRange } from "@/lib/constants/creditScoreRanges";
import { createBase } from "@/lib/airtable/client";

const base = createBase();

// Zip lookup source in RFQ-Core
const T_ZIP_CODES =
  process.env.AIRTABLE_ZIP_CODES_SYNCED_TABLE_ID || "Zip Codes (Synced)";

const F_ZIP_SOURCE_ZIP = process.env.AIRTABLE_ZIP_CODES_FIELD_ZIP || "ZIP";
const F_ZIP_SOURCE_STATE =
  process.env.AIRTABLE_ZIP_CODES_FIELD_STATE || "State";
const F_ZIP_SOURCE_REGION =
  process.env.AIRTABLE_ZIP_CODES_FIELD_REGION || "Region";

// Server defaults for new Requests
const DEFAULT_REQUEST_STATUS =
  process.env.INTAKE_DEFAULT_REQUEST_STATUS || "New";
const DEFAULT_PAYMENT_STATUS =
  process.env.INTAKE_DEFAULT_PAYMENT_STATUS || "Unpaid";
const DEFAULT_PRIORITY = process.env.INTAKE_DEFAULT_PRIORITY || "Normal";
const DEFAULT_CURRENT_ROUND = process.env.INTAKE_DEFAULT_CURRENT_ROUND || "R1";
const DEFAULT_DEALER_CAP = Number(process.env.INTAKE_DEFAULT_DEALER_CAP ?? 7);
const DEFAULT_DEALER_TIER_MAX = Number(
  process.env.INTAKE_DEFAULT_DEALER_TIER_MAX ?? 1,
);

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

function normalizeBuyerZip(value) {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (digits.length === 5) return digits;
  if (digits.length === 9) return digits.slice(0, 5);

  return "";
}

function cleanLookupValue(value) {
  if (Array.isArray(value)) {
    return String(value[0] ?? "").trim();
  }
  return String(value ?? "").trim();
}

async function findZipRouting(zip) {
  const records = await base.safeSelect(T_ZIP_CODES, {
    fields: [F_ZIP_SOURCE_ZIP, F_ZIP_SOURCE_STATE, F_ZIP_SOURCE_REGION],
  });
  console.log("zip records returned:", records.length);
  console.log(
    "sample zips:",
    records.slice(0, 5).map((record) => {
      const fields = record?.fields ?? record ?? {};
      return fields[F_ZIP_SOURCE_ZIP];
    }),
  );
  console.log(
    "last sample zips:",
    records.slice(-5).map((record) => {
      const fields = record?.fields ?? record ?? {};
      return fields[F_ZIP_SOURCE_ZIP];
    }),
  );

  if (!Array.isArray(records) || records.length === 0) {
    return null;
  }

  const match = records.find((record) => {
    const fields = record?.fields ?? record ?? {};
    const recordZip = cleanLookupValue(fields[F_ZIP_SOURCE_ZIP]);
    return recordZip === zip;
  });

  if (!match) {
    return null;
  }

  const fields = match?.fields ?? match ?? {};

  return {
    buyerState: cleanLookupValue(fields[F_ZIP_SOURCE_STATE]),
    region: cleanLookupValue(fields[F_ZIP_SOURCE_REGION]),
  };
}

//Alternate version
// async function findZipRouting(zip) {
//   // We use OR to check if the ZIP is stored as a String ("33351") or a Number (33351).
//   // This is the most resilient way to query Airtable for numeric-string fields.
//   const formula = `OR({${F_ZIP_SOURCE_ZIP}} = "${zip}", {${F_ZIP_SOURCE_ZIP}} = ${Number(zip)})`;

//   const records = await base.safeSelect(T_ZIP_CODES, {
//     filterByFormula: formula,
//     fields: [F_ZIP_SOURCE_ZIP, F_ZIP_SOURCE_STATE, F_ZIP_SOURCE_REGION],
//     maxRecords: 1,
//   });

//   if (!Array.isArray(records) || records.length === 0) {
//     // --- DEBUGGING STEP ---
//     // If we still get 0 records, let's peek at the first record in the table
//     // to see exactly what the fields are named and what the data looks like.
//     const sample = await base.safeSelect(T_ZIP_CODES, { maxRecords: 1 });
//     if (sample && sample.length > 0) {
//       const firstRecord = sample[0].fields ?? sample[0];
//       console.log(
//         "DEBUG: ZIP not found. First record in table fields:",
//         Object.keys(firstRecord),
//       );
//       console.log(
//         "DEBUG: First record ZIP value:",
//         firstRecord[F_ZIP_SOURCE_ZIP],
//       );
//     } else {
//       console.log("DEBUG: The table 'Zip Codes (Synced)' appears to be empty.");
//     }
//     // -----------------------
//     return null;
//   }

//   const match = records[0];
//   const fields = match?.fields ?? match ?? {};

//   return {
//     buyerState: cleanLookupValue(fields[F_ZIP_SOURCE_STATE]),
//     region: cleanLookupValue(fields[F_ZIP_SOURCE_REGION]),
//   };
// }

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = buyerIntakeSchema.safeParse(body);

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

    const data = parsed.data;

    const normalizedBuyerZip = normalizeBuyerZip(data.buyerZip);
    console.log("buyerZip raw:", data.buyerZip);
    console.log("buyerZip normalized:", normalizedBuyerZip);

    if (!normalizedBuyerZip) {
      return NextResponse.json(
        {
          ok: false,
          error: "Buyer Zip is invalid.",
          fieldErrors: {
            buyerZip: "Enter a valid 5-digit ZIP code.",
          },
        },
        { status: 400 },
      );
    }

    const zipRouting = await findZipRouting(normalizedBuyerZip);
    console.log("zipRouting result:", zipRouting);
    if (!zipRouting) {
      return NextResponse.json(
        {
          ok: false,
          error: "Buyer Zip was not found in Zip Codes (Synced).",
          fieldErrors: {
            buyerZip: "ZIP code not found. Please enter a supported ZIP code.",
          },
        },
        { status: 400 },
      );
    }

    if (!zipRouting.buyerState || !zipRouting.region) {
      return NextResponse.json(
        {
          ok: false,
          error: "ZIP lookup did not return a valid state and region.",
          fieldErrors: {
            buyerZip: "ZIP code mapping is incomplete. Please review this ZIP.",
          },
        },
        { status: 400 },
      );
    }

    const payload = {
      // buyer-entered fields
      ...data,
      buyerZip: normalizedBuyerZip,
      creditScoreRange: requiresCreditScoreRange(data.purchaseType)
        ? data.creditScoreRange
        : "",

      // server-derived from ZIP
      buyerState: zipRouting.buyerState,
      region: zipRouting.region,

      // internal defaults
      requestStatus: DEFAULT_REQUEST_STATUS,
      paymentStatus: DEFAULT_PAYMENT_STATUS,
      paymentUnlocked: false,
      priority: DEFAULT_PRIORITY,
      currentRound: DEFAULT_CURRENT_ROUND,
      r1Sent: false,
      dealerCap: DEFAULT_DEALER_CAP,
      dealerTierMax: DEFAULT_DEALER_TIER_MAX,
    };

    const created = await createBuyerRequest(payload);

    return NextResponse.json(
      {
        ok: true,
        data: created,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Internal server error.",
      },
      { status: 500 },
    );
  }
}
