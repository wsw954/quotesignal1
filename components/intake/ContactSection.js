//components/intake/ContactSection.js
"use client";

import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";

export default function ContactSection() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name" required>
        <Input placeholder="John Smith" />
      </Field>

      <Field label="Phone" required>
        <Input placeholder="(555) 123-4567" />
      </Field>

      <Field label="Email" className="sm:col-span-2" required>
        <Input type="email" placeholder="you@example.com" />
      </Field>
    </div>
  );
}
