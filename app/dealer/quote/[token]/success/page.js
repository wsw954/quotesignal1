//app/dealer/quote/[token]/success/page.js

export default async function DealerQuoteSuccessPage({ params }) {
  const resolvedParams = await params;
  const token = decodeURIComponent(resolvedParams?.token || "");

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-green-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">
            Quote Submitted Successfully
          </h1>

          <p className="mt-3 text-sm text-gray-700">
            Thank you. Your quote has been submitted to QuoteSignal and recorded
            for this request.
          </p>

          <div className="mt-6 space-y-3 text-sm text-gray-700">
            <p>
              You may now close this page. If follow-up is needed, QuoteSignal
              will contact you using the dealer contact information on file.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
