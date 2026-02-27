//components/intake/BuyerIntakeForm.js
"use client";

import Section from "@/components/ui/Section";
import VehicleSelector from "@/components/intake/VehicleSelector";
import ContactSection from "@/components/intake/ContactSection";
// import TradeInSection from "@/components/intake/TradeInSection";
import FinancingSection from "@/components/intake/FinancingSection";
import ReviewSubmit from "@/components/intake/ReviewSubmit";

export default function BuyerIntakeForm() {
  // Later: this component will manage overall form state + submission
  // For now: just scaffold the structure so /intake looks like a real form page.

  return (
    <div className="space-y-8">
      <Section
        title="Vehicle"
        description="Select Make, Model, and Trim."
        divider
      >
        <VehicleSelector />
      </Section>

      <Section
        title="Contact Info"
        description="So we can send you your quotes."
        divider
      >
        <ContactSection />
      </Section>

      {/* <Section
        title="Trade-In"
        description="Optional — helps dealers tailor your quote."
        divider
      >
        <TradeInSection />
      </Section> */}

      <Section
        title="Financing"
        description="Optional — helps dealers structure an offer."
        divider
      >
        <FinancingSection />
      </Section>

      <Section
        title="Review & Submit"
        description="Confirm your details before sending."
      >
        <ReviewSubmit />
      </Section>
    </div>
  );
}
