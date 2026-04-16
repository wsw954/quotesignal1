// /lib/review/dealerViewModel.js

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

function buildCurrencyLabel(value) {
  const numeric = numberValue(value);
  if (numeric == null) return "";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(numeric);
}

function buildDeltaFromWinnerLabel(delta) {
  const numeric = numberValue(delta);
  if (numeric == null) return "";

  if (numeric === 0) return "Selected quote";

  const abs = Math.abs(numeric);
  const formatted = buildCurrencyLabel(abs);

  if (numeric > 0) {
    return `${formatted} above selected quote`;
  }

  return `${formatted} below selected quote`;
}

function buildDealerWarningList(warnings = []) {
  return filterWarningsByAudience(warnings, "dealer");
}

function buildRequestSection(dataset) {
  const request = dataset?.request || {};

  return {
    requestId: textValue(request?.requestId),
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
    },

    purchaseType: textValue(request?.request?.purchaseTypeRequested),
  };
}

function buildAccessSection(dataset, mode = "post_close") {
  const access = dataset?.access || {};

  return {
    dealerReviewReleased: booleanValue(access?.dealerReviewReleased),
    tokenValid: true,
    releaseMode: mode,
    quoteSubmitted: booleanValue(access?.quoteSubmitted),
    requestDealerId: textValue(access?.requestDealerId),
    dealerQuoteRecordId: textValue(access?.dealerQuoteRecordId),
  };
}

function resolveOwnQuote(dataset) {
  const dealerQuoteRecordId = textValue(dataset?.access?.dealerQuoteRecordId);
  const requestDealerId = textValue(dataset?.access?.requestDealerId);
  const rankedQuotes = Array.isArray(dataset?.quotes?.ranked)
    ? dataset.quotes.ranked
    : [];
  const allQuotes = Array.isArray(dataset?.quotes?.all)
    ? dataset.quotes.all
    : [];

  if (dealerQuoteRecordId) {
    const rankedMatch =
      rankedQuotes.find(
        (row) => textValue(row?.recordId) === dealerQuoteRecordId,
      ) || null;

    if (rankedMatch) return rankedMatch;

    const allMatch =
      allQuotes.find(
        (row) => textValue(row?.recordId) === dealerQuoteRecordId,
      ) || null;

    if (allMatch) return allMatch;
  }

  if (requestDealerId) {
    const rankedMatch =
      rankedQuotes.find(
        (row) =>
          textValue(row?.requestContext?.requestDealerRecordId) ===
          requestDealerId,
      ) || null;

    if (rankedMatch) return rankedMatch;

    const allMatch =
      allQuotes.find(
        (row) =>
          textValue(row?.requestContext?.requestDealerRecordId) ===
          requestDealerId,
      ) || null;

    if (allMatch) return allMatch;
  }

  return null;
}

function buildSummarySection(dataset, ownQuote) {
  const rankedQuotes = Array.isArray(dataset?.quotes?.ranked)
    ? dataset.quotes.ranked
    : [];
  const selectedQuote = dataset?.selected?.selectedQuote || null;

  const ownRank = numberValue(ownQuote?.ranking?.rank, null);
  const totalRanked = rankedQuotes.length;
  const dealerWasWinner = booleanValue(ownQuote?.market?.isSelectedWinner);

  let dealerCompetitiveBand = "";
  const dealerStats = Array.isArray(dataset?.dealerStats)
    ? dataset.dealerStats
    : [];

  const ownDealerStats =
    dealerStats.find(
      (row) => textValue(row?.recordId) === textValue(ownQuote?.recordId),
    ) ||
    dealerStats.find(
      (row) => textValue(row?.quoteId) === textValue(ownQuote?.quoteId),
    ) ||
    null;

  if (ownDealerStats) {
    dealerCompetitiveBand = textValue(ownDealerStats?.competitiveBand);
  }

  return {
    totalQuotesConsidered: totalRanked,
    dealerFinalRank: ownRank,
    dealerCompetitiveBand,
    dealerWasWinner,
    quoteLossReason: textValue(ownQuote?.compliance?.quoteLossReason),
    selectedQuoteId: textValue(selectedQuote?.quoteId),
  };
}

