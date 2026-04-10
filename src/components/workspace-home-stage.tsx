import Link from "next/link";
import clsx from "clsx";
import { HomeActivationUpload } from "@/components/home-activation-upload";

export type WorkspaceHomeMode = "empty" | "questionnaire" | "review" | "export";
export type WorkspaceHomeStepStatus = "done" | "current" | "upcoming";

type LatestQuestionnaireSummary = {
  id: string;
  name: string;
  totalCount: number;
  approvedCount: number;
  needsReviewCount: number;
};

export type WorkspaceHomeNextAction = {
  rowIndex: number;
  totalCount: number;
  questionText: string;
  answerText: string | null;
  citationSource: string | null;
  citationCount: number;
  systemStatus: "PENDING" | "READY" | "PARTIAL" | "BLOCKED";
  reviewState: "UNREVIEWED" | "NEEDS_REVIEW" | "APPROVED";
};

export type WorkspaceHomeInsightState = {
  showHybrid: boolean;
  supportLine: string | null;
  exceptionItems: Array<{
    label: string;
    count: number;
    href: string;
  }>;
  approvalVelocity: {
    series: number[];
    last7Days: number;
    previous7Days: number;
    last30Days: number;
    previous30Days: number;
  };
  answerMix: {
    groundedCount: number;
    reusedCount: number;
    insufficientCount: number;
    totalCount: number;
  };
  quietContext: {
    reusableAnswersCount: number;
    latestExportAge: string | null;
    latestEvidenceRefreshAge: string | null;
  };
};

type WorkspaceHomeStageProps = {
  workspaceSlug: string;
  mode: WorkspaceHomeMode;
  kicker: string;
  title: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  stepStatuses: WorkspaceHomeStepStatus[];
  evidenceCount: number;
  readyEvidenceCount: number;
  approvedAnswersCount: number;
  exportCount: number;
  latestQuestionnaire: LatestQuestionnaireSummary | null;
  insightState: WorkspaceHomeInsightState;
  nextAction: WorkspaceHomeNextAction | null;
};

const WORKSPACE_STEPS = [
  { number: "01", label: "Source" },
  { number: "02", label: "Packet" },
  { number: "03", label: "Review" },
  { number: "04", label: "Export" }
] as const;

function getPrimaryActionLabel(mode: WorkspaceHomeMode) {
  if (mode === "questionnaire") {
    return "Ground packet";
  }

  if (mode === "export") {
    return "Open export";
  }

  return "Resume review";
}

function getSignalSeries(props: WorkspaceHomeStageProps) {
  const latestApproved = props.latestQuestionnaire?.approvedCount ?? 0;
  const approvalsDelta = props.insightState.approvalVelocity.last7Days - props.insightState.approvalVelocity.previous7Days;
  const blockedDelta = Math.max(0, props.insightState.exceptionItems.reduce((sum, item) => sum + item.count, 0) - props.insightState.answerMix.insufficientCount);

  return [
    {
      label: "Grounded",
      value: props.insightState.answerMix.groundedCount,
      delta: props.readyEvidenceCount,
      freshness: props.insightState.quietContext.latestEvidenceRefreshAge ?? "quiet",
      tone: "cyan"
    },
    {
      label: "Approved",
      value: latestApproved,
      delta: approvalsDelta,
      freshness: "7d",
      tone: "steel"
    },
    {
      label: "Reused",
      value: props.insightState.answerMix.reusedCount,
      delta: Math.max(0, props.insightState.answerMix.reusedCount - Math.floor(latestApproved / 3)),
      freshness: props.insightState.quietContext.latestExportAge ?? "quiet",
      tone: "ice"
    },
    {
      label: "Blocked",
      value: props.insightState.answerMix.insufficientCount,
      delta: blockedDelta * -1,
      freshness: "now",
      tone: "warning"
    }
  ] as const;
}

