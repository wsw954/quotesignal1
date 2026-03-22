// /lib/utils/tokens.js

import { randomBytes, timingSafeEqual } from "node:crypto";

export const TOKEN_KIND = {
  DEALER_QUOTE: "dealer-quote",
  DEALER_REVIEW: "dealer-review",
  BUYER_REVIEW: "buyer-review",
};

export const TOKEN_PREFIX = {
  [TOKEN_KIND.DEALER_QUOTE]: "dqt",
  [TOKEN_KIND.DEALER_REVIEW]: "drt",
  [TOKEN_KIND.BUYER_REVIEW]: "brt",
};

export const TOKEN_TTL_DAYS = {
  [TOKEN_KIND.DEALER_QUOTE]: 30,
  [TOKEN_KIND.DEALER_REVIEW]: 180,
  [TOKEN_KIND.BUYER_REVIEW]: 30,
};

const DEFAULT_TOKEN_BYTES = 24; // 48 hex chars before prefix
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function normalizePositiveInteger(value, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function nowDate() {
  return new Date();
}

export function nowIso() {
  return nowDate().toISOString();
}

export function addDaysToDate(dateInput, days) {
  const base = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const safeDays = normalizePositiveInteger(days, 0);

  return new Date(base.getTime() + safeDays * MS_PER_DAY);
}

export function toIsoOrNull(value) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function getTokenPrefix(kind) {
  return TOKEN_PREFIX[kind] || "tok";
}

export function getTokenTtlDays(kind) {
  return TOKEN_TTL_DAYS[kind] || 30;
}

export function createToken({
  kind,
  prefix,
  bytes = DEFAULT_TOKEN_BYTES,
} = {}) {
  const resolvedPrefix = prefix || getTokenPrefix(kind);
  const safeBytes = normalizePositiveInteger(bytes, DEFAULT_TOKEN_BYTES);
  const raw = randomBytes(safeBytes).toString("hex");

  return resolvedPrefix ? `${resolvedPrefix}_${raw}` : raw;
}

export function createTokenExpiry({ kind, days, from = new Date() } = {}) {
  const ttlDays = normalizePositiveInteger(days, getTokenTtlDays(kind));
  return addDaysToDate(from, ttlDays).toISOString();
}

export function createExpiringToken({ kind, prefix, bytes, days, from } = {}) {
  return {
    token: createToken({ kind, prefix, bytes }),
    expiresAt: createTokenExpiry({ kind, days, from }),
  };
}

export function createDealerQuoteToken(options = {}) {
  return createExpiringToken({
    kind: TOKEN_KIND.DEALER_QUOTE,
    ...options,
  });
}

export function createDealerReviewToken(options = {}) {
  return createExpiringToken({
    kind: TOKEN_KIND.DEALER_REVIEW,
    ...options,
  });
}

export function createBuyerReviewToken(options = {}) {
  return createExpiringToken({
    kind: TOKEN_KIND.BUYER_REVIEW,
    ...options,
  });
}

export function createInvitationTokenBundle({
  quoteDays,
  reviewDays,
  from,
} = {}) {
  const quote = createDealerQuoteToken({
    days: quoteDays,
    from,
  });

  const review = createDealerReviewToken({
    days: reviewDays,
    from,
  });

  return {
    dealerQuoteToken: quote.token,
    dealerQuoteTokenExpiresAt: quote.expiresAt,
    dealerReviewToken: review.token,
    dealerReviewTokenExpiresAt: review.expiresAt,
  };
}

export function normalizeToken(value) {
  return String(value || "").trim();
}

export function hasTokenExpired(expiresAt, now = new Date()) {
  if (!expiresAt) return true;

  const expiryDate =
    expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  const compareDate = now instanceof Date ? now : new Date(now);

  if (
    Number.isNaN(expiryDate.getTime()) ||
    Number.isNaN(compareDate.getTime())
  ) {
    return true;
  }

  return expiryDate.getTime() <= compareDate.getTime();
}

export function tokenMatches(providedToken, storedToken) {
  const left = normalizeToken(providedToken);
  const right = normalizeToken(storedToken);

  if (!left || !right) return false;
  if (left.length !== right.length) return false;

  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function assertActiveToken({
  providedToken,
  storedToken,
  expiresAt,
  label = "Token",
  now = new Date(),
} = {}) {
  if (!tokenMatches(providedToken, storedToken)) {
    throw new Error(`${label} is invalid`);
  }

  if (hasTokenExpired(expiresAt, now)) {
    throw new Error(`${label} is expired`);
  }

  return true;
}
