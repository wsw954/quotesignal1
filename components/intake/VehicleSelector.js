//components/intake/VehicleSelector.js
"use client";

import Field from "@/components/ui/Field";
import Select from "@/components/ui/Select";

export default function VehicleSelector() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Make">
        <Select defaultValue="" disabled>
          <option value="">(Coming next)</option>
        </Select>
      </Field>

      <Field label="Model">
        <Select defaultValue="" disabled>
          <option value="">(Select make first)</option>
        </Select>
      </Field>

      <Field label="Trim">
        <Select defaultValue="" disabled>
          <option value="">(Select model first)</option>
        </Select>
      </Field>
    </div>
  );
}