function buildOwnQuoteSection(dataset, ownQuote) {
  if (!ownQuote) {
    return {
      quoteId: "",
      scoring: {
        score: null,
        scoreLabel: "",
        scoreDeltaFromWinner: null,
        scoreDeltaLabel: "",
      },
      compliance: {
        status: "",
        isCompliant: false,
      },
      offeredVehicle: {
        year: "",
        make: "",
        model: "",
        trim: "",
        exteriorColor: "",
      },
      commercialTerms: {
        purchaseType: "",
        otdTotal: null,
        aprPercent: null,
        financeTermMonths: null,
        downPaymentAssumed: null,
        monthlyPaymentFinance: null,
        financeAllInCost: null,
        leaseTermMonths: null,
        leaseMonthly: null,
        leaseDas: null,
        leaseMilesPerYear: null,
        leaseAllInCost: null,
      },
      delivery: {
        dealerDeliveryTimeline: "",
      },
      notes: {
        quoteNotes: "",
      },
    };
  }

  const selectedQuote = dataset?.selected?.selectedQuote || null;
  const ownScore = numberValue(ownQuote?.scoring?.effectiveScore, null);
  const selectedScore = numberValue(
    selectedQuote?.scoring?.effectiveScore,
    null,
  );

  const scoreDeltaFromWinner =
    ownScore != null && selectedScore != null ? ownScore - selectedScore : null;

  return {
    quoteId: textValue(ownQuote?.quoteId),

    scoring: {
      score: ownScore,
      scoreLabel: textValue(ownQuote?.scoring?.scoreLabel),
      scoreDeltaFromWinner,
      scoreDeltaLabel: buildDeltaFromWinnerLabel(scoreDeltaFromWinner),
    },

    compliance: {
      status: textValue(ownQuote?.compliance?.status),
      isCompliant: booleanValue(ownQuote?.compliance?.isCompliant),
    },

    offeredVehicle: {
      year: textValue(ownQuote?.offeredVehicle?.year),
      make: textValue(ownQuote?.offeredVehicle?.make),
      model: textValue(ownQuote?.offeredVehicle?.model),
      trim: textValue(ownQuote?.offeredVehicle?.trim),
      exteriorColor: textValue(ownQuote?.offeredVehicle?.exteriorColor),
      accessories: textValue(ownQuote?.offeredVehicle?.accessories),
      trimNotesPackages: textValue(ownQuote?.offeredVehicle?.trimNotesPackages),
    },

    commercialTerms: {
      purchaseType: textValue(ownQuote?.commercialTerms?.purchaseType),
      otdTotal: numberValue(ownQuote?.commercialTerms?.otdTotal, null),
      aprPercent: numberValue(ownQuote?.commercialTerms?.aprPercent, null),
      financeTermMonths: numberValue(
        ownQuote?.commercialTerms?.financeTermMonths,
        null,
      ),
      downPaymentAssumed: numberValue(
        ownQuote?.commercialTerms?.downPaymentAssumed,
        null,
      ),
      monthlyPaymentFinance: numberValue(
        ownQuote?.commercialTerms?.monthlyPaymentFinance,
        null,
      ),
      financeAllInCost: numberValue(
        ownQuote?.commercialTerms?.financeAllInCost,
        null,
      ),
      leaseTermMonths: numberValue(
        ownQuote?.commercialTerms?.leaseTermMonths,
        null,
      ),
      leaseMonthly: numberValue(ownQuote?.commercialTerms?.leaseMonthly, null),
      leaseDas: numberValue(ownQuote?.commercialTerms?.leaseDas, null),
      leaseMilesPerYear: numberValue(
        ownQuote?.commercialTerms?.leaseMilesPerYear,
        null,
      ),
      leaseAllInCost: numberValue(
        ownQuote?.commercialTerms?.leaseAllInCost,
        null,
      ),
    },

    delivery: {
      dealerDeliveryTimeline: textValue(ownQuote?.delivery?.raw),
    },

    notes: {
      quoteNotes: textValue(ownQuote?.notes?.quoteNotes),
    },
  };
}

