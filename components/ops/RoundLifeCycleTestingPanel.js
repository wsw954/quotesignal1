// /components/ops/RoundLifecycleTestingPanel.js

export default function RoundLifecycleTestingPanel({
  requestData,
  workflowSnapshot,
  onEvaluateDryRun,
  onEvaluateAndClose,
}) {
  const lifecycle = workflowSnapshot?.lifecycle || {};
  const flags = lifecycle?.flags || {};
  const timestamps = lifecycle?.timestamps || {};
  const counts = lifecycle?.counts || {};
  const config = lifecycle?.config || {};

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-amber-950">
          Round Lifecycle Testing
        </h2>
        <p className="text-sm text-amber-900">
          Manual Phase 8A testing surface for evaluating whether the current
          round remains open or should close.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-white/70 bg-white/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Active Ruleset
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {config.ruleset || "—"}
          </p>
        </div>

        <div className="rounded-xl border border-white/70 bg-white/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Max Invited Dealers
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {config.maxInvitedDealers ?? "—"}
          </p>
        </div>

        <div className="rounded-xl border border-white/70 bg-white/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Early Close Quote Count
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {config.earlyCloseQuoteCount ?? "—"}
          </p>
        </div>

        <div className="rounded-xl border border-white/70 bg-white/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Round Window Hours
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {config.roundWindowHours ?? "—"}
          </p>
        </div>

        <div className="rounded-xl border border-white/70 bg-white/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Current Round
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {workflowSnapshot?.currentRound || "R1"}
          </p>
        </div>

        <div className="rounded-xl border border-white/70 bg-white/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Close Reason
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {lifecycle?.closeReason || "none"}
          </p>
        </div>

        <div className="rounded-xl border border-white/70 bg-white/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Round Live
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {flags.isRoundLive ? "Yes" : "No"}
          </p>
        </div>

        <div className="rounded-xl border border-white/70 bg-white/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Should Close Now
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {flags.shouldCloseRoundNow ? "Yes" : "No"}
          </p>
        </div>

        <div className="rounded-xl border border-white/70 bg-white/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Buyer Review Ready
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {flags.shouldEnableBuyerReview ? "Yes" : "No"}
          </p>
        </div>

        <div className="rounded-xl border border-white/70 bg-white/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Quoted Invitations
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {counts.quotedInvitationCount ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-white/70 bg-white/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Compliant Quotes
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {counts.compliantQuoteCount ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-white/70 bg-white/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Review Ready Field
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {requestData?.workflow?.reviewReady ? "Yes" : "No"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-3">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Started At
          </span>
          <span className="text-sm text-gray-900">
            {timestamps.startedAt || "—"}
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-3">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Deadline At
          </span>
          <span className="text-sm text-gray-900">
            {timestamps.deadlineAt || "—"}
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-3">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Closed At
          </span>
          <span className="text-sm text-gray-900">
            {timestamps.closedAt || "—"}
          </span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <form action={onEvaluateDryRun}>
          <input type="hidden" name="requestId" value={requestData.requestId} />
          <button
            type="submit"
            className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100"
          >
            Evaluate Lifecycle (Dry Run)
          </button>
        </form>

        <form action={onEvaluateAndClose}>
          <input type="hidden" name="requestId" value={requestData.requestId} />
          <button
            type="submit"
            className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-950"
          >
            Evaluate and Close If Eligible
          </button>
        </form>
      </div>

      <div className="mt-4 rounded-xl border border-amber-200 bg-white/70 p-4">
        <p className="text-sm text-amber-950">
          Use the dry run first while testing. Use the close action only when
          you want the system to actually stamp close-state fields on the
          Request.
        </p>
      </div>
    </section>
  );
}
