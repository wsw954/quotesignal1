// /lib/workflow/rfqPayloadBuilder.js

import { getRequestData } from "@/lib/airtable/requestData";
import { getInvitationData } from "@/lib/airtable/invitationData";

function normalizeRoundNumber(value) {
  const round = String(value || "")
    .trim()
    .toUpperCase();

  return round === "R2" ? "R2" : "R1";
}

function normalizeTemplateType(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "intro") return "Intro";
  if (normalized === "standard") return "Standard";

  return "";
}

function resolveTemplateType({ invitationTemplateType, dealerStatus }) {
  const explicit = normalizeTemplateType(invitationTemplateType);
  if (explicit) return explicit;

  return String(dealerStatus || "").trim() === "New" ? "Intro" : "Standard";
}

async function resolveRequestData(requestInput) {
  if (!requestInput) {
    throw new Error(
      "buildRound1RfqPayload requires a request object or Request ID",
    );
  }

  if (typeof requestInput === "string") {
    return getRequestData(requestInput);
  }

  return requestInput;
}

function buildAbsoluteUrl(baseUrl, path) {
  const safePath = path.startsWith("/") ? path : `/${path}`;

  if (!baseUrl) {
    return safePath;
  }

  return `${String(baseUrl).replace(/\/$/, "")}${safePath}`;
}

function buildSubject(requestData, roundNumber) {
  const prefix = requestData?.emailSubjectTag
    ? `[${requestData.emailSubjectTag}]`
    : "[QuoteSignal RFQ]";

  const pieces = [
    prefix,
    roundNumber,
    requestData?.requestId || "",
    requestData?.vehicle?.vehicleSpec || "",
  ].filter(Boolean);

  return pieces.join(" • ");
}

function buildValidationErrors(row) {
  const errors = [];

  if (!row?.dealerEmail) {
    errors.push("Missing dealer email");
  }

  if (!row?.dealerQuoteToken) {
    errors.push("Missing dealer quote token");
  }

  if (!row?.requestDealerId && !row?.recordId) {
    errors.push("Missing RequestDealer identity");
  }

  return errors;
}

export async function buildRound1RfqPayload(requestInput, rawOptions = {}) {
  const requestData = await resolveRequestData(requestInput);
  const invitations =
    rawOptions.invitations || (await getInvitationData(requestData));

  const roundNumber = normalizeRoundNumber(
    rawOptions.roundNumber || requestData?.workflow?.roundNumber || "R1",
  );

  const baseUrl =
    rawOptions.baseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    "";

  const subject = buildSubject(requestData, roundNumber);

  const selectedRows = (invitations?.rows || []).filter(
    (row) =>
      normalizeRoundNumber(row?.roundNumber) === roundNumber &&
      row?.selectionStatus === "Selected",
  );

  const mappedRows = selectedRows.map((row) => {
    const templateType = resolveTemplateType({
      invitationTemplateType: row?.rfqTemplateType,
      dealerStatus: row?.dealerStatus,
    });

    const dealerQuoteUrl = buildAbsoluteUrl(
      baseUrl,
      `/dealer/quote/${encodeURIComponent(row?.dealerQuoteToken || "")}`,
    );

    const validationErrors = buildValidationErrors(row);
    const sendable = validationErrors.length === 0;

    return {
      requestDealerRecordId: row?.recordId || "",
      requestDealerId: row?.requestDealerId || row?.id || "",

      dealerRecordId: row?.dealerRecordId || "",
      dealerId: row?.dealerId || "",
      dealerName: row?.dealerName || "",
      dealerContact: row?.dealerMainContact || row?.dealerName || "",
      dealerEmail: row?.dealerEmail || "",
      dealerPhone: row?.dealerPhone || "",
      dealerStatus: row?.dealerStatus || "",

      currentTemplateType: row?.rfqTemplateType || "",
      templateType,

      roundNumber,
      subject,
      dealerQuoteToken: row?.dealerQuoteToken || "",
      dealerQuoteUrl,

      requestContext: {
        requestId: requestData?.requestId || "",
        emailSubjectTag: requestData?.emailSubjectTag || "",
        vehicleSpec: requestData?.vehicle?.vehicleSpec || "",
        year: requestData?.vehicle?.year || "",
        make: requestData?.vehicle?.make || "",
        model: requestData?.vehicle?.model || "",
        trim: requestData?.vehicle?.trim || "",
        purchaseTypeRequested:
          requestData?.request?.purchaseTypeRequested || "",
        creditScoreRange: requestData?.request?.creditScoreRange || "",
        buyerRegion: requestData?.buyer?.region || "",
        buyerState: requestData?.buyer?.state || "",
        buyerZip: requestData?.buyer?.zip || "",
        targetCloseTimeline: requestData?.request?.targetCloseTimeline || "",
      },

      mergeFields: {
        request_id: requestData?.requestId || "",
        round_number: roundNumber,
        dealer_name: row?.dealerName || "",
        dealer_contact: row?.dealerMainContact || row?.dealerName || "",
        vehicle_spec: requestData?.vehicle?.vehicleSpec || "",
        year: requestData?.vehicle?.year || "",
        make: requestData?.vehicle?.make || "",
        model: requestData?.vehicle?.model || "",
        trim: requestData?.vehicle?.trim || "",
        purchase_type: requestData?.request?.purchaseTypeRequested || "",
        buyer_region: requestData?.buyer?.region || "",
        buyer_state: requestData?.buyer?.state || "",
        buyer_zip: requestData?.buyer?.zip || "",
        target_close_timeline: requestData?.request?.targetCloseTimeline || "",
        dealer_quote_url: dealerQuoteUrl,
        template_type: templateType,
      },

      validationErrors,
      sendable,
    };
  });

  const payloads = mappedRows.filter((row) => row.sendable);
  const invalidRows = mappedRows.filter((row) => !row.sendable);

  const introCount = payloads.filter(
    (row) => row.templateType === "Intro",
  ).length;

  const standardCount = payloads.filter(
    (row) => row.templateType === "Standard",
  ).length;

  const templateBackfills = mappedRows
    .filter(
      (row) =>
        row.requestDealerRecordId &&
        row.templateType &&
        row.templateType !== row.currentTemplateType,
    )
    .map((row) => ({
      id: row.requestDealerRecordId,
      templateType: row.templateType,
    }));

  return {
    requestId: requestData?.requestId || "",
    requestRecordId: requestData?.recordId || "",
    roundNumber,
    subject,

    selectedInvitationCount: selectedRows.length,
    payloadCount: payloads.length,
    invalidCount: invalidRows.length,

    introCount,
    standardCount,

    payloads,
    invalidRows,
    templateBackfills,
  };
}

export default buildRound1RfqPayload;
