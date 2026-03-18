// /lib/airtable/workflowActions.js

import { createBase } from "./client";
import { getRequestData } from "./requestData";
import { getDealerSelectionPreview } from "./dealerData";
import { getInvitationData } from "./invitationData";

const base = createBase();

const REQUESTS_TABLE = "Requests";
const REQUEST_DEALER_TABLE = "RequestDealer";

export const REQUEST_STATUS = {
  NEW_UNREVIEWED: "New (Unreviewed)",
  NEEDS_CLARIFICATION: "Needs Clarification",
  READY_FOR_PAYMENT: "Ready For Payment",
  PAID_READY_FOR_RFQ: "Paid / Ready for RFQ",
  RFQ_SENT: "RFQ Sent",
  BIDDING_LIVE_R1: "Bidding Live (R1)",
  WAITING_ON_BUYER_R1: "Waiting on Buyer Decision (R1)",
  BIDDING_LIVE_R2: "Bidding Live (R2)",
  WAITING_ON_BUYER_R2: "Waiting on Buyer Decision (R2)",
  WINNER_SELECTED: "Winner Selected",
  CLOSED_WON: "Closed (Won)",
  CLOSED_NO_SALE: "Closed (No Sale)",
};

export const DEALER_SELECTION_STATUS = {
  NOT_STARTED: "Not Started",
  MATCHING_IN_PROGRESS: "Matching In Progress",
  NEEDS_REVIEW: "Needs Review",
  READY_FOR_INVITATIONS: "Ready for Invitations",
  INVITATIONS_CREATED: "Invitations Created",
  COMPLETE: "Complete",
  NO_ELIGIBLE_DEALERS: "No Eligible Dealers",
};

export const INVITATION_SELECTION_STATUS = {
  PENDING_REVIEW: "Pending Review",
  SELECTED: "Selected",
  EXCLUDED: "Excluded",
  CANCELLED: "Cancelled",
};

