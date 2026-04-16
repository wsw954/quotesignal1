// /lib/review/buildComparisonDataset.js

import { normalizeQuotes } from "./normalizeQuote";

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

function median(numbers = []) {
  if (!numbers.length) return null;

  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }

  return (sorted[mid - 1] + sorted[mid]) / 2;
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

function buildDeltaLabel(delta) {
  const numeric = numberValue(delta);
  if (numeric == null) return "";

  if (numeric === 0) return "Best value";

  const abs = Math.abs(numeric);
  const formatted = buildCurrencyLabel(abs);

  if (numeric > 0) {
    return `${formatted} above best`;
  }

  return `${formatted} below best`;
}

function matchesCurrentRound(quote, currentRound) {
  return textValue(quote?.requestContext?.roundNumber) === currentRound;
}

function hasIncludedFlag(quote, mode) {
  if (mode === "buyer") {
    return quote?.flags?.isIncludedInBuyerReview === true;
  }

  if (mode === "dealer") {
    return quote?.flags?.isIncludedInDealerReview === true;
  }

  return false;
}

function shouldTreatAsIncludedForCurrentBuild(quote) {
  if (!quote) return false;
  if (quote?.flags?.isBuyerChoice) return true;
  if (quote?.flags?.isIncludedInBuyerReview) return true;
  if (quote?.flags?.isIncludedInDealerReview) return true;
  return true;
}

function resolveInclusionState(quote) {
  const explicitlyIncludedBuyer =
    quote?.flags?.isIncludedInBuyerReview === true;
  const explicitlyIncludedDealer =
    quote?.flags?.isIncludedInDealerReview === true;
  const isBuyerChoice = quote?.flags?.isBuyerChoice === true;

  const includedForComparison =
    shouldTreatAsIncludedForCurrentBuild(quote) === true;

  return {
    explicitlyIncludedBuyer,
    explicitlyIncludedDealer,
    isBuyerChoice,
    includedForComparison,
  };
}

function compareQuotesForRanking(a, b) {
  const scoreA = numberValue(
    a?.scoring?.effectiveScore,
    Number.POSITIVE_INFINITY,
  );
  const scoreB = numberValue(
    b?.scoring?.effectiveScore,
    Number.POSITIVE_INFINITY,
  );

  if (scoreA !== scoreB) return scoreA - scoreB;

  const deliveryRankA = numberValue(
    a?.delivery?.rank,
    Number.POSITIVE_INFINITY,
  );
  const deliveryRankB = numberValue(
    b?.delivery?.rank,
    Number.POSITIVE_INFINITY,
  );

  if (deliveryRankA !== deliveryRankB) return deliveryRankA - deliveryRankB;

  const receivedA =
    Date.parse(a?.timestamps?.receivedTime || "") || Number.POSITIVE_INFINITY;
  const receivedB =
    Date.parse(b?.timestamps?.receivedTime || "") || Number.POSITIVE_INFINITY;

  if (receivedA !== receivedB) return receivedA - receivedB;

  return textValue(a?.quoteId).localeCompare(textValue(b?.quoteId));
}

