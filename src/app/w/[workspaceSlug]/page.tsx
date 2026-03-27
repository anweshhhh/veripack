export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { brandArt } from "@/lib/brand-art";
import { requirePageWorkspaceAccess } from "@/lib/auth";

type NextMove = {
  title: string;
  description: string;
  href: string;
  label: string;
};

function resolveNextMove(params: {
  workspaceSlug: string;
  evidenceCount: number;
  readyEvidenceCount: number;
  questionnaireCount: number;
  latestQuestionnaireId: string | null;
}) : NextMove {
  if (params.evidenceCount === 0) {
    return {
      title: "Start with evidence",
      description: "Seed the workspace with the source material you want cited back in every strong answer.",
      href: `/w/${params.workspaceSlug}/evidence`,
      label: "Upload evidence"
    };
  }

  if (params.questionnaireCount === 0) {
    return {
      title: "Import the first buyer file",
      description: "Your evidence base is live. Bring in a CSV and let the review loop start.",
      href: `/w/${params.workspaceSlug}/questionnaires`,
      label: "Import questionnaire"
    };
  }

  if (params.readyEvidenceCount < params.evidenceCount) {
    return {
      title: "Tighten the evidence library",
      description: "One or more documents still need attention before the workspace is fully citation-ready.",
      href: `/w/${params.workspaceSlug}/evidence`,
      label: "Review evidence"
    };
  }

  return {
    title: "Return to the live review queue",
    description: "The source set is ready. Move back into the workbench and push approved answers forward.",
    href: params.latestQuestionnaireId
      ? `/w/${params.workspaceSlug}/questionnaires/${params.latestQuestionnaireId}`
      : `/w/${params.workspaceSlug}/questionnaires`,
    label: "Open workbench"
  };
}

export default async function WorkspaceHomePage({ params }: { params: { workspaceSlug: string } }) {
  const access = await requirePageWorkspaceAccess(params.workspaceSlug, "VIEW_HOME");

  const [evidenceCount, readyEvidenceCount, questionnaireCount, approvedAnswersCount, latestQuestionnaire] = await Promise.all([
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
    })
  ]);

  const nextMove = resolveNextMove({
    workspaceSlug: params.workspaceSlug,
    evidenceCount,
    readyEvidenceCount,
    questionnaireCount,
    latestQuestionnaireId: latestQuestionnaire?.id ?? null
  });

  return (
    <div className="workspace-home">
      <section className="workspace-stage">
        <div className="workspace-stage-copy">
          <span className="eyebrow">Workspace control center</span>
          <h1>Move the team from evidence to export without losing the proof line.</h1>
          <p>
            This workspace is narrowed to the operations that matter: source ingestion, questionnaire intake, review,
            approval, and export.
          </p>
          <div className="hero-actions">
            <Link className="button-primary" href={nextMove.href}>
              {nextMove.label}
            </Link>
            <Link className="button-secondary button-secondary-dark" href={`/w/${params.workspaceSlug}/questionnaires`}>
              Open review queue
            </Link>
          </div>
        </div>

        <div className="workspace-stage-visual">
          <div className="art-frame art-frame-workspace">
            <Image
              alt=""
              aria-hidden="true"
              className="art-image"
              fill
              priority
              sizes="(max-width: 920px) 100vw, 40vw"
              src={brandArt.workspaceBanner}
            />
            <div className="stage-overlay-card">
              <span>Recommended next move</span>
              <strong>{nextMove.title}</strong>
              <p>{nextMove.description}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="signal-grid">
        <article className="signal-card">
          <span>Evidence ready</span>
          <strong>
            {readyEvidenceCount}/{evidenceCount || 1}
          </strong>
          <p>{evidenceCount === 0 ? "No documents uploaded yet." : `${readyEvidenceCount} documents are citation-ready.`}</p>
        </article>
        <article className="signal-card">
          <span>Questionnaires live</span>
          <strong>{questionnaireCount}</strong>
          <p>{questionnaireCount === 0 ? "No buyer files imported yet." : "Active files are ready for batch autofill and review."}</p>
        </article>
        <article className="signal-card">
          <span>Approved memory</span>
          <strong>{approvedAnswersCount}</strong>
          <p>Reviewed answers promoted with evidence snapshots and reuse safeguards.</p>
        </article>
      </section>

      <section className="command-grid">
        <article className="command-panel">
          <span className="eyebrow">Operational pulse</span>
          <h2>What deserves attention now</h2>
          <div className="command-panel-list">
            <div>
              <strong>{evidenceCount === 0 ? "No source library yet" : `${evidenceCount - readyEvidenceCount} documents need attention`}</strong>
              <p>Keep the evidence set small, current, and processed before the team leans on it.</p>
            </div>
            <div>
              <strong>{questionnaireCount === 0 ? "No active questionnaires" : `${questionnaireCount} questionnaire${questionnaireCount > 1 ? "s" : ""} active`}</strong>
              <p>Batch autofill only works well when the evidence set is already in good shape.</p>
            </div>
            <div>
              <strong>{approvedAnswersCount === 0 ? "Reuse library is empty" : `${approvedAnswersCount} approved answers live`}</strong>
              <p>Every approval compounds future speed, as long as the proof stays fresh.</p>
            </div>
          </div>
        </article>

        <article className="command-panel command-panel-highlight">
          <span className="eyebrow">Live file</span>
          {latestQuestionnaire ? (
            <>
              <h2>{latestQuestionnaire.name}</h2>
              <p>
                {latestQuestionnaire.approvedCount}/{latestQuestionnaire.totalCount} approved with{" "}
                {latestQuestionnaire.needsReviewCount} still needing review.
              </p>
              <Link className="button-secondary button-secondary-dark" href={`/w/${params.workspaceSlug}/questionnaires/${latestQuestionnaire.id}`}>
                Resume workbench
              </Link>
            </>
          ) : (
            <>
              <h2>Nothing is in review yet.</h2>
              <p>Once a questionnaire lands, this card becomes the quickest route back into the active review stream.</p>
              <Link className="button-secondary button-secondary-dark" href={`/w/${params.workspaceSlug}/questionnaires`}>
                Go to questionnaires
              </Link>
            </>
          )}
        </article>
      </section>

      <section className="journey-panel">
        <div className="journey-panel-copy">
          <span className="eyebrow">Proof loop</span>
          <h2>The product now behaves like a review instrument, not a scattered checklist of features.</h2>
        </div>
        <div className="journey-steps">
          <article>
            <strong>Evidence first</strong>
            <p>Ingest the real documents you want the model to quote back when answers need to stand up.</p>
          </article>
          <article>
            <strong>Questionnaire next</strong>
            <p>Import one buyer file, run autofill in controlled batches, and keep weak rows obvious.</p>
          </article>
          <article>
            <strong>Approve into reuse</strong>
            <p>Promote only reviewed answers so the memory layer compounds quality instead of noise.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
