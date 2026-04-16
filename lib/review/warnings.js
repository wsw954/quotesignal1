// /lib/review/warnings.js

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

function daysBetweenIso(nowIso, futureIso) {
  const now = Date.parse(nowIso || "");
  const future = Date.parse(futureIso || "");

  if (!Number.isFinite(now) || !Number.isFinite(future)) {
    return null;
  }

  return (future - now) / (1000 * 60 * 60 * 24);
}

function hoursBetweenIso(nowIso, futureIso) {
  const now = Date.parse(nowIso || "");
  const future = Date.parse(futureIso || "");

  if (!Number.isFinite(now) || !Number.isFinite(future)) {
    return null;
  }

  return (future - now) / (1000 * 60 * 60);
}

function buildWarning({
  code,
  level = "info",
  audience = "shared",
  message,
  details = null,
}) {
  return {
    code: textValue(code),
    level,
    audience,
    message: textValue(message),
    details: details && typeof details === "object" ? details : null,
  };
}

function uniqueWarnings(warnings = []) {
  const seen = new Set();
  const result = [];

  for (const warning of warnings) {
    const key = `${warning.code}::${warning.audience}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(warning);
  }

  return result;
}

function getRankedQuotes(dataset) {
  return Array.isArray(dataset?.quotes?.ranked) ? dataset.quotes.ranked : [];
}

function getIncludedQuotes(dataset) {
  return Array.isArray(dataset?.quotes?.included)
    ? dataset.quotes.included
    : [];
}

function getAllQuotes(dataset) {
  return Array.isArray(dataset?.quotes?.all) ? dataset.quotes.all : [];
}

function getSelectedQuote(dataset) {
  return dataset?.selected?.selectedQuote || null;
}

function buildLifecycleWarnings(dataset) {
  const warnings = [];

  const lifecycle = dataset?.lifecycle || {};
  const flags = lifecycle?.flags || {};
  const timestamps = lifecycle?.timestamps || {};
  const summary = dataset?.summary || {};

  if (flags.shouldEnableBuyerReview !== true) {
    warnings.push(
      buildWarning({
        code: "buyer_review_not_ready",
        level: "warning",
        audience: "internal",
        message:
          "Buyer review is not fully ready based on current round lifecycle state.",
        details: {
          shouldEnableBuyerReview: flags.shouldEnableBuyerReview === true,
          isRoundLive: flags.isRoundLive === true,
          shouldCloseRoundNow: flags.shouldCloseRoundNow === true,
          isRoundClosedPersisted: flags.isRoundClosedPersisted === true,
        },
      }),
    );
  }

  if (flags.isRoundLive === true) {
    warnings.push(
      buildWarning({
        code: "round_still_live",
        level: "warning",
        audience: "internal",
        message: "The current round still appears to be live.",
        details: {
          currentRound: textValue(dataset?.currentRound),
          deadlineAt: textValue(timestamps?.deadlineAt),
        },
      }),
    );
  }

  if (!summary.hasQuotes) {
    warnings.push(
      buildWarning({
        code: "no_quotes_loaded",
        level: "error",
        audience: "shared",
        message: "No quotes are currently available for review.",
      }),
    );
  }

  if (summary.hasQuotes && !summary.hasIncludedQuotes) {
    warnings.push(
      buildWarning({
        code: "no_included_quotes",
        level: "error",
        audience: "internal",
        message:
          "Quotes were loaded, but none are currently included in the comparison set.",
      }),
    );
  }

  return warnings;
}

function buildQuoteCountWarnings(dataset) {
  const warnings = [];
  const summary = dataset?.summary || {};

  if (summary.hasIncludedQuotes && summary.includedQuotes === 1) {
    warnings.push(
      buildWarning({
        code: "only_one_quote",
        level: "info",
        audience: "buyer",
        message: "Only one quote is currently available to compare.",
        details: {
          includedQuotes: numberValue(summary.includedQuotes, 0),
        },
      }),
    );
  }

  if (summary.includedQuotes > 0 && summary.includedQuotes < 3) {
    warnings.push(
      buildWarning({
        code: "limited_quote_competition",
        level: "info",
        audience: "shared",
        message: "The comparison set contains a limited number of quotes.",
        details: {
          includedQuotes: numberValue(summary.includedQuotes, 0),
        },
      }),
    );
  }

  return warnings;
}

function buildVehicleMismatchWarnings(dataset) {
  const warnings = [];
  const rankedQuotes = getRankedQuotes(dataset);
  const includedQuotes = getIncludedQuotes(dataset);

  const materialMismatchQuotes = includedQuotes.filter(
    (quote) => quote?.flags?.hasMaterialVehicleMismatch === true,
  );

  if (materialMismatchQuotes.length > 0) {
    warnings.push(
      buildWarning({
        code: "vehicle_mismatch_present",
        level: "warning",
        audience: "buyer",
        message:
          "One or more quotes appear to differ materially from the requested vehicle.",
        details: {
          affectedQuoteIds: materialMismatchQuotes.map(
            (quote) => quote.quoteId,
          ),
          count: materialMismatchQuotes.length,
        },
      }),
    );
  }

  const bestRankedQuote = rankedQuotes[0] || null;
  if (bestRankedQuote?.flags?.hasMaterialVehicleMismatch === true) {
    warnings.push(
      buildWarning({
        code: "best_score_vehicle_mismatch",
        level: "warning",
        audience: "buyer",
        message:
          "The top-ranked quote appears to have a material vehicle mismatch.",
        details: {
          quoteId: textValue(bestRankedQuote?.quoteId),
          scoreLabel: textValue(bestRankedQuote?.scoring?.scoreLabel),
        },
      }),
    );
  }

  return warnings;
}

function buildDeliveryWarnings(dataset) {
  const warnings = [];
  const rankedQuotes = getRankedQuotes(dataset);
  const selectedQuote = getSelectedQuote(dataset);

  const slowQuotes = rankedQuotes.filter((quote) =>
    ["slow"].includes(textValue(quote?.delivery?.bucket)),
  );

  if (slowQuotes.length > 0) {
    warnings.push(
      buildWarning({
        code: "slow_delivery_quotes_present",
        level: "info",
        audience: "buyer",
        message: "Some quotes have slower delivery timelines.",
        details: {
          affectedQuoteIds: slowQuotes.map((quote) => quote.quoteId),
          count: slowQuotes.length,
        },
      }),
    );
  }

  if (selectedQuote && textValue(selectedQuote?.delivery?.bucket) === "slow") {
    warnings.push(
      buildWarning({
        code: "selected_quote_slow_delivery",
        level: "info",
        audience: "buyer",
        message: "The selected quote has a relatively slow delivery timeline.",
        details: {
          quoteId: textValue(selectedQuote?.quoteId),
          deliveryTimeline: textValue(selectedQuote?.delivery?.raw),
        },
      }),
    );
  }

  return warnings;
}

function buildScoringWarnings(dataset) {
  const warnings = [];
  const rankedQuotes = getRankedQuotes(dataset);
  const selectedQuote = getSelectedQuote(dataset);
  const summary = dataset?.summary || {};

  if (!rankedQuotes.length) {
    return warnings;
  }

  const bestRankedQuote = rankedQuotes[0];
  const selectedRank = numberValue(summary?.selectedQuoteRank, null);

  if (selectedQuote && selectedRank != null && selectedRank > 1) {
    warnings.push(
      buildWarning({
        code: "selected_quote_not_top_scored",
        level: "info",
        audience: "internal",
        message: "The selected quote is not the top-ranked quote by score.",
        details: {
          selectedQuoteId: textValue(selectedQuote?.quoteId),
          selectedQuoteRank: selectedRank,
          bestQuoteId: textValue(bestRankedQuote?.quoteId),
          bestQuoteScoreLabel: textValue(bestRankedQuote?.scoring?.scoreLabel),
          selectedQuoteScoreLabel: textValue(
            selectedQuote?.scoring?.scoreLabel,
          ),
        },
      }),
    );
  }

  const spread =
    numberValue(summary?.scoreDistribution?.highestScore, null) != null &&
    numberValue(summary?.scoreDistribution?.lowestScore, null) != null
      ? numberValue(summary.scoreDistribution.highestScore) -
        numberValue(summary.scoreDistribution.lowestScore)
      : null;

  if (spread != null && spread >= 3000) {
    warnings.push(
      buildWarning({
        code: "wide_score_spread",
        level: "info",
        audience: "internal",
        message: "The quote set has a wide score spread.",
        details: {
          spread,
          spreadLabel: `${spread}`,
          lowestScoreLabel: textValue(
            summary?.scoreDistribution?.lowestScoreLabel,
          ),
          highestScoreLabel: textValue(
            summary?.scoreDistribution?.highestScoreLabel,
          ),
        },
      }),
    );
  }

  return warnings;
}

function buildComplianceWarnings(dataset) {
  const warnings = [];
  const allQuotes = getAllQuotes(dataset);
  const includedQuotes = getIncludedQuotes(dataset);

  const nonCompliantIncluded = includedQuotes.filter(
    (quote) => quote?.flags?.isNonCompliant === true,
  );

  if (nonCompliantIncluded.length > 0) {
    warnings.push(
      buildWarning({
        code: "non_compliant_quotes_included",
        level: "warning",
        audience: "internal",
        message: "One or more included quotes are marked non-compliant.",
        details: {
          affectedQuoteIds: nonCompliantIncluded.map((quote) => quote.quoteId),
          count: nonCompliantIncluded.length,
        },
      }),
    );
  }

  const exceptionQuotes = allQuotes.filter(
    (quote) => quote?.flags?.hasExceptions === true,
  );

  if (exceptionQuotes.length > 0) {
    warnings.push(
      buildWarning({
        code: "quotes_with_exceptions_present",
        level: "info",
        audience: "internal",
        message: "One or more quotes are marked compliant with exceptions.",
        details: {
          affectedQuoteIds: exceptionQuotes.map((quote) => quote.quoteId),
          count: exceptionQuotes.length,
        },
      }),
    );
  }

  return warnings;
}

function buildExpirationWarnings(dataset) {
  const warnings = [];
  const request = dataset?.request || {};
  const lifecycle = dataset?.lifecycle || {};
  const nowIso = textValue(lifecycle?.timestamps?.now);
  const buyerReviewExpiresAt = textValue(
    request?.request?.buyerReviewExpiresAt,
  );

  if (!nowIso || !buyerReviewExpiresAt) {
    return warnings;
  }

  const hoursRemaining = hoursBetweenIso(nowIso, buyerReviewExpiresAt);

  if (hoursRemaining != null && hoursRemaining <= 0) {
    warnings.push(
      buildWarning({
        code: "buyer_review_expired",
        level: "warning",
        audience: "buyer",
        message: "The buyer review window appears to have expired.",
        details: {
          buyerReviewExpiresAt,
        },
      }),
    );

    return warnings;
  }

  if (hoursRemaining != null && hoursRemaining <= 12) {
    warnings.push(
      buildWarning({
        code: "buyer_review_expiring_soon",
        level: "info",
        audience: "buyer",
        message: "The buyer review window is nearing expiration.",
        details: {
          buyerReviewExpiresAt,
          hoursRemaining,
        },
      }),
    );
  }

  return warnings;
}

function buildDealerReviewWarnings(dataset) {
  const warnings = [];
  const mode = textValue(dataset?.mode);
  const access = dataset?.access || {};

  if (mode === "dealer" && access?.dealerReviewReleased !== true) {
    warnings.push(
      buildWarning({
        code: "dealer_review_not_released",
        level: "warning",
        audience: "dealer",
        message: "Dealer review access has not been released yet.",
      }),
    );
  }

  if (mode === "dealer" && access?.quoteSubmitted !== true) {
    warnings.push(
      buildWarning({
        code: "dealer_quote_not_submitted",
        level: "warning",
        audience: "dealer",
        message: "No submitted quote is linked to this dealer review access.",
      }),
    );
  }

  return warnings;
}

function buildBuyerChoiceWarnings(dataset) {
  const warnings = [];
  const summary = dataset?.summary || {};

  if (summary.hasRankedQuotes && summary.hasBuyerChoice !== true) {
    warnings.push(
      buildWarning({
        code: "buyer_choice_not_recorded",
        level: "info",
        audience: "internal",
        message:
          "Quotes are ranked, but no buyer choice has been recorded yet.",
      }),
    );
  }

  return warnings;
}

export function buildWarnings(dataset) {
  if (!dataset || typeof dataset !== "object") {
    throw new Error("buildWarnings requires a comparison dataset");
  }

  const warnings = [
    ...buildLifecycleWarnings(dataset),
    ...buildQuoteCountWarnings(dataset),
    ...buildVehicleMismatchWarnings(dataset),
    ...buildDeliveryWarnings(dataset),
    ...buildScoringWarnings(dataset),
    ...buildComplianceWarnings(dataset),
    ...buildExpirationWarnings(dataset),
    ...buildDealerReviewWarnings(dataset),
    ...buildBuyerChoiceWarnings(dataset),
  ];

  return uniqueWarnings(warnings);
}

export function filterWarningsByAudience(warnings = [], audience = "shared") {
  if (!Array.isArray(warnings)) {
    throw new Error("filterWarningsByAudience requires a warnings array");
  }

  const target = textValue(audience).toLowerCase();

  return warnings.filter((warning) => {
    const warningAudience = textValue(warning?.audience).toLowerCase();

    if (warningAudience === "shared") return true;
    return warningAudience === target;
  });
}

export function groupWarningsByLevel(warnings = []) {
  if (!Array.isArray(warnings)) {
    throw new Error("groupWarningsByLevel requires a warnings array");
  }

  return warnings.reduce(
    (acc, warning) => {
      const level = textValue(warning?.level).toLowerCase() || "info";

      if (!acc[level]) {
        acc[level] = [];
      }

      acc[level].push(warning);
      return acc;
    },
    {
      error: [],
      warning: [],
      info: [],
    },
  );
}
