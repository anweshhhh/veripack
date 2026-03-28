export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageWorkspaceAccess } from "@/lib/auth";

type StepStatus = "done" | "current" | "upcoming";

function resolveHomeState(params: {
  workspaceSlug: string;
  evidenceCount: number;
  readyEvidenceCount: number;
  questionnaireCount: number;
  latestQuestionnaire:
    | {
        id: string;
        name: string;
        totalCount: number;
        approvedCount: number;
        needsReviewCount: number;
      }
    | null;
}) {
  const questionnaireReady =
    params.latestQuestionnaire && params.latestQuestionnaire.totalCount > 0
      ? params.latestQuestionnaire.approvedCount >= params.latestQuestionnaire.totalCount
      : false;

  if (params.evidenceCount === 0) {
    return {
      title: "Upload your first evidence file",
      description: "Start with the source material you want cited back during autofill.",
      ctaHref: `/w/${params.workspaceSlug}/evidence`,
      ctaLabel: "Upload evidence",
      secondaryHref: `/w/${params.workspaceSlug}/questionnaires`,
      secondaryLabel: "See questionnaires"
    };
  }

  if (params.questionnaireCount === 0) {
    return {
      title: "Import your first questionnaire",
      description: "Your source library exists. Bring in a buyer CSV and start the review workflow.",
      ctaHref: `/w/${params.workspaceSlug}/questionnaires`,
      ctaLabel: "Import questionnaire",
      secondaryHref: `/w/${params.workspaceSlug}/evidence`,
      secondaryLabel: "Review evidence"
    };
  }

  if (!questionnaireReady && params.latestQuestionnaire) {
    return {
      title: "Continue the review workflow",
      description: "The next step is to approve the answers that are ready and flag the ones that need attention.",
      ctaHref: `/w/${params.workspaceSlug}/questionnaires/${params.latestQuestionnaire.id}`,
      ctaLabel: "Continue review",
      secondaryHref: `/w/${params.workspaceSlug}/questionnaires`,
      secondaryLabel: "All questionnaires"
    };
  }

  if (params.latestQuestionnaire) {
    return {
      title: "Export the completed file",
      description: "Your latest questionnaire is fully approved. Export the results when you are ready.",
      ctaHref: `/w/${params.workspaceSlug}/questionnaires/${params.latestQuestionnaire.id}`,
      ctaLabel: "Open export view",
      secondaryHref: `/w/${params.workspaceSlug}/questionnaires`,
      secondaryLabel: "All questionnaires"
    };
  }

  return {
    title: "Open your workspace",
    description: "Everything is set up. Pick the next action and keep the workflow moving.",
    ctaHref: `/w/${params.workspaceSlug}/questionnaires`,
    ctaLabel: "Go to questionnaires",
    secondaryHref: `/w/${params.workspaceSlug}/evidence`,
    secondaryLabel: "Go to evidence"
  };
}

function buildStepStatuses(params: {
  evidenceCount: number;
  questionnaireCount: number;
  latestQuestionnaire:
    | {
        totalCount: number;
        approvedCount: number;
      }
    | null;
}) {
  const reviewDone =
    params.latestQuestionnaire && params.latestQuestionnaire.totalCount > 0
      ? params.latestQuestionnaire.approvedCount >= params.latestQuestionnaire.totalCount
      : false;

  const hasQuestionnaire = params.questionnaireCount > 0;
  const hasEvidence = params.evidenceCount > 0;

  const stepOne: StepStatus = hasEvidence ? "done" : "current";
  const stepTwo: StepStatus = hasQuestionnaire ? "done" : hasEvidence ? "current" : "upcoming";
  const stepThree: StepStatus = hasQuestionnaire ? (reviewDone ? "done" : "current") : "upcoming";
  const stepFour: StepStatus = reviewDone ? "current" : "upcoming";

  return [stepOne, stepTwo, stepThree, stepFour];
}

