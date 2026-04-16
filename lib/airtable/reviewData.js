// /lib/airtable/reviewData.js

import { createBase } from "./client";
import { getRequestData } from "./requestData";
import { getInvitationData } from "./invitationData";
import { evaluateRoundLifecycle } from "@/lib/workflow/evaluateRoundLifecycle";
import { assertActiveToken, normalizeToken } from "@/lib/utils/tokens";

const base = createBase();

const REQUESTS_TABLE = "Requests";
const REQUEST_DEALER_TABLE = "RequestDealer";
const QUOTES_TABLE = "Quotes";

const REQUEST_TOKEN_FIELDS = [
  "Request ID",
  "Buyer Review Token",
  "Buyer Review Token Expires At",
  "Buyer Review Sent At",
  "Buyer Review Expires At",
  "Request Status",
  "Round Number",
  "Review Ready?",
];

const REQUEST_DEALER_TOKEN_FIELDS = [
  "RequestDealer ID",
  "Request",
  "Dealer",
  "Round Number",
  "Dealer Review Token",
  "Dealer Review Token Expires At",
  "Dealer Review Released?",
  "Quote Submitted?",
  "Quote",
  "RFQ Send Status",
  "RFQ Sent At",
];

const QUOTE_FIELDS = [
  "Quote ID",
  "Request",
  "Request ID",
  "Email Subject Tag",
  "Dealer Name",
  "Dealer",
  "Dealer Main Contact",
  "RequestDealer",
  "Quote Source",
  "Received Time",
  "Quote Expiration",
  "Compliance Status",
  "Is Compliant?",
  "Compliance Notes",
  "Purchase Type",
  "OTD Total",
  "Lease Term (months)",
  "Lease Monthly",
  "Lease DAS",
  "Lease All-In Cost",
  "Score",
  "Score (Compliant Only)",
  "Quote Notes",
  "Buyer Choice (Requests)",
  "Round Number",
  "Last Updated Time",
  "Quote Update Link",
  "APR %",
  "Finance Term (months)",
  "Down Payment Assumed",
  "Monthly Payment (Finance)",
  "Lease Miles/Year",
  "Make",
  "Model",
  "Trim",
  "Accessories",
  "Trim Notes/Packages",
  "Quote Loss Reason",
  "Included In Buyer Review?",
  "Included in Dealer Review?",
  "Year",
  "Finance All-In Cost",
  "Dealer Delivery Timeline",
  "Exterior Color",
];

function escapeFormulaValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function firstValue(value) {
  if (Array.isArray(value)) return value.length ? value[0] : null;
  return value ?? null;
}

