// /lib/workflow/evaluateRoundLifecycle.js

import { getRoundRules } from "@/lib/config/roundRules";

function firstFiniteNumber(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function normalizeRoundNumber(value) {
  const round = String(value || "R1")
    .trim()
    .toUpperCase();

  return round === "R2" ? "R2" : "R1";
}

function toDateOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIsoOrNull(value) {
  const d = value instanceof Date ? value : toDateOrNull(value);
  return d ? d.toISOString() : null;
}

function addHours(dateInput, hours) {
  const date = toDateOrNull(dateInput);
  if (!date) return null;

  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function isSelectedInvitationForRound(row, roundNumber) {
  return (
    row?.roundNumber === roundNumber &&
    String(row?.selectionStatus || "")
      .trim()
      .toLowerCase() === "selected"
  );
}

function isQuotedInvitationForRound(row, roundNumber) {
  return (
    row?.roundNumber === roundNumber &&
    (row?.quoteSubmitted === true || row?.statusBucket === "quoted")
  );
}

function resolveRoundStartedAt({ requestData, currentRound }) {
  if (currentRound === "R2") {
    return requestData?.workflow?.sendStatus?.r2SentAt || null;
  }

  return requestData?.workflow?.sendStatus?.r1SentAt || null;
}

function resolveRoundDeadlineAt({
  requestData,
  currentRound,
  startedAt,
  roundWindowHours,
}) {
  if (currentRound === "R2") {
    const r2SentAt = requestData?.workflow?.sendStatus?.r2SentAt || null;
    if (!r2SentAt) return null;
    return toIsoOrNull(addHours(r2SentAt, roundWindowHours));
  }

  const explicitR1Deadline =
    requestData?.request?.round1ResponseDeadlineAt || null;

  if (explicitR1Deadline) {
    return explicitR1Deadline;
  }

  if (!startedAt) {
    return null;
  }

  return toIsoOrNull(addHours(startedAt, roundWindowHours));
}

function resolveRoundClosedAt({ requestData, currentRound }) {
  if (currentRound === "R1") {
    return requestData?.workflow?.round1ClosedAt || null;
  }

  return null;
}

function resolveCurrentRound(requestData) {
  return normalizeRoundNumber(requestData?.workflow?.roundNumber || "R1");
}

function evaluateInvitationCounts(rows, currentRound) {
  const selectedRows = rows.filter((row) =>
    isSelectedInvitationForRound(row, currentRound),
  );

  const quotedRows = rows.filter((row) =>
    isQuotedInvitationForRound(row, currentRound),
  );

  return {
    selectedRows,
    quotedRows,
    selectedInvitationCount: selectedRows.length,
    quotedInvitationCount: quotedRows.length,
  };
}

/**
 * Evaluates the lifecycle state of the current round using request workflow
 * fields plus normalized RequestDealer invitation rows.
 *
 * Expected input shape:
 * {
 *   requestData,
 *   currentRound?,        // optional
 *   invitations?: { rows: [] },
 *   now?: string|Date     // optional override for testing
 * }
 */
export function evaluateRoundLifecycle({
  requestData,
  currentRound,
  invitations,
  now,
} = {}) {
  if (!requestData) {
    throw new Error("evaluateRoundLifecycle requires requestData");
  }

  const roundRules = getRoundRules();
  const resolvedRound = normalizeRoundNumber(
    currentRound || resolveCurrentRound(requestData),
  );

  const invitationRows = Array.isArray(invitations?.rows)
    ? invitations.rows
    : [];
  const nowDate = toDateOrNull(now) || new Date();

  const startedAt = resolveRoundStartedAt({
    requestData,
    currentRound: resolvedRound,
  });

  const deadlineAt = resolveRoundDeadlineAt({
    requestData,
    currentRound: resolvedRound,
    startedAt,
    roundWindowHours: roundRules.roundWindowHours,
  });

  const closedAt = resolveRoundClosedAt({
    requestData,
    currentRound: resolvedRound,
  });

  const {
    selectedRows,
    quotedRows,
    selectedInvitationCount,
    quotedInvitationCount,
  } = evaluateInvitationCounts(invitationRows, resolvedRound);

  const requestQuoteCount = firstFiniteNumber(
    requestData?.metrics?.quotesReceived,
    0,
  );

  const compliantQuoteCount = firstFiniteNumber(
    requestData?.metrics?.compliantQuotes,
    0,
  );

  const startedAtDate = toDateOrNull(startedAt);
  const deadlineAtDate = toDateOrNull(deadlineAt);
  const closedAtDate = toDateOrNull(closedAt);

  const isRoundStarted = Boolean(startedAtDate);
  const isRoundClosedPersisted = Boolean(closedAtDate);
  const deadlineExpired = Boolean(
    deadlineAtDate && nowDate.getTime() >= deadlineAtDate.getTime(),
  );

  // For now, early-close uses submitted quote count, not compliant quote count.
  // Compliance remains placeholder scaffolding until later business-rule refinement.
  const earlyCloseReached =
    quotedInvitationCount >= roundRules.earlyCloseQuoteCount;

  let closeReason = null;

  if (isRoundClosedPersisted) {
    closeReason = "already_closed";
  } else if (earlyCloseReached) {
    closeReason = `early_close_${roundRules.earlyCloseQuoteCount}_quotes`;
  } else if (deadlineExpired) {
    closeReason = "deadline_expired";
  }

  const shouldCloseRoundNow =
    !isRoundClosedPersisted &&
    isRoundStarted &&
    (earlyCloseReached || deadlineExpired);

  const hasAnyValidQuote = requestQuoteCount > 0 || quotedInvitationCount > 0;

  const shouldEnableBuyerReview =
    (isRoundClosedPersisted || shouldCloseRoundNow) && hasAnyValidQuote;

  const isRoundLive =
    isRoundStarted &&
    !isRoundClosedPersisted &&
    !shouldCloseRoundNow &&
    Boolean(deadlineAtDate);

  return {
    currentRound: resolvedRound,

    config: {
      ruleset: roundRules.ruleset,
      roundWindowHours: roundRules.roundWindowHours,
      maxInvitedDealers: roundRules.maxInvitedDealers,
      earlyCloseQuoteCount: roundRules.earlyCloseQuoteCount,
    },

    timestamps: {
      now: nowDate.toISOString(),
      startedAt: toIsoOrNull(startedAtDate),
      deadlineAt: toIsoOrNull(deadlineAtDate),
      closedAt: toIsoOrNull(closedAtDate),
    },

    counts: {
      selectedInvitationCount,
      quotedInvitationCount,
      requestQuoteCount,
      compliantQuoteCount,
    },

    flags: {
      isRoundStarted,
      isRoundLive,
      isRoundClosedPersisted,
      deadlineExpired,
      earlyCloseReached,
      shouldCloseRoundNow,
      hasAnyValidQuote,
      shouldEnableBuyerReview,
    },

    closeReason,

    rows: {
      selectedInvitationRecordIds: selectedRows.map((row) => row.recordId),
      quotedInvitationRecordIds: quotedRows.map((row) => row.recordId),
    },
  };
}

export function getRoundLifecycleConstants() {
  const roundRules = getRoundRules();

  return {
    ROUND_RULESET: roundRules.ruleset,
    MAX_INVITED_DEALERS: roundRules.maxInvitedDealers,
    EARLY_CLOSE_QUOTE_COUNT: roundRules.earlyCloseQuoteCount,
    ROUND_WINDOW_HOURS: roundRules.roundWindowHours,
  };
}
