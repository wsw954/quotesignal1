// /components/ops/SendRfqPanel.js

export default function SendRfqPanel({
  requestData,
  invitationSummary,
  workflow,
  disabled = false,
}) {
  const sendStatus = workflow?.sendStatus?.label || "Not Sent";

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Send RFQ</h2>
        <p className="text-sm text-gray-600">
          Future send controls for Round 1 and Round 2 email batches.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Request
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {requestData?.requestId || "—"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Send Status
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">{sendStatus}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Ready Invitations
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {invitationSummary?.ready ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Sent Invitations
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {invitationSummary?.sent ?? 0}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
        <p className="text-sm text-gray-700">
          This panel will later trigger the outbound RFQ send workflow.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={disabled}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send Round 1 RFQ
          </button>

          <button
            type="button"
            disabled={disabled}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send Round 2 RFQ
          </button>
        </div>
      </div>
    </section>
  );
}
