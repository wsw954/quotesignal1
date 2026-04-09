// components/dealer/DealerQuoteForm.js

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import VehicleSelector from "@/components/intake/VehicleSelector";
import QuotePricingSection from "@/components/dealer/QuotePricingSection";
import QuoteLeaseSection from "@/components/dealer/QuoteLeaseSection";
import QuoteReviewSubmit from "@/components/dealer/QuoteReviewSubmit";

const DEALER_DELIVERY_TIMELINE_OPTIONS = [
  "In Stock / Immediate",
  "Within 1 week",
  "Within 2 weeks",
  "3+ weeks",
];

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

function buildInitialForm({ requestedVehicle }) {
  return {
    token: "",

    // offered vehicle
    year: requestedVehicle?.year || "",
    makeId: "",
    makeName: "",
    modelId: "",
    modelName: "",
    trimId: "",
    trimName: "",
    trimNotesPackages: "",
    accessories: "",

    // timing / notes
    dealerDeliveryTimeline: "",
    quoteNotes: "",

    // cash / finance
    otdTotal: "",
    aprPercent: "",
    financeTermMonths: "",
    downPaymentAssumed: "",
    monthlyPaymentFinance: "",

    // lease
    leaseTermMonths: "",
    leaseMonthly: "",
    leaseDas: "",
    leaseMilesPerYear: "",
  };
}

function normalizeFieldErrors(fieldErrors) {
  return fieldErrors && typeof fieldErrors === "object" ? fieldErrors : {};
}

export default function DealerQuoteForm({
  token,
  invitation,
  requestContext,
  requestedVehicle,
}) {
  const router = useRouter();
  const purchaseType = requestContext?.purchaseType || "";
  const [form, setForm] = useState(() => ({
    ...buildInitialForm({ requestedVehicle }),
    token: token || "",
  }));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const purchaseTypeLabel = useMemo(() => {
    if (purchaseType === "Cash") return "Cash";
    if (purchaseType === "Finance") return "Finance";
    if (purchaseType === "Lease") return "Lease";
    return "Unknown";
  }, [purchaseType]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setIsSubmitting(true);
    setErrors({});
    setFormError("");

    try {
      const payload = {
        ...form,
        token,
      };

      const response = await fetch("/api/dealer-quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        setErrors(normalizeFieldErrors(result.fieldErrors));
        setFormError(result.error || "Failed to submit dealer quote.");
        return;
      }

      router.push(`/dealer/quote/${encodeURIComponent(token)}/success`);
    } catch (error) {
      setFormError(error?.message || "Failed to submit dealer quote.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SectionCard
        title="Offer Summary"
        description="Submit one quote for this request. Purchase Type is locked to the buyer request."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-gray-50 px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Request ID
            </div>
            <div className="mt-1 text-sm text-gray-900">
              {invitation?.requestId || "—"}
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Purchase Type
            </div>
            <div className="mt-1 text-sm text-gray-900">
              {purchaseTypeLabel}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Offered Vehicle"
        description="Select the actual vehicle you are offering. It may differ from the requested vehicle, but the purchase structure must match the buyer request."
      >
        <VehicleSelector form={form} setForm={setForm} errors={errors} />
      </SectionCard>

      <QuotePricingSection
        purchaseType={purchaseType}
        form={form}
        errors={errors}
        onChange={handleChange}
      />

      <QuoteLeaseSection
        purchaseType={purchaseType}
        form={form}
        errors={errors}
        onChange={handleChange}
      />

      <SectionCard
        title="Dealer Delivery Timeline"
        description="When can you realistically deliver or close this offered vehicle?"
      >
        <div className="space-y-2">
          <label
            htmlFor="dealerDeliveryTimeline"
            className="block text-sm font-medium"
          >
            Dealer Delivery Timeline
          </label>
          <select
            id="dealerDeliveryTimeline"
            name="dealerDeliveryTimeline"
            value={form.dealerDeliveryTimeline}
            onChange={handleChange}
            className={fieldClass(Boolean(errors.dealerDeliveryTimeline))}
          >
            <option value="">Select dealer delivery timeline</option>
            {DEALER_DELIVERY_TIMELINE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ErrorText>{errors.dealerDeliveryTimeline}</ErrorText>
        </div>
      </SectionCard>

      <SectionCard
        title="Quote Notes"
        description="Optional notes about the vehicle, terms, or offer details."
      >
        <div className="space-y-2">
          <label htmlFor="quoteNotes" className="block text-sm font-medium">
            Quote Notes
          </label>
          <textarea
            id="quoteNotes"
            name="quoteNotes"
            rows={4}
            value={form.quoteNotes}
            onChange={handleChange}
            className={fieldClass(Boolean(errors.quoteNotes))}
            placeholder="Optional notes for this quote."
          />
          <ErrorText>{errors.quoteNotes}</ErrorText>
        </div>
      </SectionCard>

      <QuoteReviewSubmit formError={formError} isSubmitting={isSubmitting} />
    </form>
  );
}
