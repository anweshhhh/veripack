export const dynamic = "force-dynamic";

import Link from "next/link";
import { QuestionnaireImportCard } from "@/components/questionnaire-import-card";
import { StatusChip } from "@/components/status-chip";
import { requireCurrentUser } from "@/lib/auth";
import { listQuestionnaires } from "@/lib/questionnaires";

export default async function QuestionnairesPage({ params }: { params: { workspaceSlug: string } }) {
  const currentUser = await requireCurrentUser();
  const { questionnaires } = await listQuestionnaires(currentUser.user.id, params.workspaceSlug);

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <span className="eyebrow">Questionnaires</span>
          <h1>Bring in one file and move it forward.</h1>
          <p>Keep the queue simple. Import, review, approve, export.</p>
        </div>
      </section>

      <QuestionnaireImportCard workspaceSlug={params.workspaceSlug} />

      <section className="simple-panel">
        <div className="panel-head-row">
          <div>
            <h2>Queue</h2>
            <p>Open the file you want to review next.</p>
          </div>
        </div>

        {questionnaires.length === 0 ? (
          <div className="empty-panel">
            <strong>No questionnaires imported yet.</strong>
            <span>Import a buyer CSV when your evidence library is ready.</span>
          </div>
        ) : (
          <div className="list-stack">
            {questionnaires.map((questionnaire) => (
              <article className="list-row list-row-action" key={questionnaire.id}>
                <div className="list-row-main">
                  <strong>{questionnaire.name}</strong>
                  <small>
                    {questionnaire.totalCount} rows • {questionnaire.approvedCount} approved
                    {questionnaire.needsReviewCount > 0 ? ` • ${questionnaire.needsReviewCount} need review` : ""}
                  </small>
                </div>
                <div className="list-row-meta list-row-meta-wide">
                  <StatusChip tone="neutral">{questionnaire.answeredCount} answered</StatusChip>
                  <StatusChip tone="success">{questionnaire.approvedCount} approved</StatusChip>
                  {questionnaire.needsReviewCount > 0 ? (
                    <StatusChip tone="warning">{questionnaire.needsReviewCount} review</StatusChip>
                  ) : null}
                  <Link className="button-secondary" href={`/w/${params.workspaceSlug}/questionnaires/${questionnaire.id}`}>
                    Open
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
