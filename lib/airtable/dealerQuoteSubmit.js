// /lib/airtable/dealerQuoteSubmit.js

import { createBase } from "./client";
import { getRequestData } from "./requestData";
import { assertActiveToken, normalizeToken } from "../utils/tokens";

const base = createBase();

const REQUEST_DEALER_TABLE = "RequestDealer";
const QUOTES_TABLE = "Quotes";

const REQUEST_DEALER_FIELDS = [
  "RequestDealer ID",
  "Request",
  "Request ID (from Request)",
  "Request ID Text",
  "Dealer",
  "Dealer ID (from Dealers)",
  "Round Number",
  "Candidate Status",
  "Selection Status",
  "Selection Reason",
  "Exclusion Reason",
  "Manual Include?",
  "Manual Exclude?",
  "Dealer Quote Token",
  "Dealer Quote Token Expires At",
  "RFQ Send Status",
  "RFQ Sent At",
  "Quote Submitted?",
  "Quote",
  "Quote ID (from Quote)",
  "Dealer Response Status",
  "Dealer Main Email Text",
  "Dealer Name Text",
  "Dealer Main Contact Text",
  "Vehicle Spec Text",
  "Purchase Type Text",
  "Buyer Region Text",
  "Target Close Timeline Text",
  "Credit Score Range Text",
  "Credit Score Line Text",
];

