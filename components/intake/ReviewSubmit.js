//components/intake/ReviewSubmit.js
"use client";

import Button from "@/components/ui/Button";

export default function ReviewSubmit() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600">
        Next step: we’ll validate your request and submit it to QuoteSignal.
      </p>

      <Button type="button" size="lg" disabled>
        Submit (coming next)
      </Button>
    </div>
  );
}
