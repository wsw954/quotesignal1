// lib/validation/buyerIntakeSchema.js
import { z } from "zod";

const airtableRecordId = z
  .string()
  .trim()
  .regex(/^rec[a-zA-Z0-9]{8,}$/, "Must be an Airtable record id (rec...)");

const trimIdsPreprocess = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return v;
};

export const buyerIntakeSchema = z
  .object({
    year: z.string().trim().min(1, "Year is required"),
    makeId: airtableRecordId,
    modelId: airtableRecordId,

    // allow either trimId or trimIds
    trimId: airtableRecordId.optional(),
    trimIds: z
      .preprocess(
        trimIdsPreprocess,
        z.array(airtableRecordId).min(1, "At least one trim is required"),
      )
      .optional(),

    firstName: z.string().trim().optional().default(""),
    lastName: z.string().trim().optional().default(""),
    email: z.string().trim().email("Invalid email"),
    phone: z.string().trim().optional().default(""),
    zip: z.string().trim().optional().default(""),
  })
  .superRefine((data, ctx) => {
    const hasTrimId = !!data.trimId;
    const hasTrimIds = Array.isArray(data.trimIds) && data.trimIds.length > 0;

    if (!hasTrimId && !hasTrimIds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["trimId"],
        message: "Trim is required (trimId or trimIds).",
      });
    }
  })
  .transform((data) => {
    // Optional normalization: always hand off trimIds (array) to your Airtable layer
    if (!data.trimIds && data.trimId) {
      return { ...data, trimIds: [data.trimId] };
    }
    return data;
  });