const QUOTE_FIELDS = [
  "Quote ID",
  "Request",
  "Dealer",
  "RequestDealer",
  "Quote Source",
  "Round Number",
  "Purchase Type",
  "Year",
  "Make",
  "Model",
  "Trim",
  "Exterior Color",
  "Accessories",
  "Trim Notes/Packages",
  "Compliance Status",
  "Is Compliant?",
  "Compliance Notes",
  "OTD Total",
  "APR %",
  "Finance Term (months)",
  "Down Payment Assumed",
  "Monthly Payment (Finance)",
  "Lease Term (months)",
  "Lease Monthly",
  "Lease DAS",
  "Lease Miles/Year",
  "Dealer Delivery Timeline",
  "Quote Notes",
  "Received Time",
  "Last Updated Time",
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

function booleanValue(value) {
  return value === true;
}

function isoValue(value) {
  return firstValue(value) || null;
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isBlank(value) {
  return (
    value == null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function cleanFields(fields) {
  const cleaned = {};

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (value === null) continue;

    if (Array.isArray(value)) {
      if (!value.length) continue;
      cleaned[key] = value;
      continue;
    }

    cleaned[key] = value;
  }

  return cleaned;
}

function getSingleLinkedId(value) {
  const ids = arrayValue(value);
  return ids[0] || "";
}

function numericOrNull(value) {
  if (isBlank(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeRequestDealerRecord(record) {
  const fields = record.fields || {};

  const requestRecordId = getSingleLinkedId(fields["Request"]);
  const dealerRecordId = getSingleLinkedId(fields["Dealer"]);
  const quoteRecordId = getSingleLinkedId(fields["Quote"]);

  return {
    recordId: record.id,
    requestDealerId: textValue(fields["RequestDealer ID"]) || record.id,

    requestRecordId,
    requestIdText:
      textValue(fields["Request ID Text"]) ||
      textValue(fields["Request ID (from Request)"]),

    dealerRecordId,
    dealerIdText: textValue(fields["Dealer ID (from Dealers)"]),
    dealerName: textValue(fields["Dealer Name Text"]),
    dealerMainContact: textValue(fields["Dealer Main Contact Text"]),
    dealerMainEmail: textValue(fields["Dealer Main Email Text"]),

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

    rfqSendStatus: textValue(fields["RFQ Send Status"]),
    rfqSentAt: isoValue(fields["RFQ Sent At"]),

    quoteSubmitted: booleanValue(fields["Quote Submitted?"]),
    quoteRecordId,
    quoteIdText: textValue(fields["Quote ID (from Quote)"]),

    dealerResponseStatus: textValue(fields["Dealer Response Status"]),

    purchaseTypeText: textValue(fields["Purchase Type Text"]),
    buyerRegionText: textValue(fields["Buyer Region Text"]),
    targetCloseTimelineText: textValue(fields["Target Close Timeline Text"]),
    vehicleSpecText: textValue(fields["Vehicle Spec Text"]),
    creditScoreRangeText: textValue(fields["Credit Score Range Text"]),
    creditScoreLineText: textValue(fields["Credit Score Line Text"]),
  };
}

function normalizeQuoteRecord(record) {
  const fields = record.fields || {};

  return {
    recordId: record.id,
    quoteId: textValue(fields["Quote ID"]) || record.id,

    requestRecordId: getSingleLinkedId(fields["Request"]),
    dealerRecordId: getSingleLinkedId(fields["Dealer"]),
    requestDealerRecordId: getSingleLinkedId(fields["RequestDealer"]),

    quoteSource: textValue(fields["Quote Source"]),
    roundNumber: textValue(fields["Round Number"]),
    purchaseType: textValue(fields["Purchase Type"]),

    offeredVehicle: {
      year: textValue(fields["Year"]),
      make: textValue(fields["Make"]),
      model: textValue(fields["Model"]),
      trim: textValue(fields["Trim"]),
      exteriorColor: textValue(fields["Exterior Color"]),
      accessories: textValue(fields["Accessories"]),
      trimNotesPackages: textValue(fields["Trim Notes/Packages"]),
    },

    terms: {
      complianceStatus: textValue(fields["Compliance Status"]),
      isCompliant: booleanValue(fields["Is Compliant?"]),
      complianceNotes: textValue(fields["Compliance Notes"]),
      otdTotal: firstValue(fields["OTD Total"]),
      aprPercent: firstValue(fields["APR %"]),
      financeTermMonths: firstValue(fields["Finance Term (months)"]),
      downPaymentAssumed: firstValue(fields["Down Payment Assumed"]),
      monthlyPaymentFinance: firstValue(fields["Monthly Payment (Finance)"]),
      leaseTermMonths: firstValue(fields["Lease Term (months)"]),
      leaseMonthly: firstValue(fields["Lease Monthly"]),
      leaseDas: firstValue(fields["Lease DAS"]),
      leaseMilesPerYear: firstValue(fields["Lease Miles/Year"]),
      dealerDeliveryTimeline: textValue(fields["Dealer Delivery Timeline"]),
      quoteNotes: textValue(fields["Quote Notes"]),
    },

    receivedTime: isoValue(fields["Received Time"]),
    lastUpdatedTime: isoValue(fields["Last Updated Time"]),
  };
}

async function getRequestDealerRecordByQuoteToken(token) {
  const normalizedToken = normalizeToken(token);

  if (!normalizedToken) {
    throw new Error("Dealer quote token is required");
  }

  const records = await base.safeSelect(REQUEST_DEALER_TABLE, {
    fields: REQUEST_DEALER_FIELDS,
    filterByFormula: `{Dealer Quote Token}="${escapeFormulaValue(
      normalizedToken,
    )}"`,
    maxRecords: 1,
  });

  const record = records[0];

  if (!record) {
    throw new Error("Dealer quote invitation not found");
  }

  return record;
}

async function getQuoteRecordById(recordId) {
  if (!recordId) return null;

  const records = await base.safeSelect(QUOTES_TABLE, {
    fields: QUOTE_FIELDS,
    filterByFormula: `RECORD_ID()="${escapeFormulaValue(recordId)}"`,
    maxRecords: 1,
  });

  return records[0] || null;
}

function assertInvitationEligible(invitation) {
  const selectionStatus = normalizeStatus(invitation.selectionStatus);
  const candidateStatus = normalizeStatus(invitation.candidateStatus);
  const rfqSendStatus = normalizeStatus(invitation.rfqSendStatus);
  const dealerResponseStatus = normalizeStatus(invitation.dealerResponseStatus);

  if (selectionStatus !== "selected") {
    throw new Error(
      `Dealer quote invitation is not eligible (selection status: ${invitation.selectionStatus || "unknown"})`,
    );
  }

  if (candidateStatus === "ineligible") {
    throw new Error("Dealer quote invitation is not eligible");
  }

  if (invitation.manualExclude) {
    throw new Error("Dealer quote invitation is not eligible");
  }

  if (rfqSendStatus !== "sent") {
    throw new Error(
      `Dealer quote invitation is not eligible (RFQ status: ${invitation.rfqSendStatus || "unknown"})`,
    );
  }

  if (["declined", "withdrawn", "no response"].includes(dealerResponseStatus)) {
    throw new Error(
      `Dealer quote invitation is not eligible (dealer response: ${invitation.dealerResponseStatus})`,
    );
  }
}

function assertNoExistingQuoteSubmission(invitation) {
  const dealerResponseStatus = normalizeStatus(invitation.dealerResponseStatus);

  if (invitation.quoteRecordId) {
    throw new Error("Quote has already been submitted for this invitation");
  }

  if (invitation.quoteSubmitted) {
    throw new Error("Quote has already been submitted for this invitation");
  }

  if (dealerResponseStatus === "quote submitted") {
    throw new Error("Quote has already been submitted for this invitation");
  }
}

async function buildInvitationPayload(requestDealerRecord, providedToken) {
  const invitation = normalizeRequestDealerRecord(requestDealerRecord);

  assertActiveToken({
    providedToken,
    storedToken: invitation.dealerQuoteToken,
    expiresAt: invitation.dealerQuoteTokenExpiresAt,
    label: "Dealer quote token",
  });

  assertInvitationEligible(invitation);

  let requestData = null;
  if (invitation.requestIdText) {
    requestData = await getRequestData(invitation.requestIdText);
  }

  let existingQuote = null;
  if (invitation.quoteRecordId) {
    const existingQuoteRecord = await getQuoteRecordById(
      invitation.quoteRecordId,
    );
    if (existingQuoteRecord) {
      existingQuote = normalizeQuoteRecord(existingQuoteRecord);
    }
  }

  return {
    invitation: {
      recordId: invitation.recordId,
      requestDealerId: invitation.requestDealerId,
      requestRecordId: invitation.requestRecordId,
      requestId: invitation.requestIdText,
      dealerRecordId: invitation.dealerRecordId,
      dealerId: invitation.dealerIdText,
      dealerName: invitation.dealerName,
      dealerMainContact: invitation.dealerMainContact,
      dealerMainEmail: invitation.dealerMainEmail,
      roundNumber: invitation.roundNumber,
      rfqSendStatus: invitation.rfqSendStatus,
      rfqSentAt: invitation.rfqSentAt,
      dealerResponseStatus: invitation.dealerResponseStatus,
      dealerQuoteToken: invitation.dealerQuoteToken,
      dealerQuoteTokenExpiresAt: invitation.dealerQuoteTokenExpiresAt,
      selectionStatus: invitation.selectionStatus,
      candidateStatus: invitation.candidateStatus,
      quoteSubmitted: invitation.quoteSubmitted,
      quoteRecordId: invitation.quoteRecordId,
      quoteId: invitation.quoteIdText,
    },

    requestContext: {
      purchaseType:
        requestData?.request?.purchaseTypeRequested ||
        invitation.purchaseTypeText ||
        "",
      buyerRegion:
        requestData?.buyer?.region || invitation.buyerRegionText || "",
      targetCloseTimeline:
        requestData?.request?.targetCloseTimeline ||
        invitation.targetCloseTimelineText ||
        "",
      creditScoreRange:
        requestData?.request?.creditScoreRange ||
        invitation.creditScoreRangeText ||
        "",
      creditScoreLineText:
        invitation.creditScoreLineText ||
        (requestData?.request?.creditScoreRange
          ? `Credit Score Range: ${requestData.request.creditScoreRange}`
          : ""),
      round1ResponseDeadlineAt:
        requestData?.request?.round1ResponseDeadlineAt || "",
    },

    requestedVehicle: {
      year: requestData?.vehicle?.year || "",
      make: requestData?.vehicle?.make || "",
      model: requestData?.vehicle?.model || "",
      trim: requestData?.vehicle?.trim || "",
      exteriorColorRequested:
        requestData?.vehicle?.exteriorColorRequested || "",
      vehicleSpec:
        requestData?.vehicle?.vehicleSpec || invitation.vehicleSpecText || "",
      accessories: requestData?.vehicle?.accessories || "",
      trimNotesPackages: requestData?.vehicle?.trimNotesPackages || "",
    },

    existingQuote,
  };
}

function normalizeSubmittedPayload(input = {}) {
  return {
    token: normalizeToken(input.token),

    offeredVehicle: {
      year: textValue(input.year),
      make: textValue(input.makeName),
      model: textValue(input.modelName),
      trim: textValue(input.trimName),
      exteriorColor: textValue(input.exteriorColor),
      accessories: textValue(input.accessories),
      trimNotesPackages: textValue(input.trimNotesPackages),
    },

    terms: {
      otdTotal: numericOrNull(input.otdTotal),
      aprPercent: numericOrNull(input.aprPercent),
      financeTermMonths: numericOrNull(input.financeTermMonths),
      downPaymentAssumed: numericOrNull(input.downPaymentAssumed),
      monthlyPaymentFinance: numericOrNull(input.monthlyPaymentFinance),
      leaseTermMonths: numericOrNull(input.leaseTermMonths),
      leaseMonthly: numericOrNull(input.leaseMonthly),
      leaseDas: numericOrNull(input.leaseDas),
      leaseMilesPerYear: numericOrNull(input.leaseMilesPerYear),
      dealerDeliveryTimeline: textValue(input.dealerDeliveryTimeline),
      quoteNotes: textValue(input.quoteNotes),
    },
  };
}

function buildQuoteFields({ invitationPayload, submission }) {
  const purchaseType = invitationPayload.requestContext.purchaseType;
  const invitation = invitationPayload.invitation;

  const baseFields = {
    Request: invitation.requestRecordId
      ? [invitation.requestRecordId]
      : undefined,
    Dealer: invitation.dealerRecordId ? [invitation.dealerRecordId] : undefined,
    RequestDealer: invitation.recordId ? [invitation.recordId] : undefined,
    "Quote Source": "Dealer Quote Form",
    "Round Number": invitation.roundNumber || "R1",
    "Purchase Type": purchaseType || undefined,

    Year: submission.offeredVehicle.year || undefined,
    Make: submission.offeredVehicle.make || undefined,
    Model: submission.offeredVehicle.model || undefined,
    Trim: submission.offeredVehicle.trim || undefined,
    "Exterior Color": submission.offeredVehicle.exteriorColor || undefined,
    Accessories: submission.offeredVehicle.accessories || undefined,
    "Trim Notes/Packages":
      submission.offeredVehicle.trimNotesPackages || undefined,

    "Compliance Status": "Compliant",
    "Is Compliant?": true,
    "Dealer Delivery Timeline":
      submission.terms.dealerDeliveryTimeline || undefined,
    "Quote Notes": submission.terms.quoteNotes || undefined,
  };

  if (purchaseType === "Lease") {
    return {
      ...baseFields,
      "Lease Term (months)": submission.terms.leaseTermMonths ?? undefined,
      "Lease Monthly": submission.terms.leaseMonthly ?? undefined,
      "Lease DAS": submission.terms.leaseDas ?? undefined,
      "Lease Miles/Year": submission.terms.leaseMilesPerYear ?? undefined,
    };
  }

  if (purchaseType === "Finance") {
    return {
      ...baseFields,
      "OTD Total": submission.terms.otdTotal ?? undefined,
      "APR %": submission.terms.aprPercent ?? undefined,
      "Finance Term (months)": submission.terms.financeTermMonths ?? undefined,
      "Down Payment Assumed": submission.terms.downPaymentAssumed ?? undefined,
      "Monthly Payment (Finance)":
        submission.terms.monthlyPaymentFinance ?? undefined,
    };
  }

  return {
    ...baseFields,
    "OTD Total": submission.terms.otdTotal ?? undefined,
  };
}

async function createQuote(fields) {
  return base.safeCreate(QUOTES_TABLE, cleanFields(fields));
}

async function patchRequestDealerAfterSubmit({
  requestDealerRecordId,
  quoteRecordId,
}) {
  await base.safeUpdate(REQUEST_DEALER_TABLE, requestDealerRecordId, {
    "Quote Submitted?": true,
    "Dealer Response Status": "Quote Submitted",
    Quote: quoteRecordId ? [quoteRecordId] : [],
  });
}

export async function getDealerQuoteInvitationByToken(token) {
  const normalizedToken = normalizeToken(token);
  const requestDealerRecord =
    await getRequestDealerRecordByQuoteToken(normalizedToken);

  return buildInvitationPayload(requestDealerRecord, normalizedToken);
}

export async function submitDealerQuote(input = {}) {
  const submission = normalizeSubmittedPayload(input);

  if (!submission.token) {
    throw new Error("Dealer quote token is required");
  }

  const invitationPayload = await getDealerQuoteInvitationByToken(
    submission.token,
  );

  assertNoExistingQuoteSubmission(invitationPayload.invitation);

  const quoteFields = buildQuoteFields({
    invitationPayload,
    submission,
  });

  const quoteRecord = await createQuote(quoteFields);

  await patchRequestDealerAfterSubmit({
    requestDealerRecordId: invitationPayload.invitation.recordId,
    quoteRecordId: quoteRecord.id,
  });

  const freshQuoteRecord = await getQuoteRecordById(quoteRecord.id);

  return {
    ok: true,
    mode: "created",
    invitation: invitationPayload.invitation,
    requestContext: invitationPayload.requestContext,
    requestedVehicle: invitationPayload.requestedVehicle,
    quote: freshQuoteRecord
      ? normalizeQuoteRecord(freshQuoteRecord)
      : { recordId: quoteRecord.id },
  };
}
