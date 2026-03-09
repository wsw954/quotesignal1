// components/intake/BuyerIntakeForm.js
"use client";

import { useMemo, useState } from "react";
import ContactSection from "./ContactSection";
import LocationSection from "./LocationSection";
import VehicleSelector from "./VehicleSelector";
import FinancingSection from "./FinancingSection";
import ReviewSubmit from "./ReviewSubmit";

const initialForm = {
  // Contact
  firstName: "",
  lastName: "",
  buyerEmail: "",
  buyerPhone: "",
  buyerZip: "",

  // Vehicle
  year: "",
  makeId: "",
  makeName: "",
  modelId: "",
  modelName: "",
  trimId: "",
  trimName: "",
  trimNotesPackages: "",
  accessories: "",

  // Purchase / timing
  purchaseType: "",
  creditScoreRange: "",
  targetCloseTimeline: "",
};

function normalizeServerFieldErrors(result) {
  if (!result || typeof result !== "object") return {};

  if (result.fieldErrors && typeof result.fieldErrors === "object") {
    return result.fieldErrors;
  }

  if (result.errors && typeof result.errors === "object") {
    return result.errors;
  }

  return {};
}

function validateClient(form) {
  const nextErrors = {};

  if (!form.firstName?.trim()) nextErrors.firstName = "First Name is required.";
  if (!form.lastName?.trim()) nextErrors.lastName = "Last Name is required.";
  if (!form.buyerEmail?.trim())
    nextErrors.buyerEmail = "Buyer Email is required.";
  if (!form.buyerPhone?.trim())
    nextErrors.buyerPhone = "Buyer Phone is required.";
  if (!form.buyerZip?.trim()) nextErrors.buyerZip = "Buyer Zip is required.";

  if (!form.year) nextErrors.year = "Year is required.";
  if (!form.makeId) nextErrors.makeId = "Make is required.";
  if (!form.modelId) nextErrors.modelId = "Model is required.";
  if (!form.trimId) nextErrors.trimId = "Trim is required.";

  if (!form.purchaseType) {
    nextErrors.purchaseType = "Purchase Type is required.";
  }

  if (!form.targetCloseTimeline) {
    nextErrors.targetCloseTimeline = "Target Close Timeline is required.";
  }

  const needsCreditScore =
    form.purchaseType === "Finance" || form.purchaseType === "Lease";

  if (needsCreditScore && !form.creditScoreRange) {
    nextErrors.creditScoreRange =
      "Credit Score Range is required for Finance or Lease.";
  }

  return nextErrors;
}

export default function BuyerIntakeForm() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitState, setSubmitState] = useState("idle");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState("");

  const isSubmitting = submitState === "submitting";

  const canSubmit = useMemo(() => {
    return !isSubmitting;
  }, [isSubmitting]);

  function resetForm() {
    setForm(initialForm);
    setErrors({});
    setSubmitError("");
    setSubmitSuccessMessage("");
    setSubmitState("idle");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitError("");
    setSubmitSuccessMessage("");
    setErrors({});

    const clientErrors = validateClient(form);

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setSubmitState("error");
      setSubmitError("Please fix the highlighted fields and try again.");
      return;
    }

    try {
      setSubmitState("submitting");

      const response = await fetch("/api/intake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        const nextFieldErrors = normalizeServerFieldErrors(result);

        if (Object.keys(nextFieldErrors).length > 0) {
          setErrors(nextFieldErrors);
        }

        throw new Error(result.error || "Failed to submit intake.");
      }

      setSubmitState("success");
      setSubmitSuccessMessage("Buyer intake submitted successfully.");
      setErrors({});
    } catch (error) {
      setSubmitState("error");
      setSubmitError(error.message || "Something went wrong.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border p-6 shadow-sm"
    >
      <ContactSection form={form} setForm={setForm} errors={errors} />

      <LocationSection form={form} setForm={setForm} errors={errors} />

      <VehicleSelector form={form} setForm={setForm} errors={errors} />

      <FinancingSection form={form} setForm={setForm} errors={errors} />

      {submitError ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </div>
      ) : null}

      {submitState === "success" && submitSuccessMessage ? (
        <div className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
          {submitSuccessMessage}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <ReviewSubmit
          isSubmitting={isSubmitting}
          canSubmit={canSubmit}
          submitError=""
        />

        <button
          type="button"
          onClick={resetForm}
          disabled={isSubmitting}
          className="rounded-lg border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reset
        </button>
      </div>

      <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-600">
        <div>
          <strong>Debug preview:</strong>
        </div>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(form, null, 2)}
        </pre>
      </div>
    </form>
  );
}
