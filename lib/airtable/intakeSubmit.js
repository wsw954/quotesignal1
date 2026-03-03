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

function requireEnv(value, name) {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function asLinkedArray(idOrIds) {
  // Airtable expects linked-record fields as an array of record IDs.
  if (!idOrIds) return [];
  if (Array.isArray(idOrIds)) return idOrIds.filter(Boolean);
  return [idOrIds].filter(Boolean);
}

function cleanString(v) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

function normalizeYear(year) {
  // Year is a single select in Airtable.
  // Send exactly the label, e.g. "2026" or "Not Sure".
  const y = cleanString(year);
  return y || "";
}

/**
 * createBuyerRequest(payload)
 *
 * Expected payload shape (suggested):
 * {
 *   year: "2026" | "Not Sure",
 *   makeId: "rec....",
 *   modelId: "rec....",
 *   trimIds: ["rec...."] OR trimId: "rec....",
 *   firstName: "...",
 *   lastName: "...",
 *   email: "...",
 *   phone: "...",
 *   zip: "33319"
 * }
 */
export async function createBuyerRequest(payload) {
  requireEnv(T_REQUESTS, "AIRTABLE_REQUESTS_TABLE_ID");
  if (!payload || typeof payload !== "object") {
    throw new Error("createBuyerRequest: payload must be an object");
  }

  const year = normalizeYear(payload.year);

  // Linked IDs
  const makeIds = asLinkedArray(payload.makeId);
  const modelIds = asLinkedArray(payload.modelId);

  // Trim can be passed as trimId OR trimIds (array)
  const trimIds = asLinkedArray(payload.trimIds ?? payload.trimId);

  // Basic strings
  const firstName = cleanString(payload.firstName);
  const lastName = cleanString(payload.lastName);
  const email = cleanString(payload.email);
  const phone = cleanString(payload.phone);
  const zip = cleanString(payload.zip);

  // Minimal “don’t create garbage” validation
  // (Feel free to loosen/tighten this based on your intake rules.)
  if (!email) throw new Error("Missing required field: email");
  if (!makeIds.length) throw new Error("Missing required field: makeId");
  if (!modelIds.length) throw new Error("Missing required field: modelId");
  if (!trimIds.length)
    throw new Error("Missing required field: trimId/trimIds");
  if (!year) throw new Error("Missing required field: year");

  // Build Airtable fields payload
  // NOTE: Linked record fields must be arrays even when “single select” in UI.
  const fields = {
    [F_YEAR]: year,
    [F_MAKE]: makeIds,
    [F_MODEL]: modelIds,
    [F_TRIM]: trimIds,

    [F_FIRST]: firstName,
    [F_LAST]: lastName,
    [F_EMAIL]: email,
    [F_PHONE]: phone,
    [F_ZIP]: zip,
  };

  // Optional: remove empty string fields so Airtable stays cleaner
  for (const key of Object.keys(fields)) {
    if (fields[key] === "") delete fields[key];
    if (Array.isArray(fields[key]) && fields[key].length === 0)
      delete fields[key];
  }

  const record = await base.safeCreate(T_REQUESTS, fields);

  return {
    id: record.id,
    createdTime: record.createdTime,
  };
}
