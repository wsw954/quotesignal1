// components/dealer/QuotePricingSection.js

function fieldClass(hasError) {
  return `w-full rounded-lg border px-3 py-2 text-sm ${
    hasError ? "border-red-500" : "border-gray-300"
  }`;
}

function ErrorText({ children }) {
  if (!children) return null;
  return <p className="text-xs text-red-600">{children}</p>;
}

function SectionCard({ title, description, children }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function QuotePricingSection({
  purchaseType,
  form,
  errors,
  onChange,
}) {
  if (purchaseType !== "Cash" && purchaseType !== "Finance") {
    return null;
  }

  const description =
    purchaseType === "Finance"
      ? "Enter the quote details for this finance request."
      : "Enter the quote details for this cash request.";

  return (
    <SectionCard title="Quote Terms" description={description}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="otdTotal" className="block text-sm font-medium">
            OTD Total <span className="text-red-600">*</span>
          </label>
          <input
            id="otdTotal"
            name="otdTotal"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={form.otdTotal}
            onChange={onChange}
            className={fieldClass(Boolean(errors.otdTotal))}
            placeholder="e.g. 35250"
          />
          <ErrorText>{errors.otdTotal}</ErrorText>
        </div>

        {purchaseType === "Finance" && (
          <>
            <div className="space-y-2">
              <label
                htmlFor="financeTermMonths"
                className="block text-sm font-medium"
              >
                Finance Term (months) <span className="text-red-600">*</span>
              </label>
              <input
                id="financeTermMonths"
                name="financeTermMonths"
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
                value={form.financeTermMonths}
                onChange={onChange}
                className={fieldClass(Boolean(errors.financeTermMonths))}
                placeholder="e.g. 60"
              />
              <ErrorText>{errors.financeTermMonths}</ErrorText>
            </div>

            <div className="space-y-2">
              <label htmlFor="aprPercent" className="block text-sm font-medium">
                APR %
              </label>
              <input
                id="aprPercent"
                name="aprPercent"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={form.aprPercent}
                onChange={onChange}
                className={fieldClass(Boolean(errors.aprPercent))}
                placeholder="e.g. 5.99"
              />
              <ErrorText>{errors.aprPercent}</ErrorText>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="downPaymentAssumed"
                className="block text-sm font-medium"
              >
                Down Payment Assumed
              </label>
              <input
                id="downPaymentAssumed"
                name="downPaymentAssumed"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={form.downPaymentAssumed}
                onChange={onChange}
                className={fieldClass(Boolean(errors.downPaymentAssumed))}
                placeholder="e.g. 5000"
              />
              <ErrorText>{errors.downPaymentAssumed}</ErrorText>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="monthlyPaymentFinance"
                className="block text-sm font-medium"
              >
                Monthly Payment (Finance)
              </label>
              <input
                id="monthlyPaymentFinance"
                name="monthlyPaymentFinance"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={form.monthlyPaymentFinance}
                onChange={onChange}
                className={fieldClass(Boolean(errors.monthlyPaymentFinance))}
                placeholder="e.g. 575"
              />
              <ErrorText>{errors.monthlyPaymentFinance}</ErrorText>
            </div>
          </>
        )}
      </div>
    </SectionCard>
  );
}
