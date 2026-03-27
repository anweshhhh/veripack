export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { QuestionnaireImportCard } from "@/components/questionnaire-import-card";
import { StatusChip } from "@/components/status-chip";
import { requireCurrentUser } from "@/lib/auth";
import { brandArt } from "@/lib/brand-art";
import { listQuestionnaires } from "@/lib/questionnaires";

export default async function QuestionnairesPage({ params }: { params: { workspaceSlug: string } }) {
  const currentUser = await requireCurrentUser();
  const { questionnaires } = await listQuestionnaires(currentUser.user.id, params.workspaceSlug);

  return (
    <div className="workflow-page">
      <section className="page-stage">
        <div className="page-stage-copy">
          <span className="eyebrow">Questionnaire queue</span>
          <h1>Bring in one buyer file and move through a visible review loop.</h1>
          <p>
            The queue is where evidence, reuse, manual edits, and approvals meet. Keep it explicit so the team never
            wonders what the model actually found.
          </p>
        </div>
        <div className="page-stage-art">
          <div className="art-frame art-frame-stage">
            <Image
              alt=""
              aria-hidden="true"
              className="art-image"
              fill
              sizes="(max-width: 920px) 100vw, 34vw"
              src={brandArt.questionnaireAccent}
            />
          </div>
        </div>
      </section>

      <QuestionnaireImportCard workspaceSlug={params.workspaceSlug} />

      <section className="library-panel">
        <div className="panel-header panel-header-tight">
          <div>
            <h2>Active questionnaires</h2>
            <p>Every imported CSV keeps its original structure while Attestly layers answer, citations, and review state back in.</p>
          </div>
        </div>

        {questionnaires.length === 0 ? (
          <div className="empty-state-shell">
            <div className="empty-state-art">
              <Image alt="" aria-hidden="true" className="art-image" fill sizes="240px" src={brandArt.emptyQuestionnaires} />
            </div>
            <div className="empty-state-copy">
              <strong>No questionnaires imported yet</strong>
              <span>Bring in a buyer CSV once the evidence base is ready to support grounded drafting.</span>
            </div>
          </div>
        ) : (
          <div className="record-stack">
            {questionnaires.map((questionnaire) => (
              <article className="record-card record-card-action" key={questionnaire.id}>
                <div className="record-card-main">
                  <div className="record-card-title">
                    <strong>{questionnaire.name}</strong>
                    <span>{questionnaire.totalCount} rows</span>
                  </div>
                  <p>
                    {questionnaire.answeredCount} answered • {questionnaire.approvedCount} approved
                    {questionnaire.needsReviewCount > 0 ? ` • ${questionnaire.needsReviewCount} need review` : " • queue is clean"}
                  </p>
                </div>
                <div className="record-card-meta record-card-meta-wide">
                  <StatusChip tone="neutral">{questionnaire.answeredCount} answered</StatusChip>
                  <StatusChip tone="success">{questionnaire.approvedCount} approved</StatusChip>
                  {questionnaire.needsReviewCount > 0 ? (
                    <StatusChip tone="warning">{questionnaire.needsReviewCount} needs review</StatusChip>
                  ) : null}
                  <Link className="button-secondary button-secondary-dark" href={`/w/${params.workspaceSlug}/questionnaires/${questionnaire.id}`}>
                    Open workbench
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
