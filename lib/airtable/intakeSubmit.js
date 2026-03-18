// lib/airtable/intakeSubmit.js
import { createBase } from "./client.js";

const base = createBase();

// Table ID
const T_REQUESTS = process.env.AIRTABLE_REQUESTS_TABLE_ID;

// Requests fields (exact Airtable field names)
const F_FIRST = process.env.AIRTABLE_REQ_FIELD_FIRST_NAME || "First Name";
const F_LAST = process.env.AIRTABLE_REQ_FIELD_LAST_NAME || "Last Name";
const F_EMAIL = process.env.AIRTABLE_REQ_FIELD_EMAIL || "Buyer Email";
const F_PHONE = process.env.AIRTABLE_REQ_FIELD_PHONE || "Buyer Phone";
const F_ZIP = process.env.AIRTABLE_REQ_FIELD_ZIP || "Buyer Zip";
const F_BUYER_STATE =
  process.env.AIRTABLE_REQ_FIELD_BUYER_STATE || "Buyer State";
const F_REGION = process.env.AIRTABLE_REQ_FIELD_REGION || "Region";

const F_YEAR = process.env.AIRTABLE_REQ_FIELD_YEAR || "Year";
const F_MAKE = process.env.AIRTABLE_REQ_FIELD_MAKE || "Make";
const F_MODEL = process.env.AIRTABLE_REQ_FIELD_MODEL || "Model";
const F_TRIM = process.env.AIRTABLE_REQ_FIELD_TRIM || "Trim";
const F_TRIM_NOTES =
  process.env.AIRTABLE_REQ_FIELD_TRIM_NOTES || "Trim Notes/Packages";
const F_ACCESSORIES =
  process.env.AIRTABLE_REQ_FIELD_ACCESSORIES || "Accessories";

const F_PURCHASE_TYPE =
  process.env.AIRTABLE_REQ_FIELD_PURCHASE_TYPE || "Purchase Type Requested";
const F_CREDIT_SCORE_RANGE =
  process.env.AIRTABLE_REQ_FIELD_CREDIT_SCORE_RANGE || "Credit Score Range";
const F_TARGET_CLOSE_TIMELINE =
  process.env.AIRTABLE_REQ_FIELD_TARGET_CLOSE_TIMELINE ||
  "Target Close Timeline";

const F_REQUEST_STATUS =
  process.env.AIRTABLE_REQ_FIELD_REQUEST_STATUS || "Request Status";
const F_PAYMENT_STATUS =
  process.env.AIRTABLE_REQ_FIELD_PAYMENT_STATUS || "Payment Status";
const F_PAYMENT_UNLOCKED =
  process.env.AIRTABLE_REQ_FIELD_PAYMENT_UNLOCKED || "Payment Unlocked";
const F_PRIORITY = process.env.AIRTABLE_REQ_FIELD_PRIORITY || "Priority";
const F_ROUND_NUMBER =
  process.env.AIRTABLE_REQ_FIELD_ROUND_NUMBER || "Round Number";
const F_R1_SENT = process.env.AIRTABLE_REQ_FIELD_R1_SENT || "R1 Sent";
const F_TARGET_DEALER_COUNT =
  process.env.AIRTABLE_REQ_FIELD_TARGET_DEALER_COUNT || "Target Dealer Count";
const F_DEALER_TIER_MAX =
  process.env.AIRTABLE_REQ_FIELD_DEALER_TIER_MAX || "Dealer Tier Max";

function requireEnv(value, name) {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function cleanString(value) {
  const stringValue = String(value ?? "").trim();
  return stringValue.length > 0 ? stringValue : "";
}

function normalizeYear(year) {
  return cleanString(year);
}

function asLinkedArray(idOrIds) {
  if (!idOrIds) return [];
  if (Array.isArray(idOrIds)) {
    return idOrIds.map((item) => cleanString(item)).filter(Boolean);
  }
  return [cleanString(idOrIds)].filter(Boolean);
}

function cleanNumber(value) {
  if (value === null || value === undefined || value === "") return undefined;

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return undefined;

  return numberValue;
}

function cleanBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return undefined;
}

