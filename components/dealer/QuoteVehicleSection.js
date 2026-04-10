// components/dealer/QuoteVehicleSection.js

const EXTERIOR_COLOR_OPTIONS = [
  "Black",
  "White",
  "Silver",
  "Blue",
  "Red",
  "Green",
  "Gray",
  "Other",
  "Any",
];

function fieldClass(hasError) {
  return `w-full rounded-lg border px-3 py-2 text-sm ${
    hasError ? "border-red-500" : "border-gray-300"
  }`;
}

function ErrorText({ children }) {
  if (!children) return null;
  return <p className="text-xs text-red-600">{children}</p>;
}

export default function QuoteVehicleSection({ form, errors, onChange }) {
  return (
    <div className="mt-5 border-t border-gray-200 pt-5">
      <div className="space-y-2">
        <label htmlFor="exteriorColor" className="block text-sm font-medium">
          Exterior Color (Offered Vehicle)
        </label>

        <select
          id="exteriorColor"
          name="exteriorColor"
          value={form.exteriorColor}
          onChange={onChange}
          className={fieldClass(Boolean(errors.exteriorColor))}
        >
          <option value="">Select exterior color</option>
          {EXTERIOR_COLOR_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <p className="text-sm text-gray-600">
          Select the actual exterior color of the vehicle being offered in this
          quote.
        </p>

        <ErrorText>{errors.exteriorColor}</ErrorText>
      </div>
    </div>
  );
}
