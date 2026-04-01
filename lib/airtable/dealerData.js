// /lib/airtable/dealerData.js

import { createBase } from "./client";
import { getRequestData } from "./requestData";

const base = createBase();
const DEALERS_TABLE = "Dealers";

const DEALER_FIELDS = [
  "Dealer ID",
  "Dealer Name",
  "Main Contact",
  "Main Email",
  "Main Contact Phone",
  "City",
  "State",
  "Dealer Status",
  "Makes Supported",
  "Priority Tier",
  "Region",
  "Dealer Zip",
  "States Served",
  "Regions Served",
  "Accepts Finance?",
  "Accepts Lease?",
  "Accepts Cash?",
  "Notes",
  "Quotes",
  "RequestDealer",
  "Attachments",
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

function numberValue(value, fallback = null) {
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

function normalizeUpper(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function normalizeTitle(value) {
  return String(value || "").trim();
}

function normalizeDealerRecord(record) {
  const fields = record.fields || {};

  return {
    id: textValue(fields["Dealer ID"]) || record.id,
    recordId: record.id,
    dealerId: textValue(fields["Dealer ID"]),
    dealerName: textValue(fields["Dealer Name"]),
    mainContact: textValue(fields["Main Contact"]),
    mainEmail: textValue(fields["Main Email"]),
    mainContactPhone: textValue(fields["Main Contact Phone"]),
    city: textValue(fields["City"]),
    state: textValue(fields["State"]),
    region: textValue(fields["Region"]),
    dealerZip: textValue(fields["Dealer Zip"]),
    dealerStatus: textValue(fields["Dealer Status"]),
    priorityTier: numberValue(fields["Priority Tier"], 9999),

    makesSupported: arrayValue(fields["Makes Supported"]).map(normalizeTitle),
    statesServed: arrayValue(fields["States Served"]).map(normalizeUpper),
    regionsServed: arrayValue(fields["Regions Served"]).map(normalizeTitle),

    acceptsFinance: booleanValue(fields["Accepts Finance?"]),
    acceptsLease: booleanValue(fields["Accepts Lease?"]),
    acceptsCash: booleanValue(fields["Accepts Cash?"]),

    notes: textValue(fields["Notes"]),
    quoteRecordIds: arrayValue(fields["Quotes"]),
    requestDealerRecordIds: arrayValue(fields["RequestDealer"]),
    attachments: arrayValue(fields["Attachments"]),
  };
}

async function fetchAllDealers() {
  const records = await base.safeSelect(DEALERS_TABLE, {
    fields: DEALER_FIELDS,
  });

  return records.map(normalizeDealerRecord);
}

function normalizePurchaseType(purchaseType) {
  return normalizeTitle(purchaseType);
}

function matchesPurchaseType(dealer, purchaseType) {
  const normalized = normalizePurchaseType(purchaseType);

  if (!normalized) return true;
  if (normalized === "Finance") return dealer.acceptsFinance;
  if (normalized === "Lease") return dealer.acceptsLease;
  if (normalized === "Cash") return dealer.acceptsCash;

  return true;
}

function matchesMake(dealer, requestMake) {
  const make = normalizeTitle(requestMake);

  if (!make) return true;

  // Lenient Phase 3 behavior:
  // if Makes Supported is blank, do not exclude yet
  if (!dealer.makesSupported.length) return true;

  return dealer.makesSupported.includes(make);
}

function matchesGeography(dealer, requestState, requestRegion) {
  const state = normalizeUpper(requestState);
  const region = normalizeTitle(requestRegion);

  const stateMatch =
    !state ||
    dealer.statesServed.includes(state) ||
    normalizeUpper(dealer.state) === state;

  const regionMatch =
    !region ||
    dealer.regionsServed.includes(region) ||
    normalizeTitle(dealer.region) === region;

  // Phase 3 logic:
  // if both state and region are present, allow either one to qualify
  if (state && region) return stateMatch || regionMatch;
  if (state) return stateMatch;
  if (region) return regionMatch;

  return true;
}

function buildDealerEvaluation(dealer, requestData) {
  const requestState = requestData?.buyer?.state || "";
  const requestRegion = requestData?.buyer?.region || "";
  const requestMake = requestData?.vehicle?.make || "";
  const purchaseType = requestData?.request?.purchaseTypeRequested || "";

  const exclusionReasons = [];
  const fitReasons = [];

  const isActive =
    dealer.dealerStatus === "Active" || dealer.dealerStatus === "New";
  if (!isActive) {
    exclusionReasons.push(
      dealer.dealerStatus
        ? `Dealer status is ${dealer.dealerStatus}`
        : "Dealer is not Active",
    );
  } else {
    fitReasons.push("Dealer status is Active");
  }

  const geographyMatch = matchesGeography(dealer, requestState, requestRegion);
  if (!geographyMatch) {
    exclusionReasons.push("Dealer does not match request geography");
  } else {
    fitReasons.push("Dealer matches request geography");
  }

  const makeMatch = matchesMake(dealer, requestMake);
  if (!makeMatch) {
    exclusionReasons.push("Dealer does not support requested make");
  } else if (requestMake) {
    fitReasons.push("Dealer supports requested make");
  }

  const purchaseTypeMatch = matchesPurchaseType(dealer, purchaseType);
  if (!purchaseTypeMatch) {
    exclusionReasons.push(`Dealer does not accept ${purchaseType}`);
  } else if (purchaseType) {
    fitReasons.push(`Dealer accepts ${purchaseType}`);
  }

  const isCandidate =
    isActive && geographyMatch && makeMatch && purchaseTypeMatch;

  let matchScore = 0;
  if (isActive) matchScore += 40;
  if (geographyMatch) matchScore += 25;
  if (makeMatch) matchScore += 20;
  if (purchaseTypeMatch) matchScore += 15;

  return {
    ...dealer,
    isCandidate,
    matchScore,
    fitReasons,
    exclusionReasons,
    selectionReason: isCandidate ? fitReasons.join(" • ") : "",
    exclusionReason: !isCandidate ? exclusionReasons.join(" • ") : "",
    statusLabel: isCandidate ? "Candidate" : "Excluded",
  };
}

function sortCandidates(a, b) {
  const scoreDiff = (b.matchScore || 0) - (a.matchScore || 0);
  if (scoreDiff !== 0) return scoreDiff;

  const tierA = Number.isFinite(a.priorityTier) ? a.priorityTier : 9999;
  const tierB = Number.isFinite(b.priorityTier) ? b.priorityTier : 9999;
  if (tierA !== tierB) return tierA - tierB;

  return (a.dealerName || "").localeCompare(b.dealerName || "");
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

export async function getAllDealers() {
  return fetchAllDealers();
}

export async function getDealerSelectionPreview(requestInput) {
  const requestData = await resolveRequestData(requestInput);
  const dealers = await fetchAllDealers();

  const evaluated = dealers.map((dealer) =>
    buildDealerEvaluation(dealer, requestData),
  );

  const candidates = evaluated
    .filter((dealer) => dealer.isCandidate)
    .sort(sortCandidates);
  const excluded = evaluated
    .filter((dealer) => !dealer.isCandidate)
    .sort(sortCandidates);

  // Keep selected as placeholder for Phase 3.
  // Real selected-vs-excluded logic belongs to Phase 4.
  return {
    requestId: requestData?.requestId || "",
    candidateCount: candidates.length,
    selectedCount: 0,
    excludedCount: excluded.length,

    candidates,
    selected: [],
    excluded,
  };
}

export async function getDealerCandidateRows(requestInput) {
  const preview = await getDealerSelectionPreview(requestInput);
  return preview.candidates;
}
