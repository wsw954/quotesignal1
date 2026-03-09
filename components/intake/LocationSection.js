// components/intake/LocationSection.js
"use client";

import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";

export default function LocationSection({ form, setForm, errors = {} }) {
  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Location</h2>
        <p className="mt-1 text-sm text-slate-600">
          We use your ZIP code to determine routing region and state.
        </p>
      </div>

      <div className="max-w-sm">
        <Field label="Buyer Zip" required>
          <Input
            id="buyerZip"
            name="buyerZip"
            value={form.buyerZip || ""}
            onChange={handleChange}
            placeholder="33311"
            autoComplete="postal-code"
            inputMode="numeric"
            maxLength={10}
          />
        </Field>
        {errors.buyerZip ? (
          <p className="mt-1 text-sm text-red-600">{errors.buyerZip}</p>
        ) : null}
      </div>
    </section>
  );
}
