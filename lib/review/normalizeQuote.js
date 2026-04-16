// /lib/review/normalizeQuote.js

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

function normalizePurchaseType(value) {
  const purchaseType = String(value || "")
    .trim()
    .toLowerCase();

  if (purchaseType === "lease") return "Lease";
  if (purchaseType === "finance") return "Finance";
  if (purchaseType === "cash") return "Cash";
  return "";
}

function buildVehicleSpec(vehicle = {}) {
  return [
    textValue(vehicle.year),
    textValue(vehicle.make),
    textValue(vehicle.model),
    textValue(vehicle.trim),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function splitAccessoryText(value) {
  const text = textValue(value);
  if (!text) return [];

  return text
    .split(/[\n,;|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeDeliveryTimeline(value) {
  const raw = textValue(value);

  const normalized = raw.toLowerCase();

  if (normalized === "in stock / immediate") {
    return {
      raw,
      bucket: "immediate",
      rank: 1,
      shortLabel: "Immediate",
    };
  }

  if (normalized === "within 1 week") {
    return {
      raw,
      bucket: "fast",
      rank: 2,
      shortLabel: "Within 1 week",
    };
  }

  if (normalized === "within 2 weeks") {
    return {
      raw,
      bucket: "moderate",
      rank: 3,
      shortLabel: "Within 2 weeks",
    };
  }

  if (normalized === "3+ weeks") {
    return {
      raw,
      bucket: "slow",
      rank: 4,
      shortLabel: "3+ weeks",
    };
  }

  return {
    raw,
    bucket: raw ? "other" : "unknown",
    rank: raw ? 5 : null,
    shortLabel: raw || "",
  };
}

function buildScoreLabel(score, purchaseType) {
  const numericScore = numberValue(score);

  if (numericScore == null) return "";

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(numericScore);

  if (purchaseType === "Lease") {
    return `${formatted} lease all-in`;
  }

  if (purchaseType === "Finance") {
    return `${formatted} finance all-in`;
  }

  return `${formatted} OTD`;
}

function buildPrimaryPriceLabel({ purchaseType, commercialTerms, scoring }) {
  if (purchaseType === "Lease" && commercialTerms.leaseAllInCost != null) {
    return buildCurrencyLabel(commercialTerms.leaseAllInCost);
  }

  if (purchaseType === "Finance" && commercialTerms.financeAllInCost != null) {
    return buildCurrencyLabel(commercialTerms.financeAllInCost);
  }

  if (commercialTerms.otdTotal != null) {
    return buildCurrencyLabel(commercialTerms.otdTotal);
  }

  return buildCurrencyLabel(scoring.score);
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

function buildVehicleComparisonFlags({
  requestedVehicle = {},
  offeredVehicle = {},
}) {
  const requestedYear = textValue(requestedVehicle.year);
  const requestedMake = textValue(requestedVehicle.make).toLowerCase();
  const requestedModel = textValue(requestedVehicle.model).toLowerCase();
  const requestedTrim = textValue(requestedVehicle.trim).toLowerCase();
  const requestedExteriorColor = textValue(
    requestedVehicle.exteriorColorRequested,
  ).toLowerCase();

  const offeredYear = textValue(offeredVehicle.year);
  const offeredMake = textValue(offeredVehicle.make).toLowerCase();
  const offeredModel = textValue(offeredVehicle.model).toLowerCase();
  const offeredTrim = textValue(offeredVehicle.trim).toLowerCase();
  const offeredExteriorColor = textValue(
    offeredVehicle.exteriorColor,
  ).toLowerCase();

  const yearMatches =
    !requestedYear || !offeredYear || requestedYear === offeredYear;
  const makeMatches =
    !requestedMake || !offeredMake || requestedMake === offeredMake;
  const modelMatches =
    !requestedModel || !offeredModel || requestedModel === offeredModel;
  const trimMatches =
    !requestedTrim || !offeredTrim || requestedTrim === offeredTrim;

  const colorRequestedIsFlexible =
    !requestedExteriorColor || requestedExteriorColor === "any";
  const colorMatches =
    colorRequestedIsFlexible ||
    !offeredExteriorColor ||
    requestedExteriorColor === offeredExteriorColor;

  const coreVehicleMatch =
    yearMatches && makeMatches && modelMatches && trimMatches;

  const exactVehicleMatch = coreVehicleMatch && colorMatches;

  return {
    yearMatches,
    makeMatches,
    modelMatches,
    trimMatches,
    colorMatches,
    coreVehicleMatch,
    exactVehicleMatch,
    hasMaterialMismatch: !coreVehicleMatch,
  };
}

function resolveScoreValue(rawQuote) {
  const score = numberValue(rawQuote?.scoring?.score);
  const scoreCompliantOnly = numberValue(rawQuote?.scoring?.scoreCompliantOnly);

  return {
    score,
    scoreCompliantOnly,
    effectiveScore: scoreCompliantOnly ?? score,
  };
}

function deriveCommercialTerms(rawQuote, purchaseType) {
  const terms = rawQuote?.commercialTerms || {};

  return {
    purchaseType,
    otdTotal: numberValue(terms.otdTotal),
    aprPercent: numberValue(terms.aprPercent),
    financeTermMonths: numberValue(terms.financeTermMonths),
    downPaymentAssumed: numberValue(terms.downPaymentAssumed),
    monthlyPaymentFinance: numberValue(terms.monthlyPaymentFinance),
    financeAllInCost: numberValue(rawQuote?.scoring?.financeAllInCost),
    leaseTermMonths: numberValue(terms.leaseTermMonths),
    leaseMonthly: numberValue(terms.leaseMonthly),
    leaseDas: numberValue(terms.leaseDas),
    leaseMilesPerYear: numberValue(terms.leaseMilesPerYear),
    leaseAllInCost: numberValue(rawQuote?.scoring?.leaseAllInCost),
  };
}

function deriveCompliance(rawQuote) {
  const status = textValue(rawQuote?.compliance?.status) || "Unreviewed";
  const isCompliant = booleanValue(rawQuote?.compliance?.isCompliant);

  return {
    status,
    isCompliant,
    notes: textValue(rawQuote?.compliance?.notes),
    quoteLossReason: textValue(rawQuote?.compliance?.quoteLossReason),
    hasExceptions: status.toLowerCase() === "compliant w/exceptions",
    isNonCompliant: status.toLowerCase() === "non-compliant",
    isPlaceholderCompliantState:
      status === "Compliant" || status === "Unreviewed",
  };
}

export function normalizeQuote(rawQuote, options = {}) {
  if (!rawQuote || typeof rawQuote !== "object") {
    throw new Error("normalizeQuote requires a raw quote object");
  }

  const requestData = options.requestData || null;
  const invitationRow = options.invitationRow || null;

  const purchaseType = normalizePurchaseType(
    rawQuote?.identity?.purchaseType ||
      requestData?.request?.purchaseTypeRequested ||
      "",
  );

  const roundNumber = normalizeRoundNumber(rawQuote?.identity?.roundNumber);

  const offeredVehicle = {
    year: textValue(rawQuote?.offeredVehicle?.year),
    make: textValue(rawQuote?.offeredVehicle?.make),
    model: textValue(rawQuote?.offeredVehicle?.model),
    trim: textValue(rawQuote?.offeredVehicle?.trim),
    exteriorColor: textValue(rawQuote?.offeredVehicle?.exteriorColor),
    accessories: textValue(rawQuote?.offeredVehicle?.accessories),
    accessoriesList: splitAccessoryText(rawQuote?.offeredVehicle?.accessories),
    trimNotesPackages: textValue(rawQuote?.offeredVehicle?.trimNotesPackages),
    vehicleSpec:
      buildVehicleSpec(rawQuote?.offeredVehicle) ||
      textValue(requestData?.vehicle?.vehicleSpec),
  };

  const vehicleComparison = buildVehicleComparisonFlags({
    requestedVehicle: requestData?.vehicle || {},
    offeredVehicle,
  });

  const scoringBase = resolveScoreValue(rawQuote);
  const commercialTerms = deriveCommercialTerms(rawQuote, purchaseType);
  const compliance = deriveCompliance(rawQuote);
  const delivery = normalizeDeliveryTimeline(
    rawQuote?.delivery?.dealerDeliveryTimeline,
  );

  const quoteId = textValue(rawQuote?.quoteId) || textValue(rawQuote?.recordId);
  const dealerName =
    textValue(rawQuote?.identity?.dealerName) ||
    textValue(invitationRow?.dealerName) ||
    "Unknown Dealer";

  const scoreLabel = buildScoreLabel(scoringBase.effectiveScore, purchaseType);
  const primaryPriceLabel = buildPrimaryPriceLabel({
    purchaseType,
    commercialTerms,
    scoring: scoringBase,
  });

  return {
    recordId: textValue(rawQuote?.recordId),
    quoteId,

    requestContext: {
      requestId:
        textValue(rawQuote?.identity?.requestIdText) ||
        textValue(requestData?.requestId),
      requestRecordId:
        textValue(rawQuote?.links?.requestRecordId) ||
        textValue(requestData?.recordId),
      requestDealerRecordId:
        textValue(rawQuote?.links?.requestDealerRecordId) ||
        textValue(invitationRow?.recordId),
      dealerRecordId:
        textValue(rawQuote?.links?.dealerRecordId) ||
        textValue(invitationRow?.dealerRecordId),
      roundNumber,
      purchaseType,
    },

    dealer: {
      dealerName,
      dealerMainContact:
        textValue(rawQuote?.identity?.dealerMainContact) ||
        textValue(invitationRow?.dealerMainContact),
      dealerEmail: textValue(invitationRow?.dealerEmail),
      dealerStatus: textValue(invitationRow?.dealerStatus),
    },

    source: {
      quoteSource: textValue(rawQuote?.identity?.quoteSource),
      includedInBuyerReview: booleanValue(
        rawQuote?.inclusion?.includedInBuyerReview,
      ),
      includedInDealerReview: booleanValue(
        rawQuote?.inclusion?.includedInDealerReview,
      ),
      isBuyerChoice: booleanValue(rawQuote?.inclusion?.isBuyerChoice),
    },

    scoring: {
      score: scoringBase.score,
      scoreCompliantOnly: scoringBase.scoreCompliantOnly,
      effectiveScore: scoringBase.effectiveScore,
      scoreLabel,
      primaryPriceLabel,
      isRankable: scoringBase.effectiveScore != null,
    },

    compliance,

    offeredVehicle,

    vehicleComparison,

    commercialTerms,

    delivery: {
      raw: delivery.raw,
      bucket: delivery.bucket,
      rank: delivery.rank,
      shortLabel: delivery.shortLabel,
    },

    notes: {
      quoteNotes: textValue(rawQuote?.notes?.quoteNotes),
      quoteUpdateLink: textValue(rawQuote?.notes?.quoteUpdateLink),
    },

    invitation: invitationRow
      ? {
          recordId: textValue(invitationRow?.recordId),
          requestDealerId: textValue(invitationRow?.requestDealerId),
          selectionStatus: textValue(invitationRow?.selectionStatus),
          candidateStatus: textValue(invitationRow?.candidateStatus),
          status: textValue(invitationRow?.status),
          statusBucket: textValue(invitationRow?.statusBucket),
          dealerReviewReleased: booleanValue(
            invitationRow?.dealerReviewReleased,
          ),
          quoteSubmitted: booleanValue(invitationRow?.quoteSubmitted),
        }
      : null,

    timestamps: {
      receivedTime: textValue(rawQuote?.timestamps?.receivedTime),
      lastUpdatedTime: textValue(rawQuote?.timestamps?.lastUpdatedTime),
      quoteExpiration: textValue(rawQuote?.timestamps?.quoteExpiration),
    },

    flags: {
      isCashQuote: purchaseType === "Cash",
      isFinanceQuote: purchaseType === "Finance",
      isLeaseQuote: purchaseType === "Lease",
      isRankable: scoringBase.effectiveScore != null,
      isCompliant: compliance.isCompliant,
      hasExceptions: compliance.hasExceptions,
      isNonCompliant: compliance.isNonCompliant,
      isBuyerChoice: booleanValue(rawQuote?.inclusion?.isBuyerChoice),
      isIncludedInBuyerReview: booleanValue(
        rawQuote?.inclusion?.includedInBuyerReview,
      ),
      isIncludedInDealerReview: booleanValue(
        rawQuote?.inclusion?.includedInDealerReview,
      ),
      hasMaterialVehicleMismatch: vehicleComparison.hasMaterialMismatch,
      hasDeliveryTimeline: Boolean(delivery.raw),
      hasQuoteNotes: Boolean(textValue(rawQuote?.notes?.quoteNotes)),
    },

    raw: rawQuote,
  };
}

export function normalizeQuotes(rawQuotes = [], options = {}) {
  if (!Array.isArray(rawQuotes)) {
    throw new Error("normalizeQuotes requires an array of raw quotes");
  }

  const invitationRows = Array.isArray(options.invitationRows)
    ? options.invitationRows
    : [];

  const invitationByRecordId = new Map(
    invitationRows
      .filter((row) => row?.recordId)
      .map((row) => [row.recordId, row]),
  );

  return rawQuotes.map((rawQuote) => {
    const requestDealerRecordId = textValue(
      rawQuote?.links?.requestDealerRecordId,
    );

    const invitationRow = requestDealerRecordId
      ? invitationByRecordId.get(requestDealerRecordId) || null
      : null;

    return normalizeQuote(rawQuote, {
      ...options,
      invitationRow,
    });
  });
}
