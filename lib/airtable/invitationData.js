// /lib/airtable/invitationData.js

import { createBase } from "./client";
import { getRequestData } from "./requestData";
import { getAllDealers } from "./dealerData";

const base = createBase();
const REQUEST_DEALER_TABLE = "RequestDealer";

/*
  IMPORTANT:
  This field list is based on your redesign blueprint's recommended
  RequestDealer fields. If your actual Airtable labels differ,
  update them here first.
*/
const REQUEST_DEALER_FIELDS = [
  "RequestDealer ID",
  "Request",
  "Dealer",
  "Round Number",
  "Candidate Status",
  "Selection Status",
  "Selection Reason",
  "Exclusion Reason",
  "Manual Include?",
  "Manual Exclude?",
  "Dealer Quote Token",
  "Dealer Quote Token Expires At",
  "Dealer Review Token",
  "Dealer Review Token Expires At",
  "RFQ Send Status",
  "RFQ Sent At",
  "Quote Submitted?",
  "Quote",
  "Dealer Review Released?",
  "Dealer Review Email Sent At",
];

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

function escapeFormulaValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function resolveInvitationBucket({ quoted, rfqSentAt, rfqSendStatus }) {
  const status = normalizeStatus(rfqSendStatus);

  const readyStatuses = new Set([
    "ready",
    "ready to send",
    "send ready",
    "send-ready",
    "queued",
    "queued for send",
    "pending send",
  ]);

  const sentStatuses = new Set([
    "sent",
    "delivered",
    "completed",
    "round 1 sent",
    "round 2 sent",
  ]);

  if (quoted) {
    return {
      bucket: "quoted",
      label: "Quoted",
    };
  }

  if (rfqSentAt || sentStatuses.has(status)) {
    return {
      bucket: "sent",
      label: "Sent",
    };
  }

  if (readyStatuses.has(status)) {
    return {
      bucket: "ready",
      label: "Ready",
    };
  }

  return {
    bucket: "pending",
    label: rfqSendStatus || "Pending",
  };
}

function sortInvitationRows(a, b) {
  const roundA = String(a.roundNumber || "");
  const roundB = String(b.roundNumber || "");
  if (roundA !== roundB) return roundA.localeCompare(roundB);

  return String(a.dealerName || "").localeCompare(String(b.dealerName || ""));
}

function buildDealerLookup(dealers) {
  const map = new Map();

  for (const dealer of dealers) {
    if (dealer?.recordId) {
      map.set(dealer.recordId, dealer);
    }
  }

  return map;
}

function normalizeInvitationRecord(record, dealerLookup) {
  const fields = record.fields || {};

  const dealerLinkIds = arrayValue(fields["Dealer"]);
  const dealerRecordId = dealerLinkIds[0] || "";
  const dealer = dealerLookup.get(dealerRecordId);

  const quoteRecordIds = arrayValue(fields["Quote"]);
  const quoteSubmitted =
    booleanValue(fields["Quote Submitted?"]) || quoteRecordIds.length > 0;

  const rfqSendStatus = textValue(fields["RFQ Send Status"]);
  const rfqSentAt = isoValue(fields["RFQ Sent At"]);

  const resolvedStatus = resolveInvitationBucket({
    quoted: quoteSubmitted,
    rfqSentAt,
    rfqSendStatus,
  });

  return {
    id: textValue(fields["RequestDealer ID"]) || record.id,
    recordId: record.id,

    requestDealerId: textValue(fields["RequestDealer ID"]),
    requestRecordIds: arrayValue(fields["Request"]),
    dealerRecordIds: dealerLinkIds,
    dealerRecordId,

    dealerId: dealer?.dealerId || "",
    dealerName:
      dealer?.dealerName ||
      textValue(fields["Dealer"]) ||
      dealerRecordId ||
      "Unknown Dealer",

    roundNumber: textValue(fields["Round Number"]) || "R1",

    candidateStatus: textValue(fields["Candidate Status"]),
    selectionStatus: textValue(fields["Selection Status"]),
    selectionReason: textValue(fields["Selection Reason"]),
    exclusionReason: textValue(fields["Exclusion Reason"]),

    manualInclude: booleanValue(fields["Manual Include?"]),
    manualExclude: booleanValue(fields["Manual Exclude?"]),

    dealerQuoteToken: textValue(fields["Dealer Quote Token"]),
    dealerQuoteTokenExpiresAt: isoValue(
      fields["Dealer Quote Token Expires At"],
    ),
    dealerReviewToken: textValue(fields["Dealer Review Token"]),
    dealerReviewTokenExpiresAt: isoValue(
      fields["Dealer Review Token Expires At"],
    ),

    rfqSendStatus,
    rfqSentAt,

    quoteSubmitted,
    quoteRecordIds,
    quoteRecordId: quoteRecordIds[0] || "",

    dealerReviewReleased: booleanValue(fields["Dealer Review Released?"]),
    dealerReviewEmailSentAt: isoValue(fields["Dealer Review Email Sent At"]),

    status: resolvedStatus.label,
    statusBucket: resolvedStatus.bucket,
  };
}

async function resolveRequestData(requestInput) {
  if (!requestInput) {
    throw new Error(
      "resolveRequestData requires a request object or Request ID",
    );
  }

  if (typeof requestInput === "string") {
    return getRequestData(requestInput);
  }

  return requestInput;
}

async function fetchRequestDealerRecordsByIds(recordIds) {
  if (!recordIds.length) return [];

  const chunks = chunkArray(recordIds, 25);
  const results = [];

  for (const chunk of chunks) {
    const filterByFormula = `OR(${chunk
      .map((id) => `RECORD_ID()="${escapeFormulaValue(id)}"`)
      .join(",")})`;

    const records = await base.safeSelect(REQUEST_DEALER_TABLE, {
      fields: REQUEST_DEALER_FIELDS,
      filterByFormula,
      maxRecords: chunk.length,
    });

    results.push(...records);
  }

  return results;
}

function summarizeInvitationRows(rows) {
  const summary = {
    total: rows.length,
    ready: 0,
    sent: 0,
    quoted: 0,
    pending: 0,
  };

  for (const row of rows) {
    if (row.statusBucket === "quoted") summary.quoted += 1;
    else if (row.statusBucket === "sent") summary.sent += 1;
    else if (row.statusBucket === "ready") summary.ready += 1;
    else summary.pending += 1;
  }

  return summary;
}

export async function getInvitationData(requestInput) {
  const requestData = await resolveRequestData(requestInput);
  const requestDealerRecordIds =
    requestData?.links?.requestDealerRecordIds || [];

  if (!requestDealerRecordIds.length) {
    return {
      requestId: requestData?.requestId || "",
      total: 0,
      ready: 0,
      sent: 0,
      quoted: 0,
      pending: 0,
      rows: [],
    };
  }

  const [records, dealers] = await Promise.all([
    fetchRequestDealerRecordsByIds(requestDealerRecordIds),
    getAllDealers(),
  ]);

  const dealerLookup = buildDealerLookup(dealers);

  const rows = records
    .map((record) => normalizeInvitationRecord(record, dealerLookup))
    .sort(sortInvitationRows);

  return {
    requestId: requestData?.requestId || "",
    ...summarizeInvitationRows(rows),
    rows,
  };
}

export async function getInvitationRows(requestInput) {
  const data = await getInvitationData(requestInput);
  return data.rows;
}

export async function getInvitationSummary(requestInput) {
  const data = await getInvitationData(requestInput);

  return {
    requestId: data.requestId,
    total: data.total,
    ready: data.ready,
    sent: data.sent,
    quoted: data.quoted,
    pending: data.pending,
  };
}
