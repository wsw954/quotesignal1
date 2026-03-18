// /lib/airtable/requestData.js

import { createBase } from "./client";

const base = createBase();
const REQUESTS_TABLE = "Requests";

const REQUEST_FIELDS = [
  "Request ID",
  "Request Status",
  "Dealer Selection Status",
  "Round Number",
  "Created Time",

  "First Name",
  "Last Name",
  "Buyer Email",
  "Buyer Phone",
  "Buyer Zip",
  "Buyer State",
  "Region",

  "Purchase Type Requested",
  "Credit Score Range",
  "Priority",
  "Target Close Timeline",

  "Year",
  "Make",
  "Model",
  "Trim",
  "Make (text)",
  "Model (text)",
  "Trim (text)",
  "Vehicle Spec",
  "Accessories",
  "Trim Notes/Packages",

  "# Quotes Received",
  "# Compliant Quotes",
  "Best Score (Compliant)",
  "Target Dealer Count",
  "Selected Dealer Count",
  "Quoted Dealer Count",

  "Payment Status",
  "Payment Unlocked",
  "Payment Unlocked At",

  "R1 Sent",
  "RFQ Round 1 Sent At",
  "RFQ Round 2 Sent At",

  "Buyer Review Token",
  "Buyer Review Token Expires At",
  "Buyer Choice",
  "Buyer Decision At",
  "Round 2 Triggered?",
  "Round 2 Triggered Time",
  "Round 1 Closed At",
  "Request Closed At",
  "Review Ready?",

  "Quotes",
  "RequestDealer",
  "Attachments",
  "Round Notes",
  "Winner Notes",
  "Email Subject Tag",
];

function escapeFormulaValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function firstValue(value) {
  if (Array.isArray(value)) return value.length ? value[0] : null;
  return value ?? null;
}

