//components/intake/VehicleSelector.js
"use client";

import Field from "@/components/ui/Field";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";

export default function VehicleSelector() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Year" helperText="Optional">
        <Select name="Year" defaultValue="">
          <option value="">Select</option>
          <option value="2026">2026</option>
          <option value="2025">2025</option>
          <option value="2024">2024</option>
          <option value="2023">2023</option>
          <option value="2022">2022</option>
          <option value="2021">2021</option>
          <option value="2020">2020</option>
          <option value="2019">2019</option>
          <option value="2018">2018</option>
          <option value="2017">2017</option>
          <option value="2016">2016</option>
          <option value="2015">2015</option>
          <option value="2014">2014</option>
          <option value="Not Sure">Not Sure</option>
        </Select>
      </Field>
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
