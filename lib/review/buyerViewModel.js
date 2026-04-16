// /lib/review/buyerViewModel.js

import { filterWarningsByAudience, groupWarningsByLevel } from "./warnings";

function textValue(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function numberValue(value, fallback = null) {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function booleanValue(value) {
  return value === true;
}

function normalizeRoundNumber(value) {
  const round = String(value || "R1")
    .trim()
    .toUpperCase();

  return round === "R2" ? "R2" : "R1";
}

function buildBuyerWarningList(warnings = []) {
  return filterWarningsByAudience(warnings, "buyer");
}

function buildReviewWindow(dataset) {
  const request = dataset?.request || {};
  const lifecycle = dataset?.lifecycle || {};

  const buyerReviewSentAt = textValue(request?.request?.buyerReviewSentAt);
  const buyerReviewExpiresAt = textValue(
    request?.request?.buyerReviewExpiresAt,
  );
  const now = textValue(lifecycle?.timestamps?.now);

  let isExpired = false;

  if (buyerReviewExpiresAt && now) {
    const expiresAtMs = Date.parse(buyerReviewExpiresAt);
    const nowMs = Date.parse(now);

    if (Number.isFinite(expiresAtMs) && Number.isFinite(nowMs)) {
      isExpired = nowMs >= expiresAtMs;
    }
  }

  return {
    reviewReady: dataset?.summary?.shouldEnableBuyerReview === true,
    buyerReviewSentAt,
    buyerReviewExpiresAt,
    isExpired,
  };
}

function buildRequestSection(dataset) {
  const request = dataset?.request || {};

  return {
    requestId: textValue(request?.requestId),
    emailSubjectTag: textValue(request?.emailSubjectTag),
    buyerName: textValue(request?.buyer?.fullName),

    purchaseType: textValue(request?.request?.purchaseTypeRequested),
    currentRound: normalizeRoundNumber(
      request?.workflow?.roundNumber || dataset?.currentRound || "R1",
    ),
    requestStatus: textValue(request?.workflow?.requestStatus),

    vehicle: {
      year: textValue(request?.vehicle?.year),
      make: textValue(request?.vehicle?.make),
      model: textValue(request?.vehicle?.model),
      trim: textValue(request?.vehicle?.trim),
      exteriorColorRequested: textValue(
        request?.vehicle?.exteriorColorRequested,
      ),
      vehicleSpec: textValue(request?.vehicle?.vehicleSpec),
      accessories: textValue(request?.vehicle?.accessories),
      trimNotesPackages: textValue(request?.vehicle?.trimNotesPackages),
    },
  };
}

function buildSummarySection(dataset) {
  const summary = dataset?.summary || {};
  const bestScore = numberValue(summary?.bestScore, null);

  return {
    totalQuotes: numberValue(summary?.totalQuotesLoaded, 0),
    totalQuotesInRound: numberValue(summary?.totalQuotesInRound, 0),
    includedQuotes: numberValue(summary?.includedQuotes, 0),
    excludedQuotes: numberValue(summary?.excludedQuotes, 0),
    rankedQuotes: numberValue(summary?.rankedQuotes, 0),

    hasQuotes: booleanValue(summary?.hasQuotes),
    hasIncludedQuotes: booleanValue(summary?.hasIncludedQuotes),
    hasRankedQuotes: booleanValue(summary?.hasRankedQuotes),
    hasBuyerChoice: booleanValue(summary?.hasBuyerChoice),

    bestScore,
    bestScoreLabel: textValue(summary?.bestScoreLabel),
    scoreUnit: "all-in-cost",
  };
}

function buildQuoteFlags(row) {
  return {
    includedInBuyerReview: booleanValue(row?.flags?.isIncludedInBuyerReview),
    vehicleMatch: booleanValue(
      row?.vehicleComparison?.coreVehicleMatch !== false,
    ),
    exactVehicleMatch: booleanValue(
      row?.vehicleComparison?.exactVehicleMatch === true,
    ),
    hasMaterialVehicleMismatch: booleanValue(
      row?.flags?.hasMaterialVehicleMismatch,
    ),
    hasExceptions: booleanValue(row?.flags?.hasExceptions),
    isBuyerChoice: booleanValue(row?.flags?.isBuyerChoice),
    isBestScore: booleanValue(row?.market?.isBestScore),
    isSelectedWinner: booleanValue(row?.market?.isSelectedWinner),
  };
}

function buildMaskedQuoteLabel(rank) {
  const safeRank = numberValue(rank, null);
  if (safeRank == null) return "Quote";
  return `Quote ${safeRank}`;
}

function buildQuoteItem(row) {
  const effectiveScore = numberValue(row?.scoring?.effectiveScore, null);
  const scoreDeltaFromBest = numberValue(
    row?.ranking?.scoreDeltaFromBest,
    null,
  );
  const rank = numberValue(row?.ranking?.rank, null);

  return {
    quoteId: textValue(row?.quoteId),
    rank,
    displayLabel: buildMaskedQuoteLabel(rank),
    isWinningCandidate: booleanValue(row?.market?.isBestScore),
    isBuyerChoice: booleanValue(row?.flags?.isBuyerChoice),
    isSelectedWinner: booleanValue(row?.market?.isSelectedWinner),

    dealer: {
      displayName: buildMaskedQuoteLabel(rank),
    },

    scoring: {
      score: effectiveScore,
      scoreLabel: textValue(row?.scoring?.scoreLabel),
      primaryPriceLabel: textValue(row?.scoring?.primaryPriceLabel),
      scoreDeltaFromBest,
      scoreDeltaLabel: textValue(row?.ranking?.scoreDeltaLabel),
    },

    compliance: {
      status: textValue(row?.compliance?.status),
      isCompliant: booleanValue(row?.compliance?.isCompliant),
    },

    offeredVehicle: {
      year: textValue(row?.offeredVehicle?.year),
      make: textValue(row?.offeredVehicle?.make),
      model: textValue(row?.offeredVehicle?.model),
      trim: textValue(row?.offeredVehicle?.trim),
      exteriorColor: textValue(row?.offeredVehicle?.exteriorColor),
      accessories: textValue(row?.offeredVehicle?.accessories),
      trimNotesPackages: textValue(row?.offeredVehicle?.trimNotesPackages),
    },

    commercialTerms: {
      purchaseType: textValue(row?.commercialTerms?.purchaseType),
      otdTotal: numberValue(row?.commercialTerms?.otdTotal, null),
      aprPercent: numberValue(row?.commercialTerms?.aprPercent, null),
      financeTermMonths: numberValue(
        row?.commercialTerms?.financeTermMonths,
        null,
      ),
      downPaymentAssumed: numberValue(
        row?.commercialTerms?.downPaymentAssumed,
        null,
      ),
      monthlyPaymentFinance: numberValue(
        row?.commercialTerms?.monthlyPaymentFinance,
        null,
      ),
      financeAllInCost: numberValue(
        row?.commercialTerms?.financeAllInCost,
        null,
      ),

      leaseTermMonths: numberValue(row?.commercialTerms?.leaseTermMonths, null),
      leaseMonthly: numberValue(row?.commercialTerms?.leaseMonthly, null),
      leaseDas: numberValue(row?.commercialTerms?.leaseDas, null),
      leaseMilesPerYear: numberValue(
        row?.commercialTerms?.leaseMilesPerYear,
        null,
      ),
      leaseAllInCost: numberValue(row?.commercialTerms?.leaseAllInCost, null),
    },

    delivery: {
      dealerDeliveryTimeline: textValue(row?.delivery?.raw),
      deliveryBucket: textValue(row?.delivery?.bucket),
      deliveryShortLabel: textValue(row?.delivery?.shortLabel),
    },

    notes: {
      quoteNotes: textValue(row?.notes?.quoteNotes),
    },

    flags: buildQuoteFlags(row),
  };
}

function buildQuotesSection(dataset) {
  const rankedQuotes = Array.isArray(dataset?.quotes?.ranked)
    ? dataset.quotes.ranked
    : [];

  return rankedQuotes.map(buildQuoteItem);
}

function buildSelectedSection(dataset) {
  const selectedQuote = dataset?.selected?.selectedQuote;

  if (!selectedQuote) {
    return {
      selectedQuoteId: "",
      selectedQuoteRank: null,
      selectedQuoteScore: null,
      selectedQuoteScoreLabel: "",
      selectedOfferLabel: "",
    };
  }

  const rank = numberValue(selectedQuote?.ranking?.rank, null);

  return {
    selectedQuoteId: textValue(selectedQuote?.quoteId),
    selectedQuoteRank: rank,
    selectedQuoteScore: numberValue(
      selectedQuote?.scoring?.effectiveScore,
      null,
    ),
    selectedQuoteScoreLabel: textValue(selectedQuote?.scoring?.scoreLabel),
    selectedOfferLabel: buildMaskedQuoteLabel(rank),
  };
}

export function buildBuyerViewModel(dataset, warnings = []) {
  if (!dataset || typeof dataset !== "object") {
    throw new Error("buildBuyerViewModel requires a comparison dataset");
  }

  const buyerWarnings = buildBuyerWarningList(warnings);
  const groupedWarnings = groupWarningsByLevel(buyerWarnings);

  return {
    request: buildRequestSection(dataset),
    reviewWindow: buildReviewWindow(dataset),
    summary: buildSummarySection(dataset),
    selected: buildSelectedSection(dataset),

    warnings: buyerWarnings,
    warningGroups: groupedWarnings,

    quotes: buildQuotesSection(dataset),

    meta: {
      generatedAt: new Date().toISOString(),
      source: "buyerViewModel",
      currentRound: normalizeRoundNumber(dataset?.currentRound || "R1"),
      mode: textValue(dataset?.mode) || "internal",
      dealerIdentityMasked: true,
    },
  };
}