function textValue(value) {
  const v = firstValue(value);
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

function numberValue(value, fallback = 0) {
  const v = firstValue(value);
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function booleanValue(value) {
  return value === true;
}

function arrayValue(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function isoValue(value) {
  return firstValue(value) || null;
}

function buildBuyerName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

function normalizeRequestRecord(record) {
  const fields = record.fields || {};

  const firstName = textValue(fields["First Name"]);
  const lastName = textValue(fields["Last Name"]);

  const year = textValue(fields["Year"]);
  const make = textValue(fields["Make (text)"]) || textValue(fields["Make"]);
  const model = textValue(fields["Model (text)"]) || textValue(fields["Model"]);
  const trim = textValue(fields["Trim (text)"]) || textValue(fields["Trim"]);

  const r1Sent = booleanValue(fields["R1 Sent"]);
  const r1SentAt = isoValue(fields["RFQ Round 1 Sent At"]);
  const r2SentAt = isoValue(fields["RFQ Round 2 Sent At"]);

  let sendStatusLabel = "Not Sent";
  if (r2SentAt) sendStatusLabel = "Round 2 Sent";
  else if (r1Sent || r1SentAt) sendStatusLabel = "Round 1 Sent";

  return {
    recordId: record.id,
    requestId: textValue(fields["Request ID"]),
    emailSubjectTag: textValue(fields["Email Subject Tag"]),

    buyer: {
      firstName,
      lastName,
      fullName: buildBuyerName(firstName, lastName),
      email: textValue(fields["Buyer Email"]),
      phone: textValue(fields["Buyer Phone"]),
      zip: textValue(fields["Buyer Zip"]),
      state: textValue(fields["Buyer State"]),
      region: textValue(fields["Region"]),
    },

    request: {
      createdTime: isoValue(fields["Created Time"]),
      purchaseTypeRequested: textValue(fields["Purchase Type Requested"]),
      creditScoreRange: textValue(fields["Credit Score Range"]),
      priority: textValue(fields["Priority"]),
      targetCloseTimeline: textValue(fields["Target Close Timeline"]),
      paymentStatus: textValue(fields["Payment Status"]),
      paymentUnlocked: booleanValue(fields["Payment Unlocked"]),
      paymentUnlockedAt: isoValue(fields["Payment Unlocked At"]),
      attachments: arrayValue(fields["Attachments"]),
      roundNotes: textValue(fields["Round Notes"]),
      winnerNotes: textValue(fields["Winner Notes"]),
    },

    vehicle: {
      year,
      make,
      model,
      trim,
      vehicleSpec:
        textValue(fields["Vehicle Spec"]) ||
        [year, make, model, trim].filter(Boolean).join(" ").trim(),
      accessories: textValue(fields["Accessories"]),
      trimNotesPackages: textValue(fields["Trim Notes/Packages"]),
    },

    workflow: {
      requestStatus: textValue(fields["Request Status"]),
      dealerSelectionStatus: textValue(fields["Dealer Selection Status"]),
      roundNumber: textValue(fields["Round Number"]) || "R1",
      buyerReviewToken: textValue(fields["Buyer Review Token"]),
      buyerReviewTokenExpiresAt: isoValue(
        fields["Buyer Review Token Expires At"],
      ),
      buyerDecisionAt: isoValue(fields["Buyer Decision At"]),
      round2Triggered: booleanValue(fields["Round 2 Triggered?"]),
      round2TriggeredTime: isoValue(fields["Round 2 Triggered Time"]),
      round1ClosedAt: isoValue(fields["Round 1 Closed At"]),
      requestClosedAt: isoValue(fields["Request Closed At"]),
      reviewReady: booleanValue(fields["Review Ready?"]),
      sendStatus: {
        label: sendStatusLabel,
        r1Sent,
        r1SentAt,
        r2SentAt,
      },
    },

    metrics: {
      quotesReceived: numberValue(fields["# Quotes Received"]),
      compliantQuotes: numberValue(fields["# Compliant Quotes"]),
      bestScoreCompliant: numberValue(fields["Best Score (Compliant)"], null),
      targetDealerCount: numberValue(fields["Target Dealer Count"]),
      selectedDealerCount: numberValue(fields["Selected Dealer Count"]),
      quotedDealerCount: numberValue(fields["Quoted Dealer Count"]),
    },

    links: {
      quoteRecordIds: arrayValue(fields["Quotes"]),
      buyerChoiceQuoteIds: arrayValue(fields["Buyer Choice"]),
      requestDealerRecordIds: arrayValue(fields["RequestDealer"]),
    },

    flags: {
      isPaid: textValue(fields["Payment Status"]) === "Paid",
      isClosed: Boolean(isoValue(fields["Request Closed At"])),
      hasBuyerDecision: Boolean(isoValue(fields["Buyer Decision At"])),
      hasRound2: booleanValue(fields["Round 2 Triggered?"]),
      isReviewReady: booleanValue(fields["Review Ready?"]),
      hasInvitations: arrayValue(fields["RequestDealer"]).length > 0,
      hasQuotes: numberValue(fields["# Quotes Received"]) > 0,
    },

    raw: fields,
  };
}

export async function getRequestData(requestId) {
  const value = String(requestId || "")
    .trim()
    .toUpperCase();

  if (!value) {
    throw new Error("getRequestData requires a Request ID");
  }

  const records = await base.safeSelect(REQUESTS_TABLE, {
    fields: REQUEST_FIELDS,
    filterByFormula: `{Request ID}="${escapeFormulaValue(value)}"`,
    maxRecords: 1,
  });

  const record = records[0];

  if (!record) {
    throw new Error(`Request not found: ${value}`);
  }

  return normalizeRequestRecord(record);
}

export async function getRequestSummary(requestId) {
  const data = await getRequestData(requestId);

  return {
    recordId: data.recordId,
    requestId: data.requestId,
    buyer: data.buyer,
    request: data.request,
    vehicle: data.vehicle,
    workflow: data.workflow,
    metrics: data.metrics,
    flags: data.flags,
  };
}
