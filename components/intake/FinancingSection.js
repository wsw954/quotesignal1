//components/intake/FinancingSection.js
"use client";

import Field from "@/components/ui/Field";
import Select from "@/components/ui/Select";

export default function FinancingSection() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Payment preference">
        <Select defaultValue="">
          <option value="">Select</option>
          <option value="cash">Cash</option>
          <option value="finance">Finance</option>
          <option value="lease">Lease</option>
          <option value="unsure">Not sure yet</option>
        </Select>
      </Field>

      <Field label="Pre-approved financing?">
        <Select defaultValue="">
          <option value="">Select</option>
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </Select>
      </Field>
    </div>
  );
}
