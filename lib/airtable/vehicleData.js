// lib/airtable/vehicleData.js
import { createBase } from "./client.js";

const base = createBase();

// TABLE IDS
const T_MAKES = process.env.AIRTABLE_MAKES_TABLE_ID;
const T_MODELS = process.env.AIRTABLE_MODELS_TABLE_ID;
const T_TRIMS = process.env.AIRTABLE_TRIMS_TABLE_ID;

// DISPLAY (LABEL) FIELDS
const F_MAKE_NAME = process.env.AIRTABLE_MAKES_NAME_FIELD || "Make";
const F_MODEL_NAME = process.env.AIRTABLE_MODELS_NAME_FIELD || "Model";
const F_TRIM_NAME = process.env.AIRTABLE_TRIMS_NAME_FIELD || "Trim";

// LINKED FIELDS (RELATIONSHIPS)
const F_MODELS_LINKED_MAKE =
  process.env.AIRTABLE_MODELS_LINKED_MAKE_FIELD || "Make";
const F_TRIMS_LINKED_MODEL =
  process.env.AIRTABLE_TRIMS_LINKED_MODEL_FIELD || "Model";

function requireEnv(value, name) {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function toOption(record, nameField) {
  return {
    id: record.id,
    name: record.fields?.[nameField] ?? "",
  };
}

// --- helpers ---
function normalizeToTokens(v) {
  if (v == null) return [];

  // Linked-record fields often come back as arrays
  if (Array.isArray(v)) {
    return v.map((x) => String(x).trim()).filter(Boolean);
  }

  // Lookup/text fields sometimes come back as "Accord, Civic"
  const s = String(v).trim();
  if (!s) return [];

  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function includesToken(fieldValue, needle) {
  if (!needle) return false;
  const n = String(needle).trim().toLowerCase();
  if (!n) return false;

  const tokens = normalizeToTokens(fieldValue).map((t) => t.toLowerCase());
  return tokens.includes(n);
}

// Fetch the display name for a record ID from a table
async function getNameById(tableId, nameField, recordId) {
  if (!recordId) return "";
  const data = await base.safeSelect(tableId, {
    fields: [nameField],
    filterByFormula: `RECORD_ID()="${recordId}"`,
  });
  const rec = (data.records || [])[0];
  return rec?.fields?.[nameField] ?? "";
}

/**
 * getMakes(): [{ id, name }]
 */
export async function getMakes() {
  requireEnv(T_MAKES, "AIRTABLE_MAKES_TABLE_ID");

  const data = await base.safeSelect(T_MAKES, {
    fields: [F_MAKE_NAME],
    sort: [{ field: F_MAKE_NAME, direction: "asc" }],
  });

  return (data.records || [])
    .map((r) => toOption(r, F_MAKE_NAME))
    .filter((x) => x.name);
}

/**
 * getModelsByMake(makeId): [{ id, name }]
 */
export async function getModelsByMake(makeId) {
  requireEnv(T_MAKES, "AIRTABLE_MAKES_TABLE_ID");
  requireEnv(T_MODELS, "AIRTABLE_MODELS_TABLE_ID");
  if (!makeId) return [];

  const makeName = await getNameById(T_MAKES, F_MAKE_NAME, makeId);

  // Pull models and filter in JS so it works whether {Make} is IDs or text
  const data = await base.safeSelect(T_MODELS, {
    fields: [F_MODEL_NAME, F_MODELS_LINKED_MAKE],
  });

  const models = (data.records || [])
    .filter((r) => {
      const v = r.fields?.[F_MODELS_LINKED_MAKE];
      // match either by record id OR by make display name
      return includesToken(v, makeId) || includesToken(v, makeName);
    })
    .map((r) => toOption(r, F_MODEL_NAME))
    .filter((x) => x.name);

  models.sort((a, b) => a.name.localeCompare(b.name));
  return models;
}

/**
 * getTrimsByModel(modelId): [{ id, name }]
 * Uses linked field in Trims table: {Model} contains selected model record ID.
 * Also moves "Not sure/Other" (and similar) to the bottom for a cleaner UX.
 */
export async function getTrimsByModel(modelId) {
  requireEnv(T_MODELS, "AIRTABLE_MODELS_TABLE_ID");
  requireEnv(T_TRIMS, "AIRTABLE_TRIMS_TABLE_ID");
  if (!modelId) return [];

  const modelName = await getNameById(T_MODELS, F_MODEL_NAME, modelId);

  const data = await base.safeSelect(T_TRIMS, {
    fields: [F_TRIM_NAME, F_TRIMS_LINKED_MODEL],
  });

  const trims = (data.records || [])
    .filter((r) => {
      const v = r.fields?.[F_TRIMS_LINKED_MODEL];
      return includesToken(v, modelId) || includesToken(v, modelName);
    })
    .map((r) => toOption(r, F_TRIM_NAME))
    .filter((x) => x.name);

  // Keep your “Not sure/Other” bottom behavior (same as before) :contentReference[oaicite:2]{index=2}
  const isNotSure = (s) => {
    const v = String(s || "").toLowerCase();
    return v.includes("not sure") || v.includes("other") || v === "n/a";
  };

  trims.sort((a, b) => {
    const aNS = isNotSure(a.name);
    const bNS = isNotSure(b.name);
    if (aNS && !bNS) return 1;
    if (!aNS && bNS) return -1;
    return a.name.localeCompare(b.name);
  });

  return trims;
}
