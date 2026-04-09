// components/dealer/QuoteReviewSubmit.js

export default function QuoteReviewSubmit({
  formError,
  isSubmitting,
  submitLabel = "Submit Quote",
  submittingLabel = "Submitting Quote...",
}) {
  return (
    <div className="space-y-4">
      {formError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </div>
      ) : null}

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </div>
  );
}
