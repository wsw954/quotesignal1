// components/dealer/QuoteLeaseSection.js

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

export default function QuoteLeaseSection({
  purchaseType,
  form,
  errors,
  onChange,
}) {
  if (purchaseType !== "Lease") {
    return null;
  }

  return (
    <SectionCard
      title="Quote Terms"
      description="Enter the quote details for this lease request."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="leaseTermMonths"
            className="block text-sm font-medium"
          >
            Lease Term (months) <span className="text-red-600">*</span>
          </label>
          <input
            id="leaseTermMonths"
            name="leaseTermMonths"
            type="number"
            inputMode="numeric"
            step="1"
            min="0"
            value={form.leaseTermMonths}
            onChange={onChange}
            className={fieldClass(Boolean(errors.leaseTermMonths))}
            placeholder="e.g. 36"
          />
          <ErrorText>{errors.leaseTermMonths}</ErrorText>
        </div>

        <div className="space-y-2">
          <label htmlFor="leaseMonthly" className="block text-sm font-medium">
            Lease Monthly <span className="text-red-600">*</span>
          </label>
          <input
            id="leaseMonthly"
            name="leaseMonthly"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={form.leaseMonthly}
            onChange={onChange}
            className={fieldClass(Boolean(errors.leaseMonthly))}
            placeholder="e.g. 399"
          />
          <ErrorText>{errors.leaseMonthly}</ErrorText>
        </div>

        <div className="space-y-2">
          <label htmlFor="leaseDas" className="block text-sm font-medium">
            Lease DAS <span className="text-red-600">*</span>
          </label>
          <input
            id="leaseDas"
            name="leaseDas"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={form.leaseDas}
            onChange={onChange}
            className={fieldClass(Boolean(errors.leaseDas))}
            placeholder="e.g. 2999"
          />
          <ErrorText>{errors.leaseDas}</ErrorText>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="leaseMilesPerYear"
            className="block text-sm font-medium"
          >
            Lease Miles / Year
          </label>
          <input
            id="leaseMilesPerYear"
            name="leaseMilesPerYear"
            type="number"
            inputMode="numeric"
            step="1"
            min="0"
            value={form.leaseMilesPerYear}
            onChange={onChange}
            className={fieldClass(Boolean(errors.leaseMilesPerYear))}
            placeholder="e.g. 12000"
          />
          <ErrorText>{errors.leaseMilesPerYear}</ErrorText>
        </div>
      </div>
    </SectionCard>
  );
}