function buildRequestSummary(requestData, lifecycle) {
  return {
    requestId: textValue(requestData?.requestId),
    recordId: textValue(requestData?.recordId),
    emailSubjectTag: textValue(requestData?.emailSubjectTag),

    buyer: {
      firstName: textValue(requestData?.buyer?.firstName),
      lastName: textValue(requestData?.buyer?.lastName),
      fullName: textValue(requestData?.buyer?.fullName),
      email: textValue(requestData?.buyer?.email),
      phone: textValue(requestData?.buyer?.phone),
      state: textValue(requestData?.buyer?.state),
      region: textValue(requestData?.buyer?.region),
      zip: textValue(requestData?.buyer?.zip),
    },

    request: {
      purchaseTypeRequested: textValue(
        requestData?.request?.purchaseTypeRequested,
      ),
      creditScoreRange: textValue(requestData?.request?.creditScoreRange),
      priority: textValue(requestData?.request?.priority),
      targetCloseTimeline: textValue(requestData?.request?.targetCloseTimeline),
      buyerReviewSentAt: textValue(requestData?.request?.buyerReviewSentAt),
      buyerReviewExpiresAt: textValue(
        requestData?.request?.buyerReviewExpiresAt,
      ),
      round1ResponseDeadlineAt: textValue(
        requestData?.request?.round1ResponseDeadlineAt,
      ),
    },

    vehicle: {
      year: textValue(requestData?.vehicle?.year),
      make: textValue(requestData?.vehicle?.make),
      model: textValue(requestData?.vehicle?.model),
      trim: textValue(requestData?.vehicle?.trim),
      exteriorColorRequested: textValue(
        requestData?.vehicle?.exteriorColorRequested,
      ),
      vehicleSpec: textValue(requestData?.vehicle?.vehicleSpec),
      accessories: textValue(requestData?.vehicle?.accessories),
      trimNotesPackages: textValue(requestData?.vehicle?.trimNotesPackages),
    },

    workflow: {
      requestStatus: textValue(requestData?.workflow?.requestStatus),
      dealerSelectionStatus: textValue(
        requestData?.workflow?.dealerSelectionStatus,
      ),
      roundNumber: normalizeRoundNumber(
        requestData?.workflow?.roundNumber || lifecycle?.currentRound || "R1",
      ),
      reviewReady: booleanValue(requestData?.workflow?.reviewReady),
      requestClosedAt: textValue(requestData?.workflow?.requestClosedAt),
      round1ClosedAt: textValue(requestData?.workflow?.round1ClosedAt),
      buyerDecisionAt: textValue(requestData?.workflow?.buyerDecisionAt),
      round2Triggered: booleanValue(requestData?.workflow?.round2Triggered),
    },

    metrics: {
      quotesReceived: numberValue(requestData?.metrics?.quotesReceived, 0),
      compliantQuotes: numberValue(requestData?.metrics?.compliantQuotes, 0),
      bestScoreCompliant: numberValue(
        requestData?.metrics?.bestScoreCompliant,
        null,
      ),
      targetDealerCount: numberValue(
        requestData?.metrics?.targetDealerCount,
        0,
      ),
      selectedDealerCount: numberValue(
        requestData?.metrics?.selectedDealerCount,
        0,
      ),
      quotedDealerCount: numberValue(
        requestData?.metrics?.quotedDealerCount,
        0,
      ),
    },
  };
}

function buildQuoteDatasetRow(quote, index, bestScore, selectedQuoteId) {
  const effectiveScore = numberValue(quote?.scoring?.effectiveScore);
  const scoreDeltaFromBest =
    effectiveScore != null && bestScore != null
      ? effectiveScore - bestScore
      : null;

  const isSelectedWinner =
    selectedQuoteId && textValue(quote?.quoteId) === selectedQuoteId;

  return {
    ...quote,

    ranking: {
      rank: index + 1,
      rankLabel: `#${index + 1}`,
      bestScore,
      bestScoreLabel: buildCurrencyLabel(bestScore),
      scoreDeltaFromBest,
      scoreDeltaLabel: buildDeltaLabel(scoreDeltaFromBest),
    },

    market: {
      isBestScore: index === 0,
      isSelectedWinner,
    },
  };
}

function buildDistribution(rows) {
  const scores = rows
    .map((row) => numberValue(row?.scoring?.effectiveScore))
    .filter((value) => value != null)
    .sort((a, b) => a - b);

  if (!scores.length) {
    return {
      lowestScore: null,
      medianScore: null,
      highestScore: null,
      lowestScoreLabel: "",
      medianScoreLabel: "",
      highestScoreLabel: "",
    };
  }

  const lowestScore = scores[0];
  const highestScore = scores[scores.length - 1];
  const medianScore = median(scores);

  return {
    lowestScore,
    medianScore,
    highestScore,
    lowestScoreLabel: buildCurrencyLabel(lowestScore),
    medianScoreLabel: buildCurrencyLabel(medianScore),
    highestScoreLabel: buildCurrencyLabel(highestScore),
  };
}

