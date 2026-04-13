// /lib/workflow/applyDealerSelectionRules.js

import {
  buildDealerCandidateSet,
  sortDealerRows,
} from "./buildDealerCandidateSet";
import { normalizeDealerSelectionOverrides } from "@/lib/validation/dealerSelectionSchema";
import { getRoundRules } from "@/lib/config/roundRules";

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getDealerKeys(dealer) {
  return [dealer?.recordId, dealer?.dealerId, dealer?.id]
    .filter(Boolean)
    .map(normalizeKey);
}

function dealerMatchesKeySet(dealer, keySet) {
  return getDealerKeys(dealer).some((key) => keySet.has(key));
}

function dedupeDealers(dealers) {
  const seen = new Set();
  const output = [];

  for (const dealer of dealers) {
    const key = dealer?.recordId || dealer?.dealerId || dealer?.id;
    if (!key) continue;
    if (seen.has(key)) continue;

    seen.add(key);
    output.push(dealer);
  }

  return output;
}

function normalizeNonNegativeInteger(value) {
  const n = Number(value);

  if (!Number.isFinite(n) || n < 0) {
    return null;
  }

  return Math.floor(n);
}

function normalizeTargetDealerCount(requestData, overrides, candidateCount) {
  const roundRules = getRoundRules();

  const overrideTarget = normalizeNonNegativeInteger(
    overrides.targetDealerCount,
  );

  const requestTarget = normalizeNonNegativeInteger(
    requestData?.metrics?.targetDealerCount,
  );

  const configuredCap = normalizeNonNegativeInteger(
    roundRules.maxInvitedDealers,
  );

  const requestedTarget =
    overrideTarget ?? requestTarget ?? configuredCap ?? candidateCount;

  // Final target is constrained by:
  // 1. configured ruleset cap
  // 2. actual available candidate count
  const cappedByRules =
    configuredCap == null
      ? requestedTarget
      : Math.min(requestedTarget, configuredCap);

  return Math.min(cappedByRules, candidateCount);
}

function buildSelectedReason(
  dealer,
  { targetDealerCount, wasAutoSelected, wasManualIncluded },
) {
  const parts = [];

  if (wasManualIncluded && !wasAutoSelected) {
    parts.push("Manually included by operator override");
  } else if (wasManualIncluded && wasAutoSelected) {
    parts.push("Also marked manual include");
  }

  if (wasAutoSelected) {
    parts.push(`Selected within target dealer count (${targetDealerCount})`);
  }

  if (dealer.selectionReason) {
    parts.push(dealer.selectionReason);
  }

  return parts.join(" • ");
}

function buildExcludedEligibleReason(
  dealer,
  { targetDealerCount, wasManualExcluded },
) {
  if (wasManualExcluded) {
    return "Manually excluded by operator override";
  }

  if (targetDealerCount === 0) {
    return "Excluded because target dealer count is 0";
  }

  return `Excluded by target dealer count cap (${targetDealerCount})`;
}

function sortSelectedRows(a, b) {
  const rankA = Number(a?.candidateRank || 9999);
  const rankB = Number(b?.candidateRank || 9999);

  if (rankA !== rankB) return rankA - rankB;
  return sortDealerRows(a, b);
}

