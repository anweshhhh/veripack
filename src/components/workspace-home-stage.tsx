import Link from "next/link";
import clsx from "clsx";
import { HomeActivationUpload } from "@/components/home-activation-upload";
import {
  WorkspaceHomeLiveExportMain,
  WorkspaceHomeLiveReviewMain,
  WorkspaceHomeLiveSupport
} from "@/components/workspace-home-live-panels";

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
  reviewStatus: "DRAFT" | "NEEDS_REVIEW" | "APPROVED";
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
  { number: "02", label: "Questionnaire" },
  { number: "03", label: "Review" },
  { number: "04", label: "Export" }
] as const;

function buildQuestionnaireName(questionnaire: LatestQuestionnaireSummary | null) {
  if (!questionnaire) {
    return "Latest questionnaire";
  }

  return questionnaire.name.replace(/\.[^.]+$/, "") || questionnaire.name;
}

function renderStageLineage(params: {
  mode: WorkspaceHomeMode;
  readyEvidenceCount: number;
  evidenceCount: number;
  approvedAnswersCount: number;
  latestQuestionnaireName: string;
  latestQuestionnaireApproved: number;
  latestQuestionnaireTotal: number;
}) {
  const sourceStatus =
    params.mode === "questionnaire"
      ? `${params.readyEvidenceCount}/${Math.max(params.evidenceCount, 1)} ready`
      : params.mode === "review"
        ? `${params.approvedAnswersCount} reusable answers`
        : `${params.latestQuestionnaireApproved}/${params.latestQuestionnaireTotal} approved`;

  return (
    <aside className={clsx("workspace-stage-lineage", `workspace-stage-lineage-${params.mode}`)}>
      <div className="workspace-stage-lineage-block">
        <span className="workspace-stage-lineage-label">Source</span>
        <div className="workspace-stage-source-field" aria-hidden="true">
          <div className="workspace-stage-upload-signal">
            <span />
          </div>
          <div className="workspace-stage-doc workspace-stage-doc-a" />
          <div className="workspace-stage-doc workspace-stage-doc-b" />
          <div className="workspace-stage-doc workspace-stage-doc-c" />
        </div>
      </div>

      <div className="workspace-stage-lineage-connector" aria-hidden="true" />

      <div className="workspace-stage-lineage-block">
        <span className="workspace-stage-lineage-label">Evidence</span>
        <div className="workspace-stage-evidence-core" aria-hidden="true">
          <div className="workspace-stage-evidence-ring workspace-stage-evidence-ring-a" />
          <div className="workspace-stage-evidence-ring workspace-stage-evidence-ring-b" />
          <div className="workspace-stage-evidence-link workspace-stage-evidence-link-a" />
          <div className="workspace-stage-evidence-link workspace-stage-evidence-link-b" />
          <div className="workspace-stage-evidence-link workspace-stage-evidence-link-c" />
          <div className="workspace-stage-evidence-node workspace-stage-evidence-node-a" />
          <div className="workspace-stage-evidence-node workspace-stage-evidence-node-b workspace-stage-evidence-node-hot" />
          <div className="workspace-stage-evidence-node workspace-stage-evidence-node-c" />
          <div className="workspace-stage-evidence-node workspace-stage-evidence-node-d" />
        </div>
      </div>

      <div className="workspace-stage-lineage-meta">
        <span>{sourceStatus}</span>
        <strong>{params.mode === "questionnaire" ? "Source set settled" : params.latestQuestionnaireName}</strong>
      </div>
    </aside>
  );
}

function renderQuestionnaireStage(params: {
  readyEvidenceCount: number;
  evidenceCount: number;
  approvedAnswersCount: number;
  supportLine: string | null;
}) {
  return (
    <>
      <section className="workspace-stage-surface workspace-stage-surface-questionnaire workspace-home-enter workspace-home-enter-stage">
        {renderStageLineage({
          mode: "questionnaire",
          readyEvidenceCount: params.readyEvidenceCount,
          evidenceCount: params.evidenceCount,
          approvedAnswersCount: params.approvedAnswersCount,
          latestQuestionnaireName: "Questionnaire",
          latestQuestionnaireApproved: 0,
          latestQuestionnaireTotal: 0
        })}

        <div className="workspace-stage-main workspace-stage-main-questionnaire">
          <header className="workspace-stage-sheet-head">
            <span className="workspace-stage-sheet-kicker">Next file</span>
            <strong>Buyer questionnaire CSV</strong>
          </header>

          <div className="workspace-stage-sheet-preview workspace-stage-sheet-preview-questionnaire" aria-hidden="true">
            <div className="workspace-stage-sheet-title-line" />
            <div className="workspace-stage-sheet-row workspace-stage-sheet-row-a" />
            <div className="workspace-stage-sheet-row workspace-stage-sheet-row-b workspace-stage-sheet-row-active" />
            <div className="workspace-stage-sheet-row workspace-stage-sheet-row-c" />
            <div className="workspace-stage-sheet-row workspace-stage-sheet-row-d" />
          </div>

          <footer className="workspace-stage-sheet-footer">
            <span>Buyer CSV</span>
            <strong>Review opens immediately after import</strong>
          </footer>
        </div>
      </section>

      {params.supportLine ? (
        <p className="workspace-home-support-line workspace-home-enter workspace-home-enter-support">{params.supportLine}</p>
      ) : null}
    </>
  );
}