function arrayValue(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function textValue(value) {
  const v = firstValue(value);
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

function numberValue(value, fallback = null) {
  const v = firstValue(value);
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function booleanValue(value) {
  return value === true;
}

function isoValue(value) {
  return firstValue(value) || null;
}

function normalizeRoundNumber(value) {
  const round = String(value || "R1")
    .trim()
    .toUpperCase();

  return round === "R2" ? "R2" : "R1";
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function buildQuoteLookup(rows = []) {
  const map = new Map();

  for (const row of rows) {
    if (row?.recordId) {
      map.set(row.recordId, row);
    }
  }

  return map;
}

function normalizeQuoteRecord(record) {
  const fields = record.fields || {};

  const requestRecordIds = arrayValue(fields["Request"]);
  const dealerRecordIds = arrayValue(fields["Dealer"]);
  const requestDealerRecordIds = arrayValue(fields["RequestDealer"]);
  const buyerChoiceRequestIds = arrayValue(fields["Buyer Choice (Requests)"]);

  const purchaseType = textValue(fields["Purchase Type"]);
  const roundNumber = normalizeRoundNumber(fields["Round Number"]);

  return {
    recordId: record.id,
    quoteId: textValue(fields["Quote ID"]) || record.id,

    links: {
      requestRecordIds,
      requestRecordId: requestRecordIds[0] || "",
      dealerRecordIds,
      dealerRecordId: dealerRecordIds[0] || "",
      requestDealerRecordIds,
      requestDealerRecordId: requestDealerRecordIds[0] || "",
      buyerChoiceRequestIds,
    },

    identity: {
      requestIdText: textValue(fields["Request ID"]),
      emailSubjectTag: textValue(fields["Email Subject Tag"]),
      dealerName: textValue(fields["Dealer Name"]),
      dealerMainContact: textValue(fields["Dealer Main Contact"]),
      quoteSource: textValue(fields["Quote Source"]),
      roundNumber,
      purchaseType,
    },

    compliance: {
      status: textValue(fields["Compliance Status"]),
      isCompliant: booleanValue(fields["Is Compliant?"]),
      notes: textValue(fields["Compliance Notes"]),
      quoteLossReason: textValue(fields["Quote Loss Reason"]),
    },

    inclusion: {
      includedInBuyerReview: booleanValue(fields["Included In Buyer Review?"]),
      includedInDealerReview: booleanValue(
        fields["Included in Dealer Review?"],
      ),
      isBuyerChoice: buyerChoiceRequestIds.length > 0,
    },

    scoring: {
      score: numberValue(fields["Score"]),
      scoreCompliantOnly: numberValue(fields["Score (Compliant Only)"]),
      leaseAllInCost: numberValue(fields["Lease All-In Cost"]),
      financeAllInCost: numberValue(fields["Finance All-In Cost"]),
    },

    offeredVehicle: {
      year: textValue(fields["Year"]),
      make: textValue(fields["Make"]),
      model: textValue(fields["Model"]),
      trim: textValue(fields["Trim"]),
      exteriorColor: textValue(fields["Exterior Color"]),
      accessories: textValue(fields["Accessories"]),
      trimNotesPackages: textValue(fields["Trim Notes/Packages"]),
    },

    commercialTerms: {
      purchaseType,
      otdTotal: numberValue(fields["OTD Total"]),
      aprPercent: numberValue(fields["APR %"]),
      financeTermMonths: numberValue(fields["Finance Term (months)"]),
      downPaymentAssumed: numberValue(fields["Down Payment Assumed"]),
      monthlyPaymentFinance: numberValue(fields["Monthly Payment (Finance)"]),
      leaseTermMonths: numberValue(fields["Lease Term (months)"]),
      leaseMonthly: numberValue(fields["Lease Monthly"]),
      leaseDas: numberValue(fields["Lease DAS"]),
      leaseMilesPerYear: numberValue(fields["Lease Miles/Year"]),
    },

    delivery: {
      dealerDeliveryTimeline: textValue(fields["Dealer Delivery Timeline"]),
    },

    notes: {
      quoteNotes: textValue(fields["Quote Notes"]),
      quoteUpdateLink: textValue(fields["Quote Update Link"]),
    },

    timestamps: {
      receivedTime: isoValue(fields["Received Time"]),
      lastUpdatedTime: isoValue(fields["Last Updated Time"]),
      quoteExpiration: isoValue(fields["Quote Expiration"]),
    },

    raw: fields,
  };
}

async function fetchRequestByBuyerToken(token) {
  const normalizedToken = normalizeToken(token);

  if (!normalizedToken) {
    throw new Error("Buyer review token is required");
  }

  const records = await base.safeSelect(REQUESTS_TABLE, {
    fields: REQUEST_TOKEN_FIELDS,
    filterByFormula: `{Buyer Review Token}="${escapeFormulaValue(
      normalizedToken,
    )}"`,
    maxRecords: 1,
  });

  const record = records[0];

  if (!record) {
    throw new Error("Buyer review token not found");
  }

  const fields = record.fields || {};

  assertActiveToken({
    providedToken: normalizedToken,
    storedToken: textValue(fields["Buyer Review Token"]),
    expiresAt: isoValue(fields["Buyer Review Token Expires At"]),
    label: "Buyer review token",
  });

  return {
    recordId: record.id,
    requestId: textValue(fields["Request ID"]),
    requestStatus: textValue(fields["Request Status"]),
    roundNumber: normalizeRoundNumber(fields["Round Number"]),
    buyerReviewSentAt: isoValue(fields["Buyer Review Sent At"]),
    buyerReviewExpiresAt: isoValue(fields["Buyer Review Expires At"]),
    buyerReviewTokenExpiresAt: isoValue(
      fields["Buyer Review Token Expires At"],
    ),
    reviewReady: booleanValue(fields["Review Ready?"]),
  };
}

async function fetchDealerInvitationByReviewToken(token) {
  const normalizedToken = normalizeToken(token);

  if (!normalizedToken) {
    throw new Error("Dealer review token is required");
  }

  const records = await base.safeSelect(REQUEST_DEALER_TABLE, {
    fields: REQUEST_DEALER_TOKEN_FIELDS,
    filterByFormula: `{Dealer Review Token}="${escapeFormulaValue(
      normalizedToken,
    )}"`,
    maxRecords: 1,
  });

  const record = records[0];

  if (!record) {
    throw new Error("Dealer review token not found");
  }

  const fields = record.fields || {};

  assertActiveToken({
    providedToken: normalizedToken,
    storedToken: textValue(fields["Dealer Review Token"]),
    expiresAt: isoValue(fields["Dealer Review Token Expires At"]),
    label: "Dealer review token",
  });

  const requestRecordIds = arrayValue(fields["Request"]);
  const dealerRecordIds = arrayValue(fields["Dealer"]);
  const quoteRecordIds = arrayValue(fields["Quote"]);

  return {
    recordId: record.id,
    requestDealerId: textValue(fields["RequestDealer ID"]) || record.id,
    requestRecordId: requestRecordIds[0] || "",
    dealerRecordId: dealerRecordIds[0] || "",
    quoteRecordId: quoteRecordIds[0] || "",
    roundNumber: normalizeRoundNumber(fields["Round Number"]),
    rfqSendStatus: textValue(fields["RFQ Send Status"]),
    rfqSentAt: isoValue(fields["RFQ Sent At"]),
    quoteSubmitted:
      booleanValue(fields["Quote Submitted?"]) || quoteRecordIds.length > 0,
    dealerReviewReleased: booleanValue(fields["Dealer Review Released?"]),
  };
}

async function fetchQuotesByRecordIds(recordIds) {
  const ids = [...new Set((recordIds || []).filter(Boolean))];

  if (!ids.length) return [];

  const chunks = chunkArray(ids, 25);
  const results = [];

  for (const chunk of chunks) {
    const filterByFormula = `OR(${chunk
      .map((id) => `RECORD_ID()="${escapeFormulaValue(id)}"`)
      .join(",")})`;

    const records = await base.safeSelect(QUOTES_TABLE, {
      fields: QUOTE_FIELDS,
      filterByFormula,
      maxRecords: chunk.length,
    });

    results.push(...records);
  }

  return results;
}

async function fetchQuotesForRequest(requestData, invitations) {
  const requestLinkedQuoteIds = requestData?.links?.quoteRecordIds || [];
  const invitationQuoteIds = (invitations?.rows || [])
    .map((row) => row?.quoteRecordId)
    .filter(Boolean);

  const quoteIds = [
    ...new Set([...requestLinkedQuoteIds, ...invitationQuoteIds]),
  ];

  const records = await fetchQuotesByRecordIds(quoteIds);
  const rows = records.map(normalizeQuoteRecord);
  const lookup = buildQuoteLookup(rows);

  return {
    total: rows.length,
    rows,
    byRecordId: lookup,
  };
}

function buildReviewAccess({ mode, requestData, dealerInvitation }) {
  if (mode === "buyer") {
    return {
      mode: "buyer",
      requestId: requestData?.requestId || "",
      reviewReady: requestData?.workflow?.reviewReady === true,
      buyerReviewSentAt: requestData?.request?.buyerReviewSentAt || null,
      buyerReviewExpiresAt: requestData?.request?.buyerReviewExpiresAt || null,
    };
  }

  return {
    mode: "dealer",
    requestId: requestData?.requestId || "",
    requestDealerId: dealerInvitation?.requestDealerId || "",
    dealerReviewReleased: dealerInvitation?.dealerReviewReleased === true,
    quoteSubmitted: dealerInvitation?.quoteSubmitted === true,
    dealerQuoteRecordId: dealerInvitation?.quoteRecordId || "",
  };
}

async function buildReviewBundle({
  requestData,
  mode = "internal",
  dealerInvitation = null,
} = {}) {
  if (!requestData?.requestId) {
    throw new Error("buildReviewBundle requires requestData with a Request ID");
  }

  const invitations = await getInvitationData(requestData);
  const lifecycle = evaluateRoundLifecycle({
    requestData,
    currentRound: requestData?.workflow?.roundNumber,
    invitations,
  });

  const quotes = await fetchQuotesForRequest(requestData, invitations);

  return {
    requestId: requestData.requestId,
    currentRound: normalizeRoundNumber(
      requestData?.workflow?.roundNumber || lifecycle?.currentRound || "R1",
    ),

    mode,
    access: buildReviewAccess({
      mode,
      requestData,
      dealerInvitation,
    }),

    requestData,
    invitations,
    quotes,
    lifecycle,

    context: {
      generatedAt: new Date().toISOString(),
      requestRecordId: requestData.recordId,
      totalInvitationRows: invitations.total,
      totalQuoteRows: quotes.total,
    },
  };
}

export async function getReviewDataByRequestId(requestId) {
  const requestData = await getRequestData(requestId);

  return buildReviewBundle({
    requestData,
    mode: "internal",
  });
}

export async function getBuyerReviewDataByToken(token) {
  const tokenContext = await fetchRequestByBuyerToken(token);

  if (!tokenContext.requestId) {
    throw new Error("Buyer review token is not linked to a valid Request ID");
  }

  const requestData = await getRequestData(tokenContext.requestId);

  return buildReviewBundle({
    requestData,
    mode: "buyer",
  });
}

export async function getDealerReviewDataByToken(token) {
  const dealerInvitation = await fetchDealerInvitationByReviewToken(token);

  if (!dealerInvitation.requestRecordId) {
    throw new Error("Dealer review token is not linked to a Request");
  }

  const requestIdRecords = await base.safeSelect(REQUESTS_TABLE, {
    fields: ["Request ID"],
    filterByFormula: `RECORD_ID()="${escapeFormulaValue(
      dealerInvitation.requestRecordId,
    )}"`,
    maxRecords: 1,
  });

  const requestId = textValue(requestIdRecords[0]?.fields?.["Request ID"]);

  if (!requestId) {
    throw new Error("Unable to resolve Request ID from dealer review token");
  }

  const requestData = await getRequestData(requestId);

  return buildReviewBundle({
    requestData,
    mode: "dealer",
    dealerInvitation,
  });
}
