// /lib/validation/dealerQuoteSchema.js

import { z } from "zod";

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
];

const PURCHASE_TYPES = ["Cash", "Finance", "Lease"];

const DEALER_DELIVERY_TIMELINE_OPTIONS = [
  "In Stock / Immediate",
  "Within 1 week",
  "Within 2 weeks",
  "3+ weeks",
];

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

function optionalNumericField(label) {
  return z.preprocess(
    (value) => {
      if (value === "" || value == null) return undefined;
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed === "") return undefined;
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : value;
      }
      return value;
    },
    z
      .number({
        invalid_type_error: `${label} must be a number.`,
      })
      .finite(`${label} must be a valid number.`)
      .nonnegative(`${label} cannot be negative.`)
      .optional(),
  );
}

export const dealerQuoteSchema = z
  .object({
    token: requiredTrimmedString("Dealer Quote Token", 255),

    // Server-trusted context can still be passed through the client,
    // but should not be trusted by the API route as the source of truth.
    purchaseType: z.preprocess((value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    }, z.enum(PURCHASE_TYPES).optional()),

    // Offered vehicle (client form shape aligned with VehicleSelector)
    year: z.enum(YEAR_OPTIONS, {
      required_error: "Offered Vehicle Year is required.",
      invalid_type_error: "Offered Vehicle Year is required.",
    }),

    makeId: requiredTrimmedString("Offered Vehicle Make", 100),
    makeName: optionalTrimmedString(150, "Offered Vehicle Make Name"),

    modelId: requiredTrimmedString("Offered Vehicle Model", 100),
    modelName: optionalTrimmedString(150, "Offered Vehicle Model Name"),

    trimId: requiredTrimmedString("Offered Vehicle Trim", 100),
    trimName: optionalTrimmedString(150, "Offered Vehicle Trim Name"),

    trimNotesPackages: optionalTrimmedString(
      2000,
      "Offered Vehicle Trim Notes/Packages",
    ),
    accessories: optionalTrimmedString(4000, "Offered Vehicle Accessories"),

    dealerDeliveryTimeline: z.preprocess((value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    }, z.enum(DEALER_DELIVERY_TIMELINE_OPTIONS).optional()),

    quoteNotes: optionalTrimmedString(4000, "Quote Notes"),

    // Cash / Finance shared anchor
    otdTotal: optionalNumericField("OTD Total"),

    // Finance-only
    aprPercent: optionalNumericField("APR %"),
    financeTermMonths: optionalNumericField("Finance Term (months)"),
    downPaymentAssumed: optionalNumericField("Down Payment Assumed"),
    monthlyPaymentFinance: optionalNumericField("Monthly Payment (Finance)"),

    // Lease-only
    leaseTermMonths: optionalNumericField("Lease Term (months)"),
    leaseMonthly: optionalNumericField("Lease Monthly"),
    leaseDas: optionalNumericField("Lease DAS"),
    leaseMilesPerYear: optionalNumericField("Lease Miles/Year"),
  })
  .superRefine((data, ctx) => {
    const purchaseType = data.purchaseType;

    if (!purchaseType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["purchaseType"],
        message:
          "Purchase Type context is required for dealer quote validation.",
      });
      return;
    }

    if (!data.makeName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["makeName"],
        message: "Offered Vehicle Make Name is required.",
      });
    }

    if (!data.modelName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["modelName"],
        message: "Offered Vehicle Model Name is required.",
      });
    }

    if (!data.trimName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["trimName"],
        message: "Offered Vehicle Trim Name is required.",
      });
    }

    if (purchaseType === "Cash") {
      if (data.otdTotal == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["otdTotal"],
          message: "OTD Total is required for Cash quotes.",
        });
      }

      if (data.aprPercent != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["aprPercent"],
          message: "APR % should be empty for Cash quotes.",
        });
      }

      if (data.financeTermMonths != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["financeTermMonths"],
          message: "Finance Term should be empty for Cash quotes.",
        });
      }

      if (data.downPaymentAssumed != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["downPaymentAssumed"],
          message: "Down Payment Assumed should be empty for Cash quotes.",
        });
      }

      if (data.monthlyPaymentFinance != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["monthlyPaymentFinance"],
          message: "Monthly Payment should be empty for Cash quotes.",
        });
      }

      if (data.leaseTermMonths != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["leaseTermMonths"],
          message: "Lease Term should be empty for Cash quotes.",
        });
      }

      if (data.leaseMonthly != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["leaseMonthly"],
          message: "Lease Monthly should be empty for Cash quotes.",
        });
      }

      if (data.leaseDas != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["leaseDas"],
          message: "Lease DAS should be empty for Cash quotes.",
        });
      }

      if (data.leaseMilesPerYear != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["leaseMilesPerYear"],
          message: "Lease Miles/Year should be empty for Cash quotes.",
        });
      }
    }

    if (purchaseType === "Finance") {
      if (data.otdTotal == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["otdTotal"],
          message: "OTD Total is required for Finance quotes.",
        });
      }

      if (data.financeTermMonths == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["financeTermMonths"],
          message: "Finance Term is required for Finance quotes.",
        });
      }

      if (data.leaseTermMonths != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["leaseTermMonths"],
          message: "Lease Term should be empty for Finance quotes.",
        });
      }

      if (data.leaseMonthly != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["leaseMonthly"],
          message: "Lease Monthly should be empty for Finance quotes.",
        });
      }

      if (data.leaseDas != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["leaseDas"],
          message: "Lease DAS should be empty for Finance quotes.",
        });
      }

      if (data.leaseMilesPerYear != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["leaseMilesPerYear"],
          message: "Lease Miles/Year should be empty for Finance quotes.",
        });
      }
    }

    if (purchaseType === "Lease") {
      if (data.leaseTermMonths == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["leaseTermMonths"],
          message: "Lease Term is required for Lease quotes.",
        });
      }

      if (data.leaseMonthly == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["leaseMonthly"],
          message: "Lease Monthly is required for Lease quotes.",
        });
      }

      if (data.leaseDas == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["leaseDas"],
          message: "Lease DAS is required for Lease quotes.",
        });
      }

      if (data.otdTotal != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["otdTotal"],
          message: "OTD Total should be empty for Lease quotes.",
        });
      }

      if (data.aprPercent != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["aprPercent"],
          message: "APR % should be empty for Lease quotes.",
        });
      }

      if (data.financeTermMonths != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["financeTermMonths"],
          message: "Finance Term should be empty for Lease quotes.",
        });
      }

      if (data.downPaymentAssumed != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["downPaymentAssumed"],
          message: "Down Payment Assumed should be empty for Lease quotes.",
        });
      }

      if (data.monthlyPaymentFinance != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["monthlyPaymentFinance"],
          message: "Monthly Payment should be empty for Lease quotes.",
        });
      }
    }
  });

export function parseDealerQuote(input) {
  return dealerQuoteSchema.parse(input);
}

export function safeParseDealerQuote(input) {
  return dealerQuoteSchema.safeParse(input);
}