function getTickerItems(props: WorkspaceHomeStageProps) {
  const delta7 = props.insightState.approvalVelocity.last7Days - props.insightState.approvalVelocity.previous7Days;

  return [
    `${props.readyEvidenceCount}/${Math.max(props.evidenceCount, 1)} sources ready`,
    `${props.insightState.approvalVelocity.last7Days} approvals in 7d`,
    `${delta7 >= 0 ? "+" : "-"}${Math.abs(delta7)} approval delta`,
    `${props.insightState.quietContext.reusableAnswersCount} reusable answers`,
    props.insightState.quietContext.latestEvidenceRefreshAge
      ? `evidence refreshed ${props.insightState.quietContext.latestEvidenceRefreshAge}`
      : "evidence refresh incoming",
    props.insightState.quietContext.latestExportAge ? `latest export ${props.insightState.quietContext.latestExportAge}` : "export lane warming"
  ];
}

function getAttentionItems(props: WorkspaceHomeStageProps) {
  const defaultItems = [
    {
      label: "Entry",
      value:
        props.nextAction && props.mode === "review"
          ? `Q${props.nextAction.rowIndex + 1}`
          : props.mode === "export"
            ? "Export lane"
            : "Next packet",
      detail:
        props.nextAction?.reviewState === "NEEDS_REVIEW"
          ? "review"
          : props.mode === "export"
            ? "ready"
            : "flow"
    },
    {
      label: "Proof",
      value: props.nextAction?.citationSource ?? "Awaiting alignment",
      detail:
        props.nextAction?.citationCount && props.nextAction.citationCount > 0
          ? `${props.nextAction.citationCount} linked`
          : "quiet"
    },
    {
      label: "Context",
      value: `${props.approvedAnswersCount} approved · ${props.exportCount} exports`,
      detail: "workspace"
    }
  ];

  if (props.insightState.exceptionItems.length === 0) {
    return defaultItems;
  }

  return props.insightState.exceptionItems.slice(0, 3).map((item) => ({
    label: item.label,
    value: `${item.count}`,
    detail: "waiting"
  }));
}