function deleteEmptyFields(fields) {
  for (const key of Object.keys(fields)) {
    const value = fields[key];

    if (value === "" || value === undefined) {
      delete fields[key];
      continue;
    }

    if (Array.isArray(value) && value.length === 0) {
      delete fields[key];
    }
  }

  return fields;
}

export async function createBuyerRequest(payload) {
  requireEnv(T_REQUESTS, "AIRTABLE_REQUESTS_TABLE_ID");

  if (!payload || typeof payload !== "object") {
    throw new Error("createBuyerRequest: payload must be an object");
  }

  const firstName = cleanString(payload.firstName);
  const lastName = cleanString(payload.lastName);
  const buyerEmail = cleanString(payload.buyerEmail);
  const buyerPhone = cleanString(payload.buyerPhone);
  const buyerZip = cleanString(payload.buyerZip);

  const year = normalizeYear(payload.year);
  const makeIds = asLinkedArray(payload.makeIds ?? payload.makeId);
  const modelIds = asLinkedArray(payload.modelIds ?? payload.modelId);
  const trimIds = asLinkedArray(payload.trimIds ?? payload.trimId);

  const trimNotesPackages = cleanString(payload.trimNotesPackages);
  const accessories = cleanString(payload.accessories);

  const purchaseType = cleanString(payload.purchaseType);
  const creditScoreRange = cleanString(payload.creditScoreRange);
  const targetCloseTimeline = cleanString(payload.targetCloseTimeline);

  const buyerState = cleanString(payload.buyerState);
  const region = cleanString(payload.region);

  const requestStatus = cleanString(payload.requestStatus);
  const paymentStatus = cleanString(payload.paymentStatus);
  const priority = cleanString(payload.priority);
  const roundNumber = cleanString(payload.roundNumber ?? payload.currentRound);

  const paymentUnlocked = cleanBoolean(payload.paymentUnlocked);
  const r1Sent = cleanBoolean(payload.r1Sent);

  const targetDealerCount = cleanNumber(payload.targetDealerCount);
  const dealerTierMax = cleanNumber(payload.dealerTierMax);

  if (!firstName) throw new Error("Missing required field: firstName");
  if (!lastName) throw new Error("Missing required field: lastName");
  if (!buyerEmail) throw new Error("Missing required field: buyerEmail");
  if (!buyerPhone) throw new Error("Missing required field: buyerPhone");
  if (!buyerZip) throw new Error("Missing required field: buyerZip");
  if (!year) throw new Error("Missing required field: year");
  if (!makeIds.length) throw new Error("Missing required field: makeId");
  if (!modelIds.length) throw new Error("Missing required field: modelId");
  if (!trimIds.length) throw new Error("Missing required field: trimId");
  if (!purchaseType) throw new Error("Missing required field: purchaseType");
  if (!targetCloseTimeline) {
    throw new Error("Missing required field: targetCloseTimeline");
  }

  const fields = {
    [F_FIRST]: firstName,
    [F_LAST]: lastName,
    [F_EMAIL]: buyerEmail,
    [F_PHONE]: buyerPhone,
    [F_ZIP]: buyerZip,
    [F_BUYER_STATE]: buyerState,
    [F_REGION]: region,

    [F_YEAR]: year,
    [F_MAKE]: makeIds,
    [F_MODEL]: modelIds,
    [F_TRIM]: trimIds,
    [F_TRIM_NOTES]: trimNotesPackages,
    [F_ACCESSORIES]: accessories,

    [F_PURCHASE_TYPE]: purchaseType,
    [F_CREDIT_SCORE_RANGE]: creditScoreRange,
    [F_TARGET_CLOSE_TIMELINE]: targetCloseTimeline,

    [F_REQUEST_STATUS]: requestStatus,
    [F_PAYMENT_STATUS]: paymentStatus,
    [F_PAYMENT_UNLOCKED]: paymentUnlocked,
    [F_PRIORITY]: priority,
    [F_ROUND_NUMBER]: roundNumber,
    [F_R1_SENT]: r1Sent,
    [F_TARGET_DEALER_COUNT]: targetDealerCount,
    [F_DEALER_TIER_MAX]: dealerTierMax,
  };

  deleteEmptyFields(fields);

  const record = await base.safeCreate(T_REQUESTS, fields);

  return {
    id: record.id,
    createdTime: record.createdTime,
  };
}
