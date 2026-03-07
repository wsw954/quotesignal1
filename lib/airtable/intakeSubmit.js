// lib/airtable/intakeSubmit.js
import { createBase } from "./client.js";

const base = createBase();

// Table ID
const T_REQUESTS = process.env.AIRTABLE_REQUESTS_TABLE_ID;

// Requests fields (exact Airtable field names)
const F_YEAR = process.env.AIRTABLE_REQ_FIELD_YEAR || "Year";
const F_MAKE = process.env.AIRTABLE_REQ_FIELD_MAKE || "Make";
const F_MODEL = process.env.AIRTABLE_REQ_FIELD_MODEL || "Model";
const F_TRIM = process.env.AIRTABLE_REQ_FIELD_TRIM || "Trim";
const F_FIRST = process.env.AIRTABLE_REQ_FIELD_FIRST_NAME || "First Name";
const F_LAST = process.env.AIRTABLE_REQ_FIELD_LAST_NAME || "Last Name";
const F_EMAIL = process.env.AIRTABLE_REQ_FIELD_EMAIL || "Buyer Email";
const F_PHONE = process.env.AIRTABLE_REQ_FIELD_PHONE || "Buyer Phone";
const F_ZIP = process.env.AIRTABLE_REQ_FIELD_ZIP || "Buyer Zip";
const F_PURCHASE_TYPE =
  process.env.AIRTABLE_REQ_FIELD_PURCHASE_TYPE || "Purchase Type";
const F_CREDIT_SCORE_RANGE =
  process.env.AIRTABLE_REQ_FIELD_CREDIT_SCORE_RANGE || "Credit Score Range";

function requireEnv(value, name) {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function asLinkedArray(idOrIds) {
  if (!idOrIds) return [];
  if (Array.isArray(idOrIds)) return idOrIds.filter(Boolean);
  return [idOrIds].filter(Boolean);
}

function cleanString(v) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

function normalizeYear(year) {
  const y = cleanString(year);
  return y || "";
}

export async function createBuyerRequest(payload) {
  requireEnv(T_REQUESTS, "AIRTABLE_REQUESTS_TABLE_ID");

  if (!payload || typeof payload !== "object") {
    throw new Error("createBuyerRequest: payload must be an object");
  }

  const year = normalizeYear(payload.year);

  const makeIds = asLinkedArray(payload.makeId);
  const modelIds = asLinkedArray(payload.modelId);
  const trimIds = asLinkedArray(payload.trimIds ?? payload.trimId);

  const firstName = cleanString(payload.firstName);
  const lastName = cleanString(payload.lastName);
  const email = cleanString(payload.email);
  const phone = cleanString(payload.phone);
  const zip = cleanString(payload.zip);
  const purchaseType = cleanString(payload.purchaseType);
  const creditScoreRange = cleanString(payload.creditScoreRange);

  // Current MVP hard requirements
  if (!makeIds.length) throw new Error("Missing required field: makeId");
  if (!modelIds.length) throw new Error("Missing required field: modelId");
  if (!trimIds.length)
    throw new Error("Missing required field: trimId/trimIds");

  const fields = {
    [F_MAKE]: makeIds,
    [F_MODEL]: modelIds,
    [F_TRIM]: trimIds,
  };

  // Optional / later-phase fields
  if (year) fields[F_YEAR] = year;
  if (firstName) fields[F_FIRST] = firstName;
  if (lastName) fields[F_LAST] = lastName;
  if (email) fields[F_EMAIL] = email;
  if (phone) fields[F_PHONE] = phone;
  if (zip) fields[F_ZIP] = zip;
  if (purchaseType) fields[F_PURCHASE_TYPE] = purchaseType;
  if (creditScoreRange) fields[F_CREDIT_SCORE_RANGE] = creditScoreRange;

  for (const key of Object.keys(fields)) {
    if (fields[key] === "") delete fields[key];
    if (Array.isArray(fields[key]) && fields[key].length === 0) {
      delete fields[key];
    }
  }

  const record = await base.safeCreate(T_REQUESTS, fields);

  return {
    id: record.id,
    createdTime: record.createdTime,
  };
}