export default async function WorkspaceHomePage({ params }: { params: { workspaceSlug: string } }) {
  const access = await requirePageWorkspaceAccess(params.workspaceSlug, "VIEW_HOME");

  const [evidenceCount, readyEvidenceCount, questionnaireCount, approvedAnswersCount, latestQuestionnaire, exportCount] =
    await Promise.all([
      prisma.evidenceDocument.count({
        where: {
          workspaceId: access.workspace.id
        }
      }),
      prisma.evidenceDocument.count({
        where: {
          workspaceId: access.workspace.id,
          status: "READY"
        }
      }),
      prisma.questionnaire.count({
        where: {
          workspaceId: access.workspace.id
        }
      }),
      prisma.approvedAnswer.count({
        where: {
          workspaceId: access.workspace.id
        }
      }),
      prisma.questionnaire.findFirst({
        where: {
          workspaceId: access.workspace.id
        },
        orderBy: {
          updatedAt: "desc"
        },
        select: {
          id: true,
          name: true,
          totalCount: true,
          approvedCount: true,
          needsReviewCount: true
        }
      }),
      prisma.exportRecord.count({
        where: {
          questionnaire: {
            workspaceId: access.workspace.id
          }
        }
      })
    ]);

  const homeState = resolveHomeState({
    workspaceSlug: params.workspaceSlug,
    evidenceCount,
    readyEvidenceCount,
    questionnaireCount,
    latestQuestionnaire
  });

  const stepStatuses = buildStepStatuses({
    evidenceCount,
    questionnaireCount,
    latestQuestionnaire
  });

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-card-main">
          <span className="eyebrow">Workspace</span>
          <h1>{homeState.title}</h1>
          <p>{homeState.description}</p>
          <div className="hero-actions">
            <Link className="button-primary" href={homeState.ctaHref}>
              {homeState.ctaLabel}
            </Link>
            <Link className="button-secondary" href={homeState.secondaryHref}>
              {homeState.secondaryLabel}
            </Link>
          </div>
        </div>

        <div className="hero-card-aside">
          <div className="mini-summary">
            <span>Workspace health</span>
            <strong>{readyEvidenceCount}/{Math.max(evidenceCount, 1)} evidence ready</strong>
            <small>{questionnaireCount} questionnaire{questionnaireCount === 1 ? "" : "s"} active</small>
          </div>
        </div>
      </section>

      <section className="step-row" aria-label="Onboarding progress">
        {[
          { number: "01", label: "Evidence" },
          { number: "02", label: "Questionnaire" },
          { number: "03", label: "Review" },
          { number: "04", label: "Export" }
        ].map((step, index) => (
          <article className={`step-tile step-tile-${stepStatuses[index]}`} key={step.number}>
            <span>{step.number}</span>
            <strong>{step.label}</strong>
            <small>
              {stepStatuses[index] === "done" ? "Done" : stepStatuses[index] === "current" ? "Current" : "Later"}
            </small>
          </article>
        ))}
      </section>

      {latestQuestionnaire ? (
        <section className="compact-panel">
          <div>
            <span className="panel-kicker">Latest questionnaire</span>
            <h2>{latestQuestionnaire.name}</h2>
            <p>
              {latestQuestionnaire.approvedCount}/{latestQuestionnaire.totalCount} approved
              {latestQuestionnaire.needsReviewCount > 0 ? ` • ${latestQuestionnaire.needsReviewCount} need review` : ""}
            </p>
          </div>
          <Link className="button-secondary" href={`/w/${params.workspaceSlug}/questionnaires/${latestQuestionnaire.id}`}>
            Open
          </Link>
        </section>
      ) : null}

      <details className="details-panel">
        <summary>Workspace details</summary>
        <div className="details-grid">
          <div>
            <span>Evidence files</span>
            <strong>{evidenceCount}</strong>
          </div>
          <div>
            <span>Approved answers</span>
            <strong>{approvedAnswersCount}</strong>
          </div>
          <div>
            <span>Exports</span>
            <strong>{exportCount}</strong>
          </div>
        </div>
      </details>
    </div>
  );
}
