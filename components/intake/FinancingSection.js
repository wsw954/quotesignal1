// components/intake/FinancingSection.js
"use client";

import {
  CREDIT_SCORE_RANGES,
  requiresCreditScoreRange,
} from "@/lib/constants/creditScoreRanges";

const PURCHASE_TYPES = ["Cash", "Finance", "Lease"];
const TARGET_CLOSE_TIMELINES = ["1 week", "2 weeks", "3+ weeks"];

export default function FinancingSection({ form, setForm, errors = {} }) {
  const showCreditScoreRange = requiresCreditScoreRange(form.purchaseType);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => {
      const next = {
        ...prev,
        [name]: value,
      };

      if (name === "purchaseType" && !requiresCreditScoreRange(value)) {
        next.creditScoreRange = "";
      }

      return next;
    });
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Purchase Type and Timing</h2>
        <p className="mt-1 text-sm text-slate-600">
          Tell us how you plan to buy and how soon you want to move.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="purchaseType"
            className="mb-2 block text-sm font-medium"
          >
            Purchase Type <span className="text-red-600">*</span>
          </label>
          <select
            id="purchaseType"
            name="purchaseType"
            value={form.purchaseType || ""}
            onChange={handleChange}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Select purchase type</option>
            {PURCHASE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.purchaseType ? (
            <p className="mt-1 text-sm text-red-600">{errors.purchaseType}</p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="targetCloseTimeline"
            className="mb-2 block text-sm font-medium"
          >
            Target Close Timeline <span className="text-red-600">*</span>
          </label>
          <select
            id="targetCloseTimeline"
            name="targetCloseTimeline"
            value={form.targetCloseTimeline || ""}
            onChange={handleChange}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Select timeline</option>
            {TARGET_CLOSE_TIMELINES.map((timeline) => (
              <option key={timeline} value={timeline}>
                {timeline}
              </option>
            ))}
          </select>
          {errors.targetCloseTimeline ? (
            <p className="mt-1 text-sm text-red-600">
              {errors.targetCloseTimeline}
            </p>
          ) : null}
        </div>

        {showCreditScoreRange ? (
          <div className="md:col-span-2">
            <label
              htmlFor="creditScoreRange"
              className="mb-2 block text-sm font-medium"
            >
              Credit Score Range <span className="text-red-600">*</span>
            </label>
            <select
              id="creditScoreRange"
              name="creditScoreRange"
              value={form.creditScoreRange || ""}
              onChange={handleChange}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">Select credit score range</option>
              {CREDIT_SCORE_RANGES.map((range) => (
                <option key={range} value={range}>
                  {range}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Required only for Finance or Lease requests.
            </p>
            {errors.creditScoreRange ? (
              <p className="mt-1 text-sm text-red-600">
                {errors.creditScoreRange}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
