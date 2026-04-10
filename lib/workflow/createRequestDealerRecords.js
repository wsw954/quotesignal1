// /lib/workflow/createRequestDealerRecords.js

import { createBase } from "@/lib/airtable/client";
import { getRequestData } from "@/lib/airtable/requestData";
import { getInvitationData } from "@/lib/airtable/invitationData";
import { getDealerSelectionPreview } from "./applyDealerSelectionRules";
import { createInvitationTokenBundle } from "@/lib/utils/tokens";
import {
  INVITATION_SELECTION_STATUS,
  RFQ_SEND_STATUS,
} from "@/lib/airtable/workflowActions";

const base = createBase();

const REQUEST_DEALER_TABLE = "RequestDealer";

function normalizeRoundNumber(value) {
  const round = String(value || "")
    .trim()
    .toUpperCase();

  return round === "R2" ? "R2" : "R1";
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function uniq(values) {
  return [...new Set(values)];
}

function summarizeDealer(dealer) {
  return {
    dealerRecordId: dealer?.recordId || "",
    dealerId: dealer?.dealerId || "",
    dealerName: dealer?.dealerName || dealer?.name || "Unknown Dealer",
  };
}

function getDealerKeys(dealer) {
  return uniq(
    [dealer?.recordId, dealer?.dealerId, dealer?.id]
      .filter(Boolean)
      .map(normalizeKey),
  );
}

function getInvitationKeys(row) {
  return uniq(
    [row?.dealerRecordId, row?.dealerId].filter(Boolean).map(normalizeKey),
  );
}

function dedupeDealers(dealers = []) {
  const seen = new Set();
  const output = [];

  for (const dealer of dealers) {
    const keys = getDealerKeys(dealer);
    const primaryKey = keys[0];

    if (!primaryKey) {
      output.push(dealer);
      continue;
    }

    if (seen.has(primaryKey)) {
      continue;
    }

    seen.add(primaryKey);
    output.push(dealer);
  }

  return output;
}

function resolveRfqTemplateType(dealer, existingValue = "") {
  const dealerStatus = String(dealer?.dealerStatus || "").trim();

  if (dealerStatus === "New") {
    return "Intro";
  }

  if (dealerStatus === "Active") {
    return "Standard";
  }

  return String(existingValue || "").trim() || "Standard";
}

async function resolveRequestData(requestInput) {
  if (!requestInput) {
    throw new Error(
      "createRequestDealerRecords requires a request object or Request ID",
    );
  }

  if (typeof requestInput === "string") {
    return getRequestData(requestInput);
  }

  return requestInput;
}

async function resolveDealerSelection(requestData, dealerSelectionInput) {
  if (
    dealerSelectionInput?.selected &&
    Array.isArray(dealerSelectionInput.selected)
  ) {
    return dealerSelectionInput;
  }

  return getDealerSelectionPreview(requestData);
}

function buildExistingInvitationMap(rows = [], roundNumber) {
  const map = new Map();

  for (const row of rows) {
    if (normalizeRoundNumber(row?.roundNumber) !== roundNumber) {
      continue;
    }

    for (const key of getInvitationKeys(row)) {
      if (!map.has(key)) {
        map.set(key, row);
      }
    }
  }

  return map;
}

function findExistingInvitationForDealer(dealer, existingMap) {
  for (const key of getDealerKeys(dealer)) {
    const row = existingMap.get(key);
    if (row) return row;
  }

  return null;
}

function buildTokenFields(options = {}) {
  const bundle = createInvitationTokenBundle({
    quoteDays: options.quoteTokenDays,
    reviewDays: options.reviewTokenDays,
    from: options.issuedAt,
  });

  return {
    "Dealer Quote Token": bundle.dealerQuoteToken,
    "Dealer Quote Token Expires At": null,
    "Dealer Review Token": bundle.dealerReviewToken,
    "Dealer Review Token Expires At": bundle.dealerReviewTokenExpiresAt,
  };
}

function buildBaseSelectionFields({ requestData, dealer, roundNumber }) {
  return {
    Request: [requestData.recordId],
    Dealer: [dealer.recordId],
    "Round Number": roundNumber,
    "Candidate Status": dealer?.candidateStatus || "Eligible",
    "Selection Status":
      dealer?.selectionStatus || INVITATION_SELECTION_STATUS.SELECTED,
    "Selection Reason": dealer?.selectionReason || "",
    "Exclusion Reason": "",
    "Manual Include?": Boolean(dealer?.manualInclude),
    "Manual Exclude?": false,
    "RFQ Template Type": resolveRfqTemplateType(dealer),
  };
}

function buildCreateFields({ requestData, dealer, roundNumber, tokenOptions }) {
  return {
    ...buildBaseSelectionFields({
      requestData,
      dealer,
      roundNumber,
    }),
    ...buildTokenFields(tokenOptions),
    "RFQ Send Status": RFQ_SEND_STATUS.NOT_READY,
    "Quote Submitted?": false,
    "Dealer Review Released?": false,
  };
}

function buildUpdateFields({
  existingRow,
  dealer,
  roundNumber,
  tokenOptions,
  refreshExistingTokens,
  backfillMissingTokens,
}) {
  const fields = {
    "Round Number": roundNumber,
    "Candidate Status":
      dealer?.candidateStatus || existingRow?.candidateStatus || "Eligible",
    "Selection Status": INVITATION_SELECTION_STATUS.SELECTED,
    "Selection Reason":
      dealer?.selectionReason || existingRow?.selectionReason || "",
    "Exclusion Reason": "",
    "Manual Include?": Boolean(dealer?.manualInclude),
    "Manual Exclude?": false,
    "RFQ Template Type": resolveRfqTemplateType(
      dealer,
      existingRow?.rfqTemplateType,
    ),
  };

  const needsTokenBackfill =
    backfillMissingTokens &&
    (!existingRow?.dealerQuoteToken ||
      !existingRow?.dealerQuoteTokenExpiresAt ||
      !existingRow?.dealerReviewToken ||
      !existingRow?.dealerReviewTokenExpiresAt);

  if (refreshExistingTokens || needsTokenBackfill) {
    Object.assign(fields, buildTokenFields(tokenOptions));
  }

  if (
    !existingRow?.rfqSendStatus &&
    !existingRow?.rfqSentAt &&
    !existingRow?.quoteSubmitted
  ) {
    fields["RFQ Send Status"] = RFQ_SEND_STATUS.NOT_READY;
  }

  return fields;
}

async function reloadInvitationSummary(requestId) {
  const freshRequestData = await getRequestData(requestId);
  return getInvitationData(freshRequestData);
}

export async function createRequestDealerRecords(
  requestInput,
  rawOptions = {},
) {
  const requestData = await resolveRequestData(requestInput);

  if (!requestData?.recordId) {
    throw new Error("Resolved Request is missing Airtable recordId");
  }

  if (requestData?.flags?.isClosed) {
    throw new Error("Cannot create RequestDealer records for a closed Request");
  }

  const roundNumber = normalizeRoundNumber(
    rawOptions.roundNumber || requestData?.workflow?.roundNumber,
  );

  const dealerSelection = await resolveDealerSelection(
    requestData,
    rawOptions.dealerSelection,
  );

  const selectedDealers = dedupeDealers(
    Array.isArray(dealerSelection?.selected) ? dealerSelection.selected : [],
  );

  if (!selectedDealers.length) {
    return {
      requestId: requestData.requestId,
      requestRecordId: requestData.recordId,
      roundNumber,
      selectedCount: 0,
      existingCount: 0,
      createdCount: 0,
      refreshedCount: 0,
      skippedCount: 0,
      created: [],
      refreshed: [],
      existing: [],
      skipped: [],
      invitationSummary:
        rawOptions.returnInvitationSummary === false
          ? null
          : await reloadInvitationSummary(requestData.requestId),
    };
  }

  const existingInvitationData = await getInvitationData(requestData);
  const existingMap = buildExistingInvitationMap(
    existingInvitationData.rows,
    roundNumber,
  );

  const tokenOptions = {
    quoteTokenDays: rawOptions.quoteTokenDays,
    reviewTokenDays: rawOptions.reviewTokenDays,
    issuedAt: rawOptions.issuedAt || new Date(),
  };

  const refreshExistingTokens = rawOptions.refreshExistingTokens === true;
  const backfillMissingTokens = rawOptions.backfillMissingTokens !== false;

  const createPayloads = [];
  const createSeeds = [];

  const updatePayloads = [];
  const updateSeeds = [];

  const existing = [];
  const skipped = [];

  for (const dealer of selectedDealers) {
    const dealerSummary = summarizeDealer(dealer);

    if (!dealer?.recordId) {
      skipped.push({
        ...dealerSummary,
        reason: "Selected dealer is missing Airtable recordId",
      });
      continue;
    }

    const existingRow = findExistingInvitationForDealer(dealer, existingMap);

    if (existingRow) {
      existing.push({
        ...dealerSummary,
        requestDealerRecordId: existingRow.recordId,
        requestDealerId: existingRow.requestDealerId || "",
      });

      updatePayloads.push({
        id: existingRow.recordId,
        fields: buildUpdateFields({
          existingRow,
          dealer,
          roundNumber,
          tokenOptions,
          refreshExistingTokens,
          backfillMissingTokens,
        }),
      });

      updateSeeds.push({
        ...dealerSummary,
        requestDealerRecordId: existingRow.recordId,
        requestDealerId: existingRow.requestDealerId || "",
      });

      continue;
    }

    createPayloads.push(
      buildCreateFields({
        requestData,
        dealer,
        roundNumber,
        tokenOptions,
      }),
    );

    createSeeds.push(dealerSummary);
  }

  const createdRecords = createPayloads.length
    ? await base.safeCreateMany(REQUEST_DEALER_TABLE, createPayloads)
    : [];

  const updatedRecords = updatePayloads.length
    ? await base.safeBatchUpdate(REQUEST_DEALER_TABLE, updatePayloads)
    : [];

  const created = createdRecords.map((record, index) => ({
    ...createSeeds[index],
    requestDealerRecordId: record?.id || "",
    requestDealerId: record?.fields?.["RequestDealer ID"] || "",
  }));

  const updateSeedById = new Map(
    updateSeeds.map((item) => [item.requestDealerRecordId, item]),
  );

  const refreshed = updatedRecords.map((record) => {
    const seed = updateSeedById.get(record?.id) || {};

    return {
      ...seed,
      requestDealerRecordId: record?.id || seed.requestDealerRecordId || "",
      requestDealerId:
        record?.fields?.["RequestDealer ID"] || seed.requestDealerId || "",
    };
  });

  const invitationSummary =
    rawOptions.returnInvitationSummary === false
      ? null
      : await reloadInvitationSummary(requestData.requestId);

  return {
    requestId: requestData.requestId,
    requestRecordId: requestData.recordId,
    roundNumber,
    selectedCount: selectedDealers.length,
    existingCount: existing.length,
    createdCount: created.length,
    refreshedCount: refreshed.length,
    skippedCount: skipped.length,
    created,
    refreshed,
    existing,
    skipped,
    invitationSummary,
  };
}

export default createRequestDealerRecords;