export const RFQ_SEND_STATUS = {
  NOT_READY: "Not Ready",
  READY_TO_SEND: "Ready To Send",
  SENT: "Sent",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const DEALER_RESPONSE_STATUS = {
  AWAITING_RESPONSE: "Awaiting Response",
  QUOTE_SUBMITTED: "Quote Submitted",
  DECLINED: "Declined",
  NO_RESPONSE: "No Response",
  WITHDRAWN: "Withdrawn",
};

function nowIso() {
  return new Date().toISOString();
}

async function resolveRequestData(requestInput) {
  if (!requestInput) {
    throw new Error(
      "resolveRequestData requires a request object or Request ID",
    );
  }

  if (typeof requestInput === "string") {
    return getRequestData(requestInput);
  }

  return requestInput;
}

function uniqueRecordIds(rows) {
  return [...new Set(rows.map((row) => row?.recordId).filter(Boolean))];
}

function getCurrentRound(requestData) {
  return requestData?.workflow?.roundNumber || "R1";
}

function getSelectedInvitationRows(rows = [], roundNumber) {
  return rows.filter(
    (row) =>
      row?.roundNumber === roundNumber &&
      row?.selectionStatus === INVITATION_SELECTION_STATUS.SELECTED,
  );
}

function getQuotedInvitationRows(rows = [], roundNumber) {
  return rows.filter(
    (row) =>
      row?.roundNumber === roundNumber &&
      (row?.quoteSubmitted || row?.statusBucket === "quoted"),
  );
}

function getPendingDealerReviewRows(rows = []) {
  return rows.filter(
    (row) => row?.quoteSubmitted && !row?.dealerReviewReleased,
  );
}

function buildWorkflowGates({
  requestData,
  dealerSelection,
  invitations,
  currentRound,
}) {
  const selectedCurrentRoundRows = getSelectedInvitationRows(
    invitations.rows,
    currentRound,
  );

  const quotedCurrentRoundRows = getQuotedInvitationRows(
    invitations.rows,
    currentRound,
  );

  const pendingDealerReviewRows = getPendingDealerReviewRows(invitations.rows);

  const hasInvitations = invitations.total > 0;
  const isClosed = requestData.flags.isClosed;
  const hasBuyerDecision = requestData.flags.hasBuyerDecision;
  const hasRound2BeenSent = Boolean(requestData.workflow.sendStatus?.r2SentAt);
  const hasRound1BeenSent = Boolean(
    requestData.workflow.sendStatus?.r1Sent ||
    requestData.workflow.sendStatus?.r1SentAt,
  );

  return {
    canMarkNeedsReview: !isClosed && dealerSelection.candidateCount > 0,

    canMarkReadyForInvitations: !isClosed && dealerSelection.candidateCount > 0,

    canMarkNoEligibleDealers:
      !isClosed && dealerSelection.candidateCount === 0 && !hasInvitations,

    canGenerateInvitations:
      !isClosed &&
      !hasInvitations &&
      dealerSelection.candidateCount > 0 &&
      requestData.workflow.dealerSelectionStatus ===
        DEALER_SELECTION_STATUS.READY_FOR_INVITATIONS,

    canSendRound1:
      !isClosed &&
      currentRound === "R1" &&
      !hasRound1BeenSent &&
      selectedCurrentRoundRows.length > 0,

    canSendRound2:
      !isClosed &&
      currentRound === "R2" &&
      requestData.workflow.round2Triggered &&
      !hasRound2BeenSent &&
      selectedCurrentRoundRows.length > 0,

    canMarkBuyerReviewReady:
      !isClosed &&
      requestData.metrics.compliantQuotes > 0 &&
      quotedCurrentRoundRows.length > 0,

    canReleaseDealerReview:
      (hasBuyerDecision || Boolean(requestData.workflow.requestClosedAt)) &&
      pendingDealerReviewRows.length > 0,

    canCloseRequest: hasBuyerDecision && !isClosed,
  };
}

export async function getWorkflowSnapshot(requestInput) {
  const requestData = await resolveRequestData(requestInput);

  const [dealerSelection, invitations] = await Promise.all([
    getDealerSelectionPreview(requestData),
    getInvitationData(requestData),
  ]);

  const currentRound = getCurrentRound(requestData);
  const selectedCurrentRoundRows = getSelectedInvitationRows(
    invitations.rows,
    currentRound,
  );
  const quotedCurrentRoundRows = getQuotedInvitationRows(
    invitations.rows,
    currentRound,
  );
  const pendingDealerReviewRows = getPendingDealerReviewRows(invitations.rows);

  return {
    requestData,
    dealerSelection,
    invitations,
    currentRound,

    counts: {
      candidateCount: dealerSelection.candidateCount,
      selectedCandidateCount: dealerSelection.selectedCount,
      excludedCandidateCount: dealerSelection.excludedCount,

      invitationCount: invitations.total,
      selectedInvitationCount: invitations.rows.filter(
        (row) => row.selectionStatus === INVITATION_SELECTION_STATUS.SELECTED,
      ).length,
      quotedInvitationCount: invitations.quoted,
      readyInvitationCount: invitations.ready,
      sentInvitationCount: invitations.sent,
      pendingInvitationCount: invitations.pending,

      currentRoundSelectedInvitationCount: selectedCurrentRoundRows.length,
      currentRoundQuotedInvitationCount: quotedCurrentRoundRows.length,
      pendingDealerReviewCount: pendingDealerReviewRows.length,
    },

    gates: buildWorkflowGates({
      requestData,
      dealerSelection,
      invitations,
      currentRound,
    }),
  };
}

async function updateRequestFields(requestInput, fields) {
  const requestData = await resolveRequestData(requestInput);

  await base.safeUpdate(REQUESTS_TABLE, requestData.recordId, fields);

  return getWorkflowSnapshot(requestData.requestId);
}

async function batchUpdateInvitationFields(recordIds, fields) {
  const ids = [...new Set((recordIds || []).filter(Boolean))];

  if (!ids.length) {
    return [];
  }

  return base.safeBatchUpdate(
    REQUEST_DEALER_TABLE,
    ids.map((id) => ({
      id,
      fields,
    })),
  );
}

export async function markDealerSelectionStatus(
  requestInput,
  dealerSelectionStatus,
  extraRequestFields = {},
) {
  return updateRequestFields(requestInput, {
    "Dealer Selection Status": dealerSelectionStatus,
    ...extraRequestFields,
  });
}

export async function markRequestStatus(
  requestInput,
  requestStatus,
  extraRequestFields = {},
) {
  return updateRequestFields(requestInput, {
    "Request Status": requestStatus,
    ...extraRequestFields,
  });
}

export async function markNeedsReview(requestInput) {
  const snapshot = await getWorkflowSnapshot(requestInput);

  if (!snapshot.gates.canMarkNeedsReview) {
    throw new Error(
      "Cannot mark Needs Review without eligible candidate dealers",
    );
  }

  return markDealerSelectionStatus(
    snapshot.requestData.requestId,
    DEALER_SELECTION_STATUS.NEEDS_REVIEW,
  );
}

export async function markReadyForInvitations(requestInput) {
  const snapshot = await getWorkflowSnapshot(requestInput);

  if (!snapshot.gates.canMarkReadyForInvitations) {
    throw new Error(
      "Cannot mark Ready for Invitations without candidate dealers",
    );
  }

  return markDealerSelectionStatus(
    snapshot.requestData.requestId,
    DEALER_SELECTION_STATUS.READY_FOR_INVITATIONS,
  );
}

export async function markNoEligibleDealers(requestInput) {
  const snapshot = await getWorkflowSnapshot(requestInput);

  if (!snapshot.gates.canMarkNoEligibleDealers) {
    throw new Error(
      "Cannot mark No Eligible Dealers while invitations already exist or candidates are present",
    );
  }

  return markDealerSelectionStatus(
    snapshot.requestData.requestId,
    DEALER_SELECTION_STATUS.NO_ELIGIBLE_DEALERS,
  );
}

export async function markInvitationsCreated(requestInput) {
  const snapshot = await getWorkflowSnapshot(requestInput);

  if (snapshot.invitations.total < 1) {
    throw new Error(
      "Cannot mark Invitations Created because no RequestDealer records exist yet",
    );
  }

  return markDealerSelectionStatus(
    snapshot.requestData.requestId,
    DEALER_SELECTION_STATUS.INVITATIONS_CREATED,
  );
}

export async function markRound1SendReady(requestInput) {
  const snapshot = await getWorkflowSnapshot(requestInput);
  const selectedRows = getSelectedInvitationRows(
    snapshot.invitations.rows,
    "R1",
  );

  if (!selectedRows.length) {
    throw new Error("No selected Round 1 invitations found");
  }

  const updatableRows = selectedRows.filter(
    (row) =>
      row.rfqSendStatus !== RFQ_SEND_STATUS.SENT &&
      row.rfqSendStatus !== RFQ_SEND_STATUS.CANCELLED,
  );

  await batchUpdateInvitationFields(uniqueRecordIds(updatableRows), {
    "RFQ Send Status": RFQ_SEND_STATUS.READY_TO_SEND,
  });

  return getWorkflowSnapshot(snapshot.requestData.requestId);
}

export async function stampRound1Sent(requestInput) {
  const snapshot = await getWorkflowSnapshot(requestInput);

  if (!snapshot.gates.canSendRound1) {
    throw new Error("Round 1 is not eligible to send");
  }

  const timestamp = nowIso();
  const selectedRows = getSelectedInvitationRows(
    snapshot.invitations.rows,
    "R1",
  );

  await batchUpdateInvitationFields(uniqueRecordIds(selectedRows), {
    "RFQ Send Status": RFQ_SEND_STATUS.SENT,
    "RFQ Sent At": timestamp,
    "Dealer Response Status": DEALER_RESPONSE_STATUS.AWAITING_RESPONSE,
  });

  return updateRequestFields(snapshot.requestData.requestId, {
    "Request Status": REQUEST_STATUS.BIDDING_LIVE_R1,
    "Dealer Selection Status": DEALER_SELECTION_STATUS.INVITATIONS_CREATED,
    "Round Number": "R1",
    "RFQ Round 1 Sent At": timestamp,
    "R1 Sent": true,
    "Review Ready?": false,
  });
}

export async function triggerRound2(requestInput, extraRequestFields = {}) {
  const snapshot = await getWorkflowSnapshot(requestInput);

  if (snapshot.requestData.flags.isClosed) {
    throw new Error("Cannot trigger Round 2 on a closed Request");
  }

  const timestamp = nowIso();

  return updateRequestFields(snapshot.requestData.requestId, {
    "Round Number": "R2",
    "Round 2 Triggered?": true,
    "Round 2 Triggered Time": timestamp,
    "Review Ready?": false,
    ...extraRequestFields,
  });
}

export async function markRound2SendReady(requestInput) {
  const snapshot = await getWorkflowSnapshot(requestInput);
  const selectedRows = getSelectedInvitationRows(
    snapshot.invitations.rows,
    "R2",
  );

  if (!selectedRows.length) {
    throw new Error("No selected Round 2 invitations found");
  }

  const updatableRows = selectedRows.filter(
    (row) =>
      row.rfqSendStatus !== RFQ_SEND_STATUS.SENT &&
      row.rfqSendStatus !== RFQ_SEND_STATUS.CANCELLED,
  );

  await batchUpdateInvitationFields(uniqueRecordIds(updatableRows), {
    "RFQ Send Status": RFQ_SEND_STATUS.READY_TO_SEND,
  });

  return getWorkflowSnapshot(snapshot.requestData.requestId);
}

export async function stampRound2Sent(requestInput) {
  const snapshot = await getWorkflowSnapshot(requestInput);

  if (!snapshot.gates.canSendRound2) {
    throw new Error("Round 2 is not eligible to send");
  }

  const timestamp = nowIso();
  const selectedRows = getSelectedInvitationRows(
    snapshot.invitations.rows,
    "R2",
  );

  await batchUpdateInvitationFields(uniqueRecordIds(selectedRows), {
    "RFQ Send Status": RFQ_SEND_STATUS.SENT,
    "RFQ Sent At": timestamp,
    "Dealer Response Status": DEALER_RESPONSE_STATUS.AWAITING_RESPONSE,
  });

  return updateRequestFields(snapshot.requestData.requestId, {
    "Request Status": REQUEST_STATUS.BIDDING_LIVE_R2,
    "Round Number": "R2",
    "RFQ Round 2 Sent At": timestamp,
    "Review Ready?": false,
  });
}

export async function markBuyerReviewReady(requestInput) {
  const snapshot = await getWorkflowSnapshot(requestInput);

  if (!snapshot.gates.canMarkBuyerReviewReady) {
    throw new Error("Buyer review is not ready yet");
  }

  const nextStatus =
    snapshot.currentRound === "R2"
      ? REQUEST_STATUS.WAITING_ON_BUYER_R2
      : REQUEST_STATUS.WAITING_ON_BUYER_R1;

  const extraFields =
    snapshot.currentRound === "R1" ? { "Round 1 Closed At": nowIso() } : {};

  return updateRequestFields(snapshot.requestData.requestId, {
    "Request Status": nextStatus,
    "Review Ready?": true,
    ...extraFields,
  });
}

export async function releaseDealerReview(
  requestInput,
  { stampEmailSentAt = false } = {},
) {
  const snapshot = await getWorkflowSnapshot(requestInput);

  if (!snapshot.gates.canReleaseDealerReview) {
    throw new Error("Dealer review cannot be released yet");
  }

  const timestamp = nowIso();
  const pendingRows = getPendingDealerReviewRows(snapshot.invitations.rows);

  const fields = {
    "Dealer Review Released?": true,
  };

  if (stampEmailSentAt) {
    fields["Dealer Review Email Sent At"] = timestamp;
  }

  await batchUpdateInvitationFields(uniqueRecordIds(pendingRows), fields);

  return getWorkflowSnapshot(snapshot.requestData.requestId);
}

export async function closeRequest(
  requestInput,
  { status = REQUEST_STATUS.CLOSED_NO_SALE } = {},
) {
  if (
    status !== REQUEST_STATUS.CLOSED_WON &&
    status !== REQUEST_STATUS.CLOSED_NO_SALE
  ) {
    throw new Error(
      "closeRequest only accepts Closed (Won) or Closed (No Sale)",
    );
  }

  return updateRequestFields(requestInput, {
    "Request Status": status,
    "Request Closed At": nowIso(),
    "Review Ready?": false,
  });
}
