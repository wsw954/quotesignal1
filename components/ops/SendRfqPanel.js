// /components/ops/SendRfqPanel.js

export default function SendRfqPanel({
  requestData,
  invitationSummary,
  workflow,
  currentRound = "R1",
  canSendRound1 = false,
  canSendRound2 = false,
  disabled = false,
}) {
  const requestId = requestData?.requestId || "";
  const sendStatus = workflow?.sendStatus?.label || "Not Sent";

  const round1Disabled =
    disabled || !requestId || currentRound !== "R1" || !canSendRound1;

  const round2Disabled =
    true || disabled || !requestId || currentRound !== "R2" || !canSendRound2;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Send RFQ</h2>
        <p className="text-sm text-gray-600">
          Round 1 now uses the Airtable-watch handoff. The app marks selected
          invitation rows <span className="font-medium">Ready To Send</span>,
          and Zap watches Airtable to perform the actual outbound delivery.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Request
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {requestId || "—"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Current Round
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {currentRound || "R1"}
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
          Use the Round 1 action only after invitation rows exist. This does not
          send the emails itself. It prepares the Airtable rows for Zap pickup.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <form action={`/api/requests/${requestId}/send-round1`} method="POST">
            <button
              type="submit"
              disabled={round1Disabled}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark Round 1 Send-Ready
            </button>
          </form>

          <button
            type="button"
            disabled={round2Disabled}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send Round 2 RFQ
          </button>
        </div>
      </div>
    </section>
  );
}