function classifyCompetitiveBand(rank, total) {
  if (!total || !rank) return "";

  if (rank === 1) return "Leading";
  if (rank <= Math.max(2, Math.ceil(total * 0.25))) return "Top Tier";
  if (rank <= Math.max(3, Math.ceil(total * 0.6))) return "Competitive";
  return "Non-competitive";
}

function resolveSelectedQuoteId(requestData, rows) {
  const buyerChoiceIds = Array.isArray(requestData?.links?.buyerChoiceQuoteIds)
    ? requestData.links.buyerChoiceQuoteIds
    : [];

  if (buyerChoiceIds.length) {
    const row = rows.find((item) => buyerChoiceIds.includes(item.recordId));
    if (row) return textValue(row.quoteId);
  }

  const flagged = rows.find((item) => item?.flags?.isBuyerChoice === true);
  return flagged ? textValue(flagged.quoteId) : "";
}

function buildInclusionBuckets(normalizedQuotes, currentRound) {
  const inRound = normalizedQuotes.filter((quote) =>
    matchesCurrentRound(quote, currentRound),
  );

  const included = [];
  const excluded = [];

  for (const quote of inRound) {
    const inclusion = resolveInclusionState(quote);

    const row = {
      ...quote,
      inclusion,
    };

    if (inclusion.includedForComparison) {
      included.push(row);
    } else {
      excluded.push(row);
    }
  }

  return {
    inRound,
    included,
    excluded,
  };
}

function buildSummary({
  requestData,
  lifecycle,
  currentRound,
  normalizedQuotes,
  includedRows,
  rankedRows,
  selectedQuoteId,
}) {
  const rankedScores = rankedRows
    .map((row) => numberValue(row?.scoring?.effectiveScore))
    .filter((value) => value != null);

  const bestScore = rankedScores.length ? rankedScores[0] : null;

  const winnerRow = selectedQuoteId
    ? rankedRows.find((row) => textValue(row?.quoteId) === selectedQuoteId) ||
      null
    : null;

  return {
    currentRound,
    totalQuotesLoaded: normalizedQuotes.length,
    totalQuotesInRound: normalizedQuotes.filter((row) =>
      matchesCurrentRound(row, currentRound),
    ).length,
    includedQuotes: includedRows.length,
    excludedQuotes:
      normalizedQuotes.filter((row) => matchesCurrentRound(row, currentRound))
        .length - includedRows.length,
    rankedQuotes: rankedRows.length,

    hasQuotes: normalizedQuotes.length > 0,
    hasIncludedQuotes: includedRows.length > 0,
    hasRankedQuotes: rankedRows.length > 0,
    hasBuyerChoice: Boolean(selectedQuoteId),
    hasWinnerRow: Boolean(winnerRow),
    shouldEnableBuyerReview: lifecycle?.flags?.shouldEnableBuyerReview === true,

    bestScore,
    bestScoreLabel: buildCurrencyLabel(bestScore),

    selectedQuoteId: selectedQuoteId || "",
    selectedQuoteRank: winnerRow?.ranking?.rank || null,
    selectedQuoteScore: numberValue(winnerRow?.scoring?.effectiveScore),
    selectedQuoteScoreLabel: winnerRow?.scoring?.scoreLabel || "",

    scoreDistribution: buildDistribution(rankedRows),

    requestMetrics: {
      quotesReceived: numberValue(requestData?.metrics?.quotesReceived, 0),
      compliantQuotes: numberValue(requestData?.metrics?.compliantQuotes, 0),
      quotedDealerCount: numberValue(
        requestData?.metrics?.quotedDealerCount,
        0,
      ),
    },
  };
}

