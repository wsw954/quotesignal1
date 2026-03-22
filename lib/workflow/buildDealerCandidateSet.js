// /lib/workflow/buildDealerCandidateSet.js

import { getRequestData } from "@/lib/airtable/requestData";
import { getAllDealers } from "@/lib/airtable/dealerData";

function normalizeUpper(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function normalizeTitle(value) {
  return String(value || "").trim();
}

function normalizePurchaseType(value) {
  return normalizeTitle(value);
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

  // Preserve your Phase 3 lenient behavior:
  // blank Makes Supported does not exclude yet.
  if (!dealer.makesSupported?.length) return true;

  return dealer.makesSupported.includes(make);
}

function matchesGeography(dealer, requestState, requestRegion) {
  const state = normalizeUpper(requestState);
  const region = normalizeTitle(requestRegion);

  const stateMatch =
    !state ||
    dealer.statesServed?.includes(state) ||
    normalizeUpper(dealer.state) === state;

  const regionMatch =
    !region ||
    dealer.regionsServed?.includes(region) ||
    normalizeTitle(dealer.region) === region;

  // Preserve your Phase 3 behavior:
  // if both exist, allow either state or region to qualify.
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

  const fitReasons = [];
  const exclusionReasons = [];

  const isActive = dealer.dealerStatus === "Active";
  if (isActive) {
    fitReasons.push("Dealer status is Active");
  } else {
    exclusionReasons.push(
      dealer.dealerStatus
        ? `Dealer status is ${dealer.dealerStatus}`
        : "Dealer is not Active",
    );
  }

  const geographyMatch = matchesGeography(dealer, requestState, requestRegion);
  if (geographyMatch) {
    fitReasons.push("Dealer matches request geography");
  } else {
    exclusionReasons.push("Dealer does not match request geography");
  }

  const makeMatch = matchesMake(dealer, requestMake);
  if (makeMatch) {
    if (requestMake) {
      fitReasons.push("Dealer supports requested make");
    }
  } else {
    exclusionReasons.push("Dealer does not support requested make");
  }

  const purchaseTypeMatch = matchesPurchaseType(dealer, purchaseType);
  if (purchaseTypeMatch) {
    if (purchaseType) {
      fitReasons.push(`Dealer accepts ${purchaseType}`);
    }
  } else {
    exclusionReasons.push(`Dealer does not accept ${purchaseType}`);
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
    isActive,
    geographyMatch,
    makeMatch,
    purchaseTypeMatch,
    isCandidate,
    isEligible: isCandidate,
    candidateStatus: isCandidate ? "Eligible" : "Ineligible",
    fitReasons,
    exclusionReasons,
    selectionReason: isCandidate ? fitReasons.join(" • ") : "",
    exclusionReason: !isCandidate ? exclusionReasons.join(" • ") : "",
    statusLabel: isCandidate ? "Candidate" : "Excluded",
    matchScore,
    rankScore: matchScore,
  };
}

export function sortDealerRows(a, b) {
  const scoreDiff = (b.matchScore || 0) - (a.matchScore || 0);
  if (scoreDiff !== 0) return scoreDiff;

  const tierA = Number.isFinite(a.priorityTier) ? a.priorityTier : 9999;
  const tierB = Number.isFinite(b.priorityTier) ? b.priorityTier : 9999;
  if (tierA !== tierB) return tierA - tierB;

  return String(a.dealerName || "").localeCompare(String(b.dealerName || ""));
}

async function resolveRequestData(requestInput) {
  if (!requestInput) {
    throw new Error(
      "buildDealerCandidateSet requires a request object or Request ID",
    );
  }

  if (typeof requestInput === "string") {
    return getRequestData(requestInput);
  }

  return requestInput;
}

export async function buildDealerCandidateSet(requestInput, options = {}) {
  const requestData = await resolveRequestData(requestInput);
  const dealers = Array.isArray(options.dealers)
    ? options.dealers
    : await getAllDealers();

  const evaluatedDealers = dealers.map((dealer) =>
    buildDealerEvaluation(dealer, requestData),
  );

  const candidates = evaluatedDealers
    .filter((dealer) => dealer.isCandidate)
    .sort(sortDealerRows)
    .map((dealer, index) => ({
      ...dealer,
      candidateRank: index + 1,
    }));

  const ineligible = evaluatedDealers
    .filter((dealer) => !dealer.isCandidate)
    .sort(sortDealerRows);

  return {
    requestId: requestData?.requestId || "",
    requestData,
    candidateCount: candidates.length,
    ineligibleCount: ineligible.length,
    allDealers: evaluatedDealers,
    candidates,
    ineligible,
  };
}
