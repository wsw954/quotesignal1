//components/intake/TradeInSection
"use client";

import Field from "@/components/ui/Field";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";

export default function TradeInSection() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Trade-in?">
        <Select defaultValue="">
          <option value="">Select</option>
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </Select>
      </Field>

      <Field label="Year">
        <Input placeholder="2018" />
      </Field>

      <Field label="Make / Model">
        <Input placeholder="Honda Accord" />
      </Field>
    </div>
  );
}
