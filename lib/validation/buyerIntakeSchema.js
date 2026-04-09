// lib/validation/buyerIntakeSchema.js
import { z } from "zod";
import {
  CREDIT_SCORE_RANGES,
  requiresCreditScoreRange,
} from "@/lib/constants/creditScoreRanges";

const YEAR_OPTIONS = [
  "2026",
  "2025",
  "2024",
  "2023",
  "2022",
  "2021",
  "2020",
  "2019",
  "2018",
  "2017",
  "2016",
  "2015",
  "2014",
  "Not Sure",
];

const EXTERIOR_COLOR_OPTIONS = [
  "Black",
  "White",
  "Silver",
  "Blue",
  "Red",
  "Green",
  "Gray",
  "Other",
  "Any",
];

const TARGET_CLOSE_TIMELINES = ["1 week", "2 weeks", "3+ weeks"];
const PURCHASE_TYPES = ["Cash", "Finance", "Lease"];

function optionalTrimmedString(max, label) {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    },
    z
      .string()
      .max(max, `${label} must be ${max} characters or less.`)
      .optional(),
  );
}

function requiredTrimmedString(label, max) {
  return z
    .string({
      required_error: `${label} is required.`,
      invalid_type_error: `${label} is required.`,
    })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or less.`);
}

function hasValidUsPhoneDigits(value) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10;
}

function hasValidZipFormat(value) {
  return /^\d{5}(-\d{4})?$/.test(value);
}

export const buyerIntakeSchema = z
  .object({
    // Contact section
    firstName: requiredTrimmedString("First Name", 100),
    lastName: requiredTrimmedString("Last Name", 100),

    buyerEmail: z
      .string({
        required_error: "Buyer Email is required.",
        invalid_type_error: "Buyer Email is required.",
      })
      .trim()
      .min(1, "Buyer Email is required.")
      .email("Enter a valid email address.")
      .max(254, "Buyer Email must be 254 characters or less."),

    buyerPhone: z
      .string({
        required_error: "Buyer Phone is required.",
        invalid_type_error: "Buyer Phone is required.",
      })
      .trim()
      .min(1, "Buyer Phone is required.")
      .refine(hasValidUsPhoneDigits, {
        message: "Enter a valid 10-digit phone number.",
      }),

    buyerZip: z
      .string({
        required_error: "Buyer Zip is required.",
        invalid_type_error: "Buyer Zip is required.",
      })
      .trim()
      .min(1, "Buyer Zip is required.")
      .refine(hasValidZipFormat, {
        message: "Enter a valid ZIP code.",
      }),

    // Vehicle section
    year: z.enum(YEAR_OPTIONS, {
      required_error: "Year is required.",
      invalid_type_error: "Year is required.",
    }),

    makeId: requiredTrimmedString("Make", 100),
    makeName: optionalTrimmedString(150, "Make Name"),

    modelId: requiredTrimmedString("Model", 100),
    modelName: optionalTrimmedString(150, "Model Name"),

    trimId: requiredTrimmedString("Trim", 100),
    trimName: optionalTrimmedString(150, "Trim Name"),

    exteriorColorRequested: z.preprocess((value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    }, z.enum(EXTERIOR_COLOR_OPTIONS).optional()),

    trimNotesPackages: optionalTrimmedString(1000, "Trim Notes/Packages"),
    accessories: optionalTrimmedString(2000, "Accessories"),

    // Purchase / timing section
    purchaseType: z.enum(PURCHASE_TYPES, {
      required_error: "Purchase Type is required.",
      invalid_type_error: "Purchase Type is required.",
    }),

    creditScoreRange: z.preprocess((value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    }, z.string().optional()),

    targetCloseTimeline: z.enum(TARGET_CLOSE_TIMELINES, {
      required_error: "Target Close Timeline is required.",
      invalid_type_error: "Target Close Timeline is required.",
    }),
  })
  .superRefine((data, ctx) => {
    const needsCreditScore = requiresCreditScoreRange(data.purchaseType);

    if (needsCreditScore) {
      if (!data.creditScoreRange) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["creditScoreRange"],
          message: "Credit Score Range is required for Finance or Lease.",
        });
        return;
      }

      if (!CREDIT_SCORE_RANGES.includes(data.creditScoreRange)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["creditScoreRange"],
          message: "Invalid Credit Score Range.",
        });
      }
    }

    if (!needsCreditScore && data.creditScoreRange) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["creditScoreRange"],
        message:
          "Credit Score Range should be empty unless Purchase Type is Finance or Lease.",
      });
    }
  });