function buildWinnerSnapshot(dataset) {
  const selectedQuote = dataset?.selected?.selectedQuote || null;
  const bestScoreQuote = dataset?.selected?.bestScoreQuote || null;

  if (!selectedQuote) {
    return {
      wasSelectedQuoteTopScored: false,
      score: null,
      scoreLabel: "",
      complianceStatus: "",
      deliveryTimeline: "",
    };
  }

  return {
    wasSelectedQuoteTopScored:
      textValue(selectedQuote?.quoteId) === textValue(bestScoreQuote?.quoteId),
    score: numberValue(selectedQuote?.scoring?.effectiveScore, null),
    scoreLabel: textValue(selectedQuote?.scoring?.scoreLabel),
    complianceStatus: textValue(selectedQuote?.compliance?.status),
    deliveryTimeline: textValue(selectedQuote?.delivery?.raw),
  };
}

function buildMarketContext(dataset) {
  const distribution = dataset?.summary?.scoreDistribution || {};

  return {
    winnerSnapshot: buildWinnerSnapshot(dataset),

    distribution: {
      lowestScore: numberValue(distribution?.lowestScore, null),
      medianScore: numberValue(distribution?.medianScore, null),
      highestScore: numberValue(distribution?.highestScore, null),

      lowestScoreLabel: textValue(distribution?.lowestScoreLabel),
      medianScoreLabel: textValue(distribution?.medianScoreLabel),
      highestScoreLabel: textValue(distribution?.highestScoreLabel),
    },
  };
}

function buildScoreBandLabel(score) {
  const numeric = numberValue(score, null);
  if (numeric == null) return "";

  const lower = Math.floor(numeric / 250) * 250;
  const upper = lower + 250;

  return `${buildCurrencyLabel(lower)} – ${buildCurrencyLabel(upper)}`;
}

function buildDeliveryTimelineBand(row) {
  const bucket = textValue(row?.delivery?.bucket);

  if (bucket === "immediate" || bucket === "fast") return "Fast";
  if (bucket === "moderate") return "Moderate";
  if (bucket === "slow") return "Slow";
  return "Mixed";
}

function buildPositionBand(row) {
  const rank = numberValue(row?.ranking?.rank, null);

  if (rank === 1) return "Leading";
  if (rank != null && rank <= 3) return "Competitive";
  return "Mid Pack";
}

function buildCompetitorSnapshot(dataset, ownQuote) {
  const rankedQuotes = Array.isArray(dataset?.quotes?.ranked)
    ? dataset.quotes.ranked
    : [];

  const competitors = rankedQuotes.filter(
    (row) => textValue(row?.recordId) !== textValue(ownQuote?.recordId),
  );

  return competitors.slice(0, 3).map((row) => ({
    positionBand: buildPositionBand(row),
    scoreBandLabel: buildScoreBandLabel(row?.scoring?.effectiveScore),
    complianceStatus: textValue(row?.compliance?.status),
    deliveryTimelineBand: buildDeliveryTimelineBand(row),
  }));
}

export function buildDealerViewModel(dataset, warnings = [], options = {}) {
  if (!dataset || typeof dataset !== "object") {
    throw new Error("buildDealerViewModel requires a comparison dataset");
  }

  const mode = textValue(options?.mode) || "post_close";
  const dealerWarnings = buildDealerWarningList(warnings);
  const groupedWarnings = groupWarningsByLevel(dealerWarnings);

  const ownQuote = resolveOwnQuote(dataset);

  return {
    request: buildRequestSection(dataset),
    access: buildAccessSection(dataset, mode),
    summary: buildSummarySection(dataset, ownQuote),
    ownQuote: buildOwnQuoteSection(dataset, ownQuote),
    marketContext: buildMarketContext(dataset),
    competitorSnapshot: buildCompetitorSnapshot(dataset, ownQuote),

    warnings: dealerWarnings,
    warningGroups: groupedWarnings,

    meta: {
      generatedAt: new Date().toISOString(),
      source: "dealerViewModel",
      visibilityPolicy: "post_close_anonymized",
      currentRound: normalizeRoundNumber(dataset?.currentRound || "R1"),
      mode,
    },
  };
}
