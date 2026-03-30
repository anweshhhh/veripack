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
      secondaryLabel: "See questionnaires",
      kicker: "First step",
      spotlightLabel: "Current stage",
      spotlightValue: "Build the source library",
      spotlightNote: "Only ready evidence should drive autofill."
    };
  }

  if (params.questionnaireCount === 0) {
    return {
      title: "Import your first questionnaire",
      description: "Your source library exists. Bring in a buyer CSV and start the review workflow.",
      ctaHref: `/w/${params.workspaceSlug}/questionnaires`,
      ctaLabel: "Import questionnaire",
      secondaryHref: `/w/${params.workspaceSlug}/evidence`,
      secondaryLabel: "Review evidence",
      kicker: "Next step",
      spotlightLabel: "Current stage",
      spotlightValue: "Bring in one buyer file",
      spotlightNote: "Your evidence base is ready for the next handoff."
    };
  }

  if (!questionnaireReady && params.latestQuestionnaire) {
    return {
      title: "Continue the review workflow",
      description: "The next step is to approve the answers that are ready and flag the ones that need attention.",
      ctaHref: `/w/${params.workspaceSlug}/questionnaires/${params.latestQuestionnaire.id}`,
      ctaLabel: "Continue review",
      secondaryHref: `/w/${params.workspaceSlug}/questionnaires`,
      secondaryLabel: "All questionnaires",
      kicker: "In progress",
      spotlightLabel: "Current stage",
      spotlightValue: "Review in motion",
      spotlightNote: "Stay focused on the next answer that needs a decision."
    };
  }

  if (params.latestQuestionnaire) {
    return {
      title: "Export the completed file",
      description: "Your latest questionnaire is fully approved. Export the results when you are ready.",
      ctaHref: `/w/${params.workspaceSlug}/questionnaires/${params.latestQuestionnaire.id}`,
      ctaLabel: "Open export view",
      secondaryHref: `/w/${params.workspaceSlug}/questionnaires`,
      secondaryLabel: "All questionnaires",
      kicker: "Ready to finish",
      spotlightLabel: "Current stage",
      spotlightValue: "Export the final file",
      spotlightNote: "The latest questionnaire is fully approved and ready to leave the app."
    };
  }

  return {
    title: "Open your workspace",
    description: "Everything is set up. Pick the next action and keep the workflow moving.",
    ctaHref: `/w/${params.workspaceSlug}/questionnaires`,
    ctaLabel: "Go to questionnaires",
    secondaryHref: `/w/${params.workspaceSlug}/evidence`,
    secondaryLabel: "Go to evidence",
    kicker: "Workspace",
    spotlightLabel: "Current stage",
    spotlightValue: "Choose the next action",
    spotlightNote: "Keep moving without opening every page."
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

  const isFirstRun = evidenceCount === 0 && questionnaireCount === 0 && !latestQuestionnaire;

  if (isFirstRun) {
    return (
      <div className="page-stack home-onboarding-stack">
        <section className="home-onboarding-hero">
          <div className="home-onboarding-copy">
            <span className="home-onboarding-kicker">Workspace ready</span>
            <h1>Start with the documents you trust.</h1>
            <p>Upload a few source files first. Attestly will ground every answer against them before anything is exported.</p>

            <div className="hero-actions">
              <Link className="button-primary" href={`/w/${params.workspaceSlug}/evidence`}>
                Upload evidence
              </Link>
              <a className="home-onboarding-secondary" href="#first-run-flow">
                See workflow
              </a>
            </div>

            <div className="home-onboarding-support">
              <span>PDF, TXT, and MD supported</span>
              <span>Private workspace by default</span>
            </div>
          </div>

          <div className="home-onboarding-stage">
            <div className="home-onboarding-stage-glow home-onboarding-stage-glow-a" />
            <div className="home-onboarding-stage-glow home-onboarding-stage-glow-b" />
            <div className="home-onboarding-stage-grid" />

            <div className="home-onboarding-stage-track">
              <span className="home-onboarding-stage-line" />
              <span className="home-onboarding-stage-line-fill" />
              <span className="home-onboarding-stage-stop home-onboarding-stage-stop-active" />
              <span className="home-onboarding-stage-stop" />
              <span className="home-onboarding-stage-stop" />
              <span className="home-onboarding-stage-stop" />
            </div>

            <article className="home-onboarding-module home-onboarding-module-source">
              <span className="home-onboarding-module-label">Source</span>

              <div className="home-onboarding-source-field">
                <div className="home-onboarding-upload-chip">
                  <span />
                </div>

                <div className="home-onboarding-doc home-onboarding-doc-a" />
                <div className="home-onboarding-doc home-onboarding-doc-b" />
                <div className="home-onboarding-doc home-onboarding-doc-c" />
              </div>
            </article>

            <div className="home-onboarding-connector home-onboarding-connector-a" />
            <div className="home-onboarding-connector home-onboarding-connector-b" />
            <div className="home-onboarding-connector home-onboarding-connector-c" />

            <article className="home-onboarding-module home-onboarding-module-evidence">
              <span className="home-onboarding-module-label">Evidence</span>

              <div className="home-onboarding-evidence-core">
                <div className="home-onboarding-evidence-ring home-onboarding-evidence-ring-a" />
                <div className="home-onboarding-evidence-ring home-onboarding-evidence-ring-b" />
                <div className="home-onboarding-evidence-link home-onboarding-evidence-link-a" />
                <div className="home-onboarding-evidence-link home-onboarding-evidence-link-b" />
                <div className="home-onboarding-evidence-link home-onboarding-evidence-link-c" />
                <div className="home-onboarding-evidence-node home-onboarding-evidence-node-a" />
                <div className="home-onboarding-evidence-node home-onboarding-evidence-node-b" />
                <div className="home-onboarding-evidence-node home-onboarding-evidence-node-c" />
                <div className="home-onboarding-evidence-node home-onboarding-evidence-node-d" />
              </div>
            </article>

            <article className="home-onboarding-module home-onboarding-module-questionnaire">
              <span className="home-onboarding-module-label">Questionnaire</span>

              <div className="home-onboarding-questionnaire-field">
                <div className="home-onboarding-questionnaire-head" />
                <div className="home-onboarding-questionnaire-row home-onboarding-questionnaire-row-a" />
                <div className="home-onboarding-questionnaire-row home-onboarding-questionnaire-row-b" />
                <div className="home-onboarding-questionnaire-row home-onboarding-questionnaire-row-c" />
              </div>
            </article>

            <article className="home-onboarding-module home-onboarding-module-proof">
              <span className="home-onboarding-module-label">Proof</span>

              <div className="home-onboarding-proof-field">
                <div className="home-onboarding-proof-line home-onboarding-proof-line-strong" />
                <div className="home-onboarding-proof-line home-onboarding-proof-line-mid" />
                <div className="home-onboarding-proof-line home-onboarding-proof-line-short" />
              </div>
            </article>
          </div>
        </section>

        <section className="home-onboarding-flow" id="first-run-flow">
          <div className="home-onboarding-flow-head">
            <span className="panel-kicker">How it flows</span>
            <h2>One obvious step now. The rest appears when you need it.</h2>
          </div>

          <div className="home-onboarding-flow-grid" aria-label="First-run workflow">
            {[
              {
                number: "01",
                title: "Upload evidence",
                description: "Start with the policies, reports, or source docs you want cited later.",
                state: "active"
              },
              {
                number: "02",
                title: "Import questionnaire",
                description: "Bring in one buyer CSV once your source library is ready.",
                state: "upcoming"
              },
              {
                number: "03",
                title: "Review answers",
                description: "Approve what is grounded and hold anything that needs attention.",
                state: "upcoming"
              },
              {
                number: "04",
                title: "Export cleanly",
                description: "Download the final file once the review loop is complete.",
                state: "upcoming"
              }
            ].map((step) => (
              <article className={`home-onboarding-flow-card home-onboarding-flow-card-${step.state}`} key={step.number}>
                <span>{step.number}</span>
                <strong>{step.title}</strong>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="home-onboarding-note">
          <div>
            <span className="panel-kicker">Calm by design</span>
            <p>This page will keep simplifying itself as you move forward. Right now, all you need is a source library.</p>
          </div>

          <Link className="button-secondary" href={`/w/${params.workspaceSlug}/evidence`}>
            Go to evidence
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack home-stack">
      <section className="home-stage-card">
        <div className="home-stage-main">
          <span className="eyebrow">{homeState.kicker}</span>
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

        <div className="home-stage-side">
          <article className="home-side-card home-side-card-primary">
            <span>{homeState.spotlightLabel}</span>
            <strong>{homeState.spotlightValue}</strong>
            <small>{homeState.spotlightNote}</small>
          </article>
          <article className="home-side-card">
            <span>Workspace health</span>
            <strong>{readyEvidenceCount}/{Math.max(evidenceCount, 1)} evidence ready</strong>
            <small>{questionnaireCount} questionnaire{questionnaireCount === 1 ? "" : "s"} active</small>
          </article>
        </div>
      </section>

      <section className="home-flow-row" aria-label="Onboarding progress">
        {[
          { number: "01", label: "Evidence", description: "Build the source library." },
          { number: "02", label: "Questionnaire", description: "Import one buyer CSV." },
          { number: "03", label: "Review", description: "Approve or flag each row." },
          { number: "04", label: "Export", description: "Download the final file." }
        ].map((step, index) => (
          <article className={`flow-card flow-card-${stepStatuses[index]}`} key={step.number}>
            <span>{step.number}</span>
            <strong>{step.label}</strong>
            <p>{step.description}</p>
            <small>
              {stepStatuses[index] === "done" ? "Done" : stepStatuses[index] === "current" ? "Current" : "Later"}
            </small>
          </article>
        ))}
      </section>

      <section className="home-secondary-grid">
        {latestQuestionnaire ? (
          <section className="home-focus-card">
            <span className="panel-kicker">Latest questionnaire</span>
            <h2>{latestQuestionnaire.name}</h2>
            <p>
              {latestQuestionnaire.approvedCount}/{latestQuestionnaire.totalCount} approved
              {latestQuestionnaire.needsReviewCount > 0 ? ` • ${latestQuestionnaire.needsReviewCount} need review` : ""}
            </p>
            <Link className="button-secondary" href={`/w/${params.workspaceSlug}/questionnaires/${latestQuestionnaire.id}`}>
              Open
            </Link>
          </section>
        ) : (
          <section className="home-focus-card">
            <span className="panel-kicker">Next up</span>
            <h2>Start with one clean file.</h2>
            <p>Attestly works best when the next action is obvious. Build the evidence library first, then bring in one buyer questionnaire.</p>
            <Link className="button-secondary" href={homeState.ctaHref}>
              {homeState.ctaLabel}
            </Link>
          </section>
        )}

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
      </section>
    </div>
  );
}