export async function applyDealerSelectionRules(
  requestInput,
  rawOverrides = {},
) {
  const roundRules = getRoundRules();
  const overrides = normalizeDealerSelectionOverrides(rawOverrides);
  const candidateSet = await buildDealerCandidateSet(requestInput);

  const manualIncludeKeySet = new Set(
    overrides.manualIncludeDealerIds.map(normalizeKey),
  );

  const manualExcludeKeySet = new Set(
    overrides.manualExcludeDealerIds.map(normalizeKey),
  );

  const targetDealerCount = normalizeTargetDealerCount(
    candidateSet.requestData,
    overrides,
    candidateSet.candidateCount,
  );

  const rankedCandidates = [...candidateSet.candidates];

  const selectableCandidates = rankedCandidates.filter(
    (dealer) => !dealerMatchesKeySet(dealer, manualExcludeKeySet),
  );

  const autoSelected = selectableCandidates.slice(0, targetDealerCount);

  const autoSelectedSet = new Set(
    autoSelected.map(
      (dealer) => dealer.recordId || dealer.dealerId || dealer.id,
    ),
  );

  const manualIncluded = rankedCandidates.filter(
    (dealer) =>
      dealerMatchesKeySet(dealer, manualIncludeKeySet) &&
      !dealerMatchesKeySet(dealer, manualExcludeKeySet) &&
      !autoSelectedSet.has(dealer.recordId || dealer.dealerId || dealer.id),
  );

  const selected = dedupeDealers([...autoSelected, ...manualIncluded])
    .sort(sortSelectedRows)
    .map((dealer) => {
      const wasAutoSelected = autoSelectedSet.has(
        dealer.recordId || dealer.dealerId || dealer.id,
      );
      const wasManualIncluded = dealerMatchesKeySet(
        dealer,
        manualIncludeKeySet,
      );

      return {
        ...dealer,
        statusLabel: "Selected",
        selectionStatus: "Selected",
        selected: true,
        excluded: false,
        manualInclude: wasManualIncluded,
        manualExclude: false,
        selectionBucket: "selected",
        selectionReason: buildSelectedReason(dealer, {
          targetDealerCount,
          wasAutoSelected,
          wasManualIncluded,
        }),
        exclusionReason: "",
      };
    });

  const selectedSet = new Set(
    selected.map((dealer) => dealer.recordId || dealer.dealerId || dealer.id),
  );

  const excludedEligible = rankedCandidates
    .filter(
      (dealer) =>
        !selectedSet.has(dealer.recordId || dealer.dealerId || dealer.id),
    )
    .map((dealer) => {
      const wasManualExcluded = dealerMatchesKeySet(
        dealer,
        manualExcludeKeySet,
      );

      return {
        ...dealer,
        statusLabel: "Excluded",
        selectionStatus: "Excluded",
        selected: false,
        excluded: true,
        manualInclude: false,
        manualExclude: wasManualExcluded,
        selectionBucket: "excluded-eligible",
        selectionReason: "",
        exclusionReason: buildExcludedEligibleReason(dealer, {
          targetDealerCount,
          wasManualExcluded,
        }),
      };
    });

  const ineligible = candidateSet.ineligible.map((dealer) => ({
    ...dealer,
    statusLabel: "Excluded",
    selectionStatus: "Excluded",
    selected: false,
    excluded: true,
    manualInclude: false,
    manualExclude: false,
    selectionBucket: "excluded-ineligible",
    selectionReason: "",
    exclusionReason: dealer.exclusionReason || "Dealer is ineligible",
  }));

  const excluded = [...excludedEligible, ...ineligible].sort(sortDealerRows);

  return {
    requestId: candidateSet.requestId,
    requestData: candidateSet.requestData,
    roundNumber:
      overrides.roundNumber ||
      candidateSet.requestData?.workflow?.roundNumber ||
      "R1",

    targetDealerCount,
    candidateCount: candidateSet.candidateCount,
    selectedCount: selected.length,
    excludedCount: excluded.length,
    ineligibleCount: ineligible.length,

    candidates: rankedCandidates,
    selected,
    excluded,
    ineligible,
    excludedEligible,

    manualIncludeDealerIds: overrides.manualIncludeDealerIds,
    manualExcludeDealerIds: overrides.manualExcludeDealerIds,

    summary: {
      totalDealers: candidateSet.allDealers.length,
      candidateCount: candidateSet.candidateCount,
      selectedCount: selected.length,
      excludedEligibleCount: excludedEligible.length,
      ineligibleCount: ineligible.length,
      ruleset: roundRules.ruleset,
      maxInvitedDealers: roundRules.maxInvitedDealers,
    },
  };
}

export async function getDealerSelectionPreview(requestInput, overrides = {}) {
  return applyDealerSelectionRules(requestInput, overrides);
}
