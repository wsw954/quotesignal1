//app/intake/page.js
import BuyerIntakeForm from "@/components/intake/BuyerIntakeForm";

export const metadata = {
  title: "Get Quotes | QuoteSignal",
  description: "Start your request and select your vehicle details.",
};

export default function IntakePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Get Dealer Quotes</h1>
        <p className="mt-2 text-sm text-gray-600">
          Start by selecting your vehicle. We will expand the full intake in the
          next phase.
        </p>
      </div>

      <BuyerIntakeForm />
    </main>
  );
}
