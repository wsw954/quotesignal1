// /lib/validation/dealerSelectionSchema.js

import { z } from "zod";

function uniqueStrings(values) {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    const text = String(value || "").trim();
    if (!text) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    output.push(text);
  }

  return output;
}

const dealerIdArraySchema = z.preprocess(
  (value) => {
    if (value == null || value === "") return [];

    if (Array.isArray(value)) {
      return uniqueStrings(value);
    }

    if (typeof value === "string") {
      return uniqueStrings(value.split(","));
    }

    return [];
  },
  z.array(z.string().min(1)).default([]),
);

const targetDealerCountSchema = z.preprocess((value) => {
  if (value == null || value === "") return undefined;

  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}, z.number().int().min(0).optional());

export const dealerSelectionOverridesSchema = z
  .object({
    roundNumber: z.enum(["R1", "R2"]).optional(),
    targetDealerCount: targetDealerCountSchema,
    manualIncludeDealerIds: dealerIdArraySchema,
    manualExcludeDealerIds: dealerIdArraySchema,
    selectedDealerIds: dealerIdArraySchema,
    excludedDealerIds: dealerIdArraySchema,
  })
  .superRefine((value, ctx) => {
    const includeSet = new Set([
      ...value.manualIncludeDealerIds,
      ...value.selectedDealerIds,
    ]);

    const excludeSet = new Set([
      ...value.manualExcludeDealerIds,
      ...value.excludedDealerIds,
    ]);

    for (const id of includeSet) {
      if (excludeSet.has(id)) {
        ctx.addIssue({
          code: "custom",
          message: `Dealer ID cannot be both included and excluded: ${id}`,
          path: ["manualIncludeDealerIds"],
        });
      }
    }
  })
  .transform((value) => ({
    roundNumber: value.roundNumber,
    targetDealerCount: value.targetDealerCount,
    manualIncludeDealerIds: uniqueStrings([
      ...value.manualIncludeDealerIds,
      ...value.selectedDealerIds,
    ]),
    manualExcludeDealerIds: uniqueStrings([
      ...value.manualExcludeDealerIds,
      ...value.excludedDealerIds,
    ]),
    selectedDealerIds: uniqueStrings(value.selectedDealerIds),
    excludedDealerIds: uniqueStrings(value.excludedDealerIds),
  }));

export function normalizeDealerSelectionOverrides(input = {}) {
  return dealerSelectionOverridesSchema.parse(input || {});
}

export const dealerSelectionRouteBodySchema = z.object({
  overrides: dealerSelectionOverridesSchema.optional().default({}),
});
