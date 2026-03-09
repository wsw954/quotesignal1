//lib/constants/creditScoreRanges.js
export const CREDIT_SCORE_RANGES = [
  "740+ (Excellent)",
  "660-739 (Good)",
  "600-659 (Fair)",
  "500-599 (Challenge)",
  "Below 500",
  "Not Sure",
];

export function requiresCreditScoreRange(purchaseType) {
  return purchaseType === "Finance" || purchaseType === "Lease";
}
