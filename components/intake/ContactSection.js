//components/intake/ContactSection.js
"use client";

import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";

export default function ContactSection() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="First Name" required>
        <Input name="First Name" placeholder="John" autoComplete="given-name" />
      </Field>

      <Field label="Last Name" required>
        <Input
          name="Last Name"
          placeholder="Smith"
          autoComplete="family-name"
        />
      </Field>

      <Field label="Phone" required>
        <Input name="Phone" placeholder="(555) 123-4567" autoComplete="tel" />
      </Field>

      <Field label="Email" required>
        <Input
          name="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
        />
      </Field>
    </div>
  );
}
