// components/intake/ReviewSubmit.js
"use client";

import Button from "@/components/ui/Button";

export default function ReviewSubmit({
  isSubmitting = false,
  canSubmit = true,
}) {
  return (
    <Button type="submit" size="lg" disabled={isSubmitting || !canSubmit}>
      {isSubmitting ? "Submitting..." : "Submit Request"}
    </Button>
  );
}
