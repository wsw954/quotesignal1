//components/intake/FinancingSection.js
"use client";

import {
  CREDIT_SCORE_RANGES,
  requiresCreditScoreRange,
} from "@/lib/constants/creditScoreRanges";

const PURCHASE_TYPES = ["Cash", "Finance", "Lease"];

export default function FinancingSection({ form, setForm }) {
  const showCreditScoreRange = requiresCreditScoreRange(form.purchaseType);

  function handlePurchaseTypeChange(event) {
    const nextPurchaseType = event.target.value;

    setForm((prev) => ({
      ...prev,
      purchaseType: nextPurchaseType,
      creditScoreRange: requiresCreditScoreRange(nextPurchaseType)
        ? prev.creditScoreRange
        : "",
    }));
  }

  function handleCreditScoreRangeChange(event) {
    const nextValue = event.target.value;

    setForm((prev) => ({
      ...prev,
      creditScoreRange: nextValue,
    }));
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Payment</h2>
        <p className="mt-1 text-sm text-gray-600">
          Tell us how you plan to purchase the vehicle.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="purchaseType" className="block text-sm font-medium">
            Purchase Type
          </label>
          <select
            id="purchaseType"
            name="purchaseType"
            value={form.purchaseType}
            onChange={handlePurchaseTypeChange}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Select purchase type</option>
            {PURCHASE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {showCreditScoreRange ? (
          <div className="space-y-2">
            <label
              htmlFor="creditScoreRange"
              className="block text-sm font-medium"
            >
              Credit Score Range
            </label>
            <select
              id="creditScoreRange"
              name="creditScoreRange"
              value={form.creditScoreRange}
              onChange={handleCreditScoreRangeChange}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">Select credit score range</option>
              {CREDIT_SCORE_RANGES.map((range) => (
                <option key={range} value={range}>
                  {range}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              Only shown for Finance or Lease requests.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
