// lib/validation/buyerIntakeSchema.js
import { z } from "zod";
import {
  CREDIT_SCORE_RANGES,
  requiresCreditScoreRange,
} from "@/lib/constants/creditScoreRanges";

export const buyerIntakeSchema = z
  .object({
    makeId: z.string().min(1, "Make is required."),
    makeName: z.string().optional(),
    modelId: z.string().min(1, "Model is required."),
    modelName: z.string().optional(),
    trimId: z.string().min(1, "Trim is required."),
    trimName: z.string().optional(),
    purchaseType: z.enum(["Cash", "Finance", "Lease"], {
      error: "Purchase Type is required.",
    }),
    creditScoreRange: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const needsCreditScore = requiresCreditScoreRange(data.purchaseType);

    if (needsCreditScore) {
      if (!data.creditScoreRange) {
        ctx.addIssue({
          code: "custom",
          path: ["creditScoreRange"],
          message: "Credit Score Range is required for Finance or Lease.",
        });
        return;
      }

      if (!CREDIT_SCORE_RANGES.includes(data.creditScoreRange)) {
        ctx.addIssue({
          code: "custom",
          path: ["creditScoreRange"],
          message: "Invalid Credit Score Range.",
        });
      }
    }

    if (!needsCreditScore && data.creditScoreRange) {
      ctx.addIssue({
        code: "custom",
        path: ["creditScoreRange"],
        message:
          "Credit Score Range should be empty unless Purchase Type is Finance or Lease.",
      });
    }
  });
