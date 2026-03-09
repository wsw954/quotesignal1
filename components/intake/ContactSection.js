// components/intake/ContactSection.js
"use client";

import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";

export default function ContactSection({ form, setForm, errors = {} }) {
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
        <h2 className="text-lg font-semibold">Contact Information</h2>
        <p className="mt-1 text-sm text-slate-600">
          Tell us how to reach you about dealer quotes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Field label="First Name" required>
            <Input
              id="firstName"
              name="firstName"
              value={form.firstName || ""}
              onChange={handleChange}
              placeholder="John"
              autoComplete="given-name"
            />
          </Field>
          {errors.firstName ? (
            <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
          ) : null}
        </div>

        <div>
          <Field label="Last Name" required>
            <Input
              id="lastName"
              name="lastName"
              value={form.lastName || ""}
              onChange={handleChange}
              placeholder="Smith"
              autoComplete="family-name"
            />
          </Field>
          {errors.lastName ? (
            <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
          ) : null}
        </div>

        <div>
          <Field label="Buyer Phone" required>
            <Input
              id="buyerPhone"
              name="buyerPhone"
              type="tel"
              value={form.buyerPhone || ""}
              onChange={handleChange}
              placeholder="(555) 123-4567"
              autoComplete="tel"
            />
          </Field>
          {errors.buyerPhone ? (
            <p className="mt-1 text-sm text-red-600">{errors.buyerPhone}</p>
          ) : null}
        </div>

        <div>
          <Field label="Buyer Email" required>
            <Input
              id="buyerEmail"
              name="buyerEmail"
              type="email"
              value={form.buyerEmail || ""}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </Field>
          {errors.buyerEmail ? (
            <p className="mt-1 text-sm text-red-600">{errors.buyerEmail}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