export function WorkspaceHomeStage(props: WorkspaceHomeStageProps) {
  const signalSeries = getSignalSeries(props);
  const tickerItems = getTickerItems(props);
  const attentionItems = getAttentionItems(props);
  const maxSignalValue = Math.max(...signalSeries.map((signal) => signal.value), 1);

  return (
    <section className={clsx("workspace-home-shell", `workspace-home-shell-${props.mode}`)}>
      <header className="workspace-home-signal-header workspace-home-enter workspace-home-enter-head">
        <div className="workspace-home-signal-copy">
          <span className="workspace-home-kicker">{props.kicker}</span>
          <div className="workspace-home-signal-title-row">
            <strong>Signals</strong>
          </div>
          <p>Grounding, review, reuse, and blockers in one field.</p>
        </div>

        {props.mode === "empty" ? null : (
          <div className="workspace-home-signal-actions">
            {props.ctaHref && props.ctaLabel ? (
              props.mode === "export" ? (
                <a className="button-primary workspace-home-primary-action" href={props.ctaHref}>
                  {getPrimaryActionLabel(props.mode)}
                </a>
              ) : (
                <Link className="button-primary workspace-home-primary-action" href={props.ctaHref}>
                  {getPrimaryActionLabel(props.mode)}
                </Link>
              )
            ) : null}
          </div>
        )}
      </header>

      {props.mode === "empty" ? (
        <>
          <ol aria-label="Workspace flow" className="workspace-home-rail workspace-home-enter workspace-home-enter-rail">
            {WORKSPACE_STEPS.map((step, index) => (
              <li
                className={clsx("workspace-home-rail-step", `workspace-home-rail-step-${props.stepStatuses[index]}`)}
                key={step.number}
              >
                <span className="workspace-home-rail-index">{step.number}</span>
                <span className="workspace-home-rail-label">{step.label}</span>
              </li>
            ))}
          </ol>
          <HomeActivationUpload workspaceSlug={props.workspaceSlug} />
        </>
      ) : (
        <section className="workspace-home-signal-layout workspace-home-enter workspace-home-enter-stage">
          <div className="workspace-home-signal-field-shell">
            <section className="workspace-home-signal-resume-strip">
              <div className="workspace-home-signal-resume-copy">
                <span>Entry</span>
                <strong>
                  {props.nextAction && props.mode === "review"
                    ? `Review Q${props.nextAction.rowIndex + 1}`
                    : props.mode === "export"
                      ? "Export lane"
                      : "Ground packet"}
                </strong>
              </div>
              <div className="workspace-home-signal-resume-meta">
                <span>{props.readyEvidenceCount}/{Math.max(props.evidenceCount, 1)} sources ready</span>
                <span>{props.approvedAnswersCount} approved</span>
                <span>{props.latestQuestionnaire?.needsReviewCount ?? 0} needs review</span>
              </div>
            </section>

            <section className="workspace-home-signal-field">
              <header className="workspace-home-signal-board-head">
                <div>
                  <span>Workspace</span>
                  <strong>Status board</strong>
                </div>
              </header>

              <div className="workspace-home-signal-table" role="table" aria-label="Signal board">
                <div className="workspace-home-signal-table-head" role="row">
                  <span>Signal</span>
                  <span>Count</span>
                  <span>Delta</span>
                  <span>Age</span>
                  <span>Lane</span>
                </div>

                {signalSeries.map((signal) => (
                  <div className="workspace-home-signal-table-row" role="row" key={signal.label}>
                    <strong>{signal.label}</strong>
                    <span className="workspace-home-signal-table-value">{signal.value}</span>
                    <span className={clsx("workspace-home-signal-table-delta", signal.delta >= 0 ? "workspace-home-signal-table-delta-up" : "workspace-home-signal-table-delta-down")}>
                      {signal.delta > 0 ? `+${signal.delta}` : signal.delta}
                    </span>
                    <span className="workspace-home-signal-table-fresh">{signal.freshness}</span>
                    <div className={clsx("workspace-home-signal-trace", `workspace-home-signal-trace-${signal.tone}`)} aria-hidden="true">
                      <div
                        className="workspace-home-signal-trace-fill"
                        style={{ width: `${Math.max(14, (signal.value / maxSignalValue) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="workspace-home-signal-ticker">
                <div className="workspace-home-signal-ticker-track">
                  {[...tickerItems, ...tickerItems].map((item, index) => (
                    <span key={`${item}-${index}`}>{item}</span>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <aside className="workspace-home-signal-side">
            <section className="workspace-home-attention-panel">
              <header className="workspace-home-side-head">
                <span>Watchlist</span>
                <strong>Open loops</strong>
              </header>
              <div className="workspace-home-attention-list">
                {attentionItems.map((item) => (
                  <article className="workspace-home-attention-item" key={`${item.label}-${item.value}`}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <small>{item.detail === "waiting" ? "open" : item.detail}</small>
                  </article>
                ))}
              </div>
            </section>

            <section className="workspace-home-context-panel">
              <header className="workspace-home-side-head">
                <span>Now</span>
                <strong>Background</strong>
              </header>
              <div className="workspace-home-context-grid">
                <article>
                  <span>Reusable</span>
                  <strong>{props.insightState.quietContext.reusableAnswersCount}</strong>
                </article>
                <article>
                  <span>Exports</span>
                  <strong>{props.insightState.quietContext.latestExportAge ?? "pending"}</strong>
                </article>
                <article>
                  <span>Freshness</span>
                  <strong>{props.insightState.quietContext.latestEvidenceRefreshAge ?? "waiting"}</strong>
                </article>
              </div>
            </section>
          </aside>
        </section>
      )}
    </section>
  );
}
