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

function normalizeToTokens(value) {
  if (value == null) return [];

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  const stringValue = String(value).trim();
  if (!stringValue) return [];

  return stringValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function includesToken(fieldValue, needle) {
  if (!needle) return false;

  const normalizedNeedle = String(needle).trim().toLowerCase();
  if (!normalizedNeedle) return false;

  const tokens = normalizeToTokens(fieldValue).map((token) =>
    token.toLowerCase(),
  );

  return tokens.includes(normalizedNeedle);
}

async function getNameById(tableId, nameField, recordId) {
  if (!recordId) return "";

  const records = await base.safeSelect(tableId, {
    fields: [nameField],
    filterByFormula: `RECORD_ID()="${recordId}"`,
    maxRecords: 1,
  });

  const record = records[0];
  return record?.fields?.[nameField] ?? "";
}

/**
 * getMakes(): [{ id, name }]
 */
export async function getMakes() {
  requireEnv(T_MAKES, "AIRTABLE_MAKES_TABLE_ID");

  const records = await base.safeSelect(T_MAKES, {
    fields: [F_MAKE_NAME],
    sort: [{ field: F_MAKE_NAME, direction: "asc" }],
  });

  return records
    .map((record) => toOption(record, F_MAKE_NAME))
    .filter((item) => item.name);
}

/**
 * getModelsByMake(makeId): [{ id, name }]
 */
export async function getModelsByMake(makeId) {
  requireEnv(T_MAKES, "AIRTABLE_MAKES_TABLE_ID");
  requireEnv(T_MODELS, "AIRTABLE_MODELS_TABLE_ID");

  if (!makeId) return [];

  const makeName = await getNameById(T_MAKES, F_MAKE_NAME, makeId);

  const records = await base.safeSelect(T_MODELS, {
    fields: [F_MODEL_NAME, F_MODELS_LINKED_MAKE],
  });

  const models = records
    .filter((record) => {
      const value = record.fields?.[F_MODELS_LINKED_MAKE];
      return includesToken(value, makeId) || includesToken(value, makeName);
    })
    .map((record) => toOption(record, F_MODEL_NAME))
    .filter((item) => item.name);

  models.sort((a, b) => a.name.localeCompare(b.name));
  return models;
}

/**
 * getTrimsByModel(modelId): [{ id, name }]
 */
export async function getTrimsByModel(modelId) {
  requireEnv(T_MODELS, "AIRTABLE_MODELS_TABLE_ID");
  requireEnv(T_TRIMS, "AIRTABLE_TRIMS_TABLE_ID");

  if (!modelId) return [];

  const modelName = await getNameById(T_MODELS, F_MODEL_NAME, modelId);

  const records = await base.safeSelect(T_TRIMS, {
    fields: [F_TRIM_NAME, F_TRIMS_LINKED_MODEL],
  });

  const trims = records
    .filter((record) => {
      const value = record.fields?.[F_TRIMS_LINKED_MODEL];
      return includesToken(value, modelId) || includesToken(value, modelName);
    })
    .map((record) => toOption(record, F_TRIM_NAME))
    .filter((item) => item.name);

  const isNotSure = (value) => {
    const normalized = String(value || "").toLowerCase();
    return (
      normalized.includes("not sure") ||
      normalized.includes("other") ||
      normalized === "n/a"
    );
  };

  trims.sort((a, b) => {
    const aNotSure = isNotSure(a.name);
    const bNotSure = isNotSure(b.name);

    if (aNotSure && !bNotSure) return 1;
    if (!aNotSure && bNotSure) return -1;

    return a.name.localeCompare(b.name);
  });

  return trims;
}
