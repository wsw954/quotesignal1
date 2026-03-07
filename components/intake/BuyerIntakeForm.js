//components/intake/BuyerIntakeForm.js
"use client";

import { useState } from "react";
import VehicleSelector from "./VehicleSelector";
import FinancingSection from "./FinancingSection";

const initialForm = {
  makeId: "",
  makeName: "",
  modelId: "",
  modelName: "",
  trimId: "",
  trimName: "",
  purchaseType: "",
  creditScoreRange: "",
};

export default function BuyerIntakeForm() {
  const [form, setForm] = useState(initialForm);
  const [submitState, setSubmitState] = useState("idle");
  const [formError, setFormError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    if (!form.makeId || !form.modelId || !form.trimId) {
      setFormError("Please select a make, model, and trim.");
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
        throw new Error(result.error || "Failed to submit intake.");
      }

      setSubmitState("success");
    } catch (error) {
      setSubmitState("error");
      setFormError(error.message || "Something went wrong.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border p-6 shadow-sm"
    >
      <VehicleSelector form={form} setForm={setForm} />
      <FinancingSection form={form} setForm={setForm} />

      {formError ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </div>
      ) : null}

      {submitState === "success" ? (
        <div className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
          Buyer intake submitted successfully.
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitState === "submitting"}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitState === "submitting" ? "Submitting..." : "Continue"}
        </button>

        <button
          type="button"
          onClick={() => {
            setForm(initialForm);
            setFormError("");
            setSubmitState("idle");
          }}
          className="rounded-lg border px-4 py-2 text-sm font-medium"
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