function buildDealerStats(rankedRows, selectedQuoteId) {
  return rankedRows.map((row) => {
    const rank = numberValue(row?.ranking?.rank);
    const total = rankedRows.length;
    const isSelectedWinner =
      textValue(row?.quoteId) === textValue(selectedQuoteId);

    return {
      quoteId: textValue(row?.quoteId),
      recordId: textValue(row?.recordId),
      dealerName: textValue(row?.dealer?.dealerName),
      rank,
      totalRankedQuotes: total,
      competitiveBand: classifyCompetitiveBand(rank, total),
      isSelectedWinner,
      score: numberValue(row?.scoring?.effectiveScore),
      scoreLabel: textValue(row?.scoring?.scoreLabel),
      scoreDeltaFromBest: numberValue(row?.ranking?.scoreDeltaFromBest),
      scoreDeltaLabel: textValue(row?.ranking?.scoreDeltaLabel),
      lossReason: textValue(row?.compliance?.quoteLossReason),
    };
  });
}

export function buildComparisonDataset(reviewBundle, options = {}) {
  if (!reviewBundle || typeof reviewBundle !== "object") {
    throw new Error("buildComparisonDataset requires a review bundle");
  }

  const requestData = reviewBundle.requestData;
  const invitations = reviewBundle.invitations || { rows: [] };
  const lifecycle = reviewBundle.lifecycle || null;
  const rawQuotes = Array.isArray(reviewBundle?.quotes?.rows)
    ? reviewBundle.quotes.rows
    : [];

  if (!requestData) {
    throw new Error("buildComparisonDataset requires reviewBundle.requestData");
  }

  const currentRound = normalizeRoundNumber(
    options.currentRound ||
      reviewBundle.currentRound ||
      requestData?.workflow?.roundNumber ||
      lifecycle?.currentRound ||
      "R1",
  );

  const normalizedQuotes = normalizeQuotes(rawQuotes, {
    requestData,
    invitationRows: invitations.rows || [],
  });

  const { included, excluded } = buildInclusionBuckets(
    normalizedQuotes,
    currentRound,
  );

  const rankedBaseRows = [...included]
    .filter((quote) => quote?.flags?.isRankable === true)
    .sort(compareQuotesForRanking);

  const bestScore = rankedBaseRows.length
    ? numberValue(rankedBaseRows[0]?.scoring?.effectiveScore)
    : null;

  const selectedQuoteId = resolveSelectedQuoteId(requestData, rankedBaseRows);

  const rankedRows = rankedBaseRows.map((quote, index) =>
    buildQuoteDatasetRow(quote, index, bestScore, selectedQuoteId),
  );

  const unrankedRows = included.filter(
    (quote) => quote?.flags?.isRankable !== true,
  );

  const request = buildRequestSummary(requestData, lifecycle);

  const summary = buildSummary({
    requestData,
    lifecycle,
    currentRound,
    normalizedQuotes,
    includedRows: included,
    rankedRows,
    selectedQuoteId,
  });

  return {
    requestId: textValue(requestData?.requestId),
    currentRound,
    mode: textValue(reviewBundle?.mode) || "internal",

    access: reviewBundle?.access || {},
    context: reviewBundle?.context || {},

    request,
    lifecycle,

    source: {
      rawQuoteCount: rawQuotes.length,
      normalizedQuoteCount: normalizedQuotes.length,
      invitationCount: numberValue(invitations?.total, 0),
    },

    quotes: {
      all: normalizedQuotes,
      included,
      excluded,
      ranked: rankedRows,
      unranked: unrankedRows,
    },

    summary,

    selected: {
      selectedQuoteId: selectedQuoteId || "",
      selectedQuote:
        rankedRows.find((row) => textValue(row?.quoteId) === selectedQuoteId) ||
        null,
      bestScoreQuote: rankedRows[0] || null,
    },

    dealerStats: buildDealerStats(rankedRows, selectedQuoteId),

    meta: {
      generatedAt: new Date().toISOString(),
      source: "buildComparisonDataset",
    },
  };
}
