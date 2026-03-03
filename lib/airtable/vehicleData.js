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
 * Uses linked field in Models table: {Make} contains selected make record ID.
 */
export async function getModelsByMake(makeId) {
  requireEnv(T_MODELS, "AIRTABLE_MODELS_TABLE_ID");
  if (!makeId) return [];

  const filterByFormula = `FIND("${makeId}", ARRAYJOIN({${F_MODELS_LINKED_MAKE}}))`;

  const data = await base.safeSelect(T_MODELS, {
    fields: [F_MODEL_NAME, F_MODELS_LINKED_MAKE],
    filterByFormula,
    sort: [{ field: F_MODEL_NAME, direction: "asc" }],
  });

  return (data.records || [])
    .map((r) => toOption(r, F_MODEL_NAME))
    .filter((x) => x.name);
}

/**
 * getTrimsByModel(modelId): [{ id, name }]
 * Uses linked field in Trims table: {Model} contains selected model record ID.
 * Also moves "Not sure/Other" (and similar) to the bottom for a cleaner UX.
 */
export async function getTrimsByModel(modelId) {
  requireEnv(T_TRIMS, "AIRTABLE_TRIMS_TABLE_ID");
  if (!modelId) return [];

  const filterByFormula = `FIND("${modelId}", ARRAYJOIN({${F_TRIMS_LINKED_MODEL}}))`;

  const data = await base.safeSelect(T_TRIMS, {
    fields: [F_TRIM_NAME, F_TRIMS_LINKED_MODEL],
    // We sort in code so we can push Not Sure/Other to bottom reliably.
  });

  const trims = (data.records || [])
    .map((r) => toOption(r, F_TRIM_NAME))
    .filter((x) => x.name);

  // Sort trims alphabetically, but keep "Not sure/Other" (and variants) at the end.
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