function renderReviewStage(params: {
  latestQuestionnaireName: string;
  latestQuestionnaireApproved: number;
  latestQuestionnaireTotal: number;
  reviewRemaining: number;
  readyEvidenceCount: number;
  evidenceCount: number;
  approvedAnswersCount: number;
  insightState: WorkspaceHomeInsightState;
  nextAction: WorkspaceHomeNextAction | null;
}) {
  return (
    <>
      <section className="workspace-stage-surface workspace-stage-surface-review workspace-home-enter workspace-home-enter-stage">
        {renderStageLineage({
          mode: "review",
          readyEvidenceCount: params.readyEvidenceCount,
          evidenceCount: params.evidenceCount,
          approvedAnswersCount: params.approvedAnswersCount,
          latestQuestionnaireName: params.latestQuestionnaireName,
          latestQuestionnaireApproved: params.latestQuestionnaireApproved,
          latestQuestionnaireTotal: params.latestQuestionnaireTotal
        })}
        <WorkspaceHomeLiveReviewMain
          insightState={params.insightState}
          latestQuestionnaireApproved={params.latestQuestionnaireApproved}
          latestQuestionnaireName={params.latestQuestionnaireName}
          latestQuestionnaireTotal={params.latestQuestionnaireTotal}
          nextAction={params.nextAction}
          reviewRemaining={params.reviewRemaining}
        />
      </section>
      <WorkspaceHomeLiveSupport insightState={params.insightState} mode="review" />
    </>
  );
}

function renderExportStage(params: {
  latestQuestionnaireName: string;
  latestQuestionnaireApproved: number;
  latestQuestionnaireTotal: number;
  readyEvidenceCount: number;
  evidenceCount: number;
  approvedAnswersCount: number;
  insightState: WorkspaceHomeInsightState;
}) {
  return (
    <>
      <section className="workspace-stage-surface workspace-stage-surface-export workspace-home-enter workspace-home-enter-stage">
        {renderStageLineage({
          mode: "export",
          readyEvidenceCount: params.readyEvidenceCount,
          evidenceCount: params.evidenceCount,
          approvedAnswersCount: params.approvedAnswersCount,
          latestQuestionnaireName: params.latestQuestionnaireName,
          latestQuestionnaireApproved: params.latestQuestionnaireApproved,
          latestQuestionnaireTotal: params.latestQuestionnaireTotal
        })}
        <WorkspaceHomeLiveExportMain
          insightState={params.insightState}
          latestQuestionnaireApproved={params.latestQuestionnaireApproved}
          latestQuestionnaireName={params.latestQuestionnaireName}
          latestQuestionnaireTotal={params.latestQuestionnaireTotal}
        />
      </section>
      <WorkspaceHomeLiveSupport insightState={params.insightState} mode="export" />
    </>
  );
}

export function WorkspaceHomeStage(props: WorkspaceHomeStageProps) {
  const latestQuestionnaireName = buildQuestionnaireName(props.latestQuestionnaire);
  const latestQuestionnaireTotal = props.latestQuestionnaire?.totalCount ?? 0;
  const latestQuestionnaireApproved = props.latestQuestionnaire?.approvedCount ?? 0;
  const reviewRemaining = Math.max(latestQuestionnaireTotal - latestQuestionnaireApproved, 0);

  return (
    <section className={clsx("workspace-home-shell", `workspace-home-shell-${props.mode}`)}>
      <header className="workspace-home-head workspace-home-enter workspace-home-enter-head">
        <div className="workspace-home-copy">
          <span className="workspace-home-kicker">{props.kicker}</span>
          <h1>{props.title}</h1>
          <p>{props.description}</p>
        </div>

        {props.mode === "empty" ? null : (
          <div className="workspace-home-actions">
            {props.ctaHref && props.ctaLabel ? (
              props.mode === "export" ? (
                <a className="button-primary workspace-home-primary-action" href={props.ctaHref}>
                  {props.ctaLabel}
                </a>
              ) : (
                <Link className="button-primary workspace-home-primary-action" href={props.ctaHref}>
                  {props.ctaLabel}
                </Link>
              )
            ) : null}

            {props.secondaryHref && props.secondaryLabel ? (
              <Link className="workspace-home-secondary-action" href={props.secondaryHref}>
                {props.secondaryLabel}
              </Link>
            ) : null}
          </div>
        )}
      </header>

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

      {props.mode === "empty" ? <HomeActivationUpload workspaceSlug={props.workspaceSlug} /> : null}
      {props.mode === "questionnaire"
        ? renderQuestionnaireStage({
            readyEvidenceCount: props.readyEvidenceCount,
            evidenceCount: props.evidenceCount,
            approvedAnswersCount: props.approvedAnswersCount,
            supportLine: props.insightState.supportLine
          })
        : null}
      {props.mode === "review"
        ? renderReviewStage({
            latestQuestionnaireName,
            latestQuestionnaireApproved,
            latestQuestionnaireTotal,
            reviewRemaining,
            readyEvidenceCount: props.readyEvidenceCount,
            evidenceCount: props.evidenceCount,
            approvedAnswersCount: props.approvedAnswersCount,
            insightState: props.insightState,
            nextAction: props.nextAction
          })
        : null}
      {props.mode === "export"
        ? renderExportStage({
            latestQuestionnaireName,
            latestQuestionnaireApproved,
            latestQuestionnaireTotal,
            readyEvidenceCount: props.readyEvidenceCount,
            evidenceCount: props.evidenceCount,
            approvedAnswersCount: props.approvedAnswersCount,
            insightState: props.insightState
          })
        : null}
    </section>
  );
}
