export const dynamic = "force-dynamic";

import { DocumentStatus } from "@prisma/client";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { describeQuestionnaireEvidenceScope, getQuestionnairePageData, listQuestionnaires } from "@/lib/questionnaires";
import { ReviewEmptyImportSurface } from "@/components/review-empty-import-surface";
import { QuestionnaireWorkbench } from "@/components/questionnaire-workbench";

export default async function ReviewPage({
  params,
  searchParams
}: {
  params: { workspaceSlug: string };
  searchParams?: { questionnaireId?: string | string[] };
}) {
  const currentUser = await requireCurrentUser();
  const [{ questionnaires }, readyEvidenceCount] = await Promise.all([
    listQuestionnaires(currentUser.user.id, params.workspaceSlug),
    prisma.evidenceDocument.count({
      where: {
        workspace: {
          slug: params.workspaceSlug
        },
        status: DocumentStatus.READY
      }
    })
  ]);
  const requestedQuestionnaireId = typeof searchParams?.questionnaireId === "string" ? searchParams.questionnaireId : null;
  const selectedQuestionnaireId =
    requestedQuestionnaireId && questionnaires.some((questionnaire) => questionnaire.id === requestedQuestionnaireId)
      ? requestedQuestionnaireId
      : questionnaires[0]?.id ?? null;

  if (!selectedQuestionnaireId) {
    return (
      <div className="page-stack workspace-ops-page workspace-ops-page-review">
        <section className="workspace-ops-head workspace-ops-head-review">
          <div>
            <span className="eyebrow">Review</span>
            <h1>Verification field</h1>
            <p>Import one packet and start it against the live source scope.</p>
          </div>
        </section>
        <ReviewEmptyImportSurface readyEvidenceCount={readyEvidenceCount} workspaceSlug={params.workspaceSlug} />
      </div>
    );
  }

  const data = await getQuestionnairePageData(currentUser.user.id, params.workspaceSlug, selectedQuestionnaireId);
  const scope = describeQuestionnaireEvidenceScope(data.questionnaire);

  return (
    <QuestionnaireWorkbench
      initialData={{
        questionnaire: {
          id: data.questionnaire.id,
          name: data.questionnaire.name,
          totalCount: data.questionnaire.totalCount,
          answeredCount: data.questionnaire.answeredCount,
          approvedCount: data.questionnaire.approvedCount,
          needsReviewCount: data.questionnaire.needsReviewCount,
          autofillStatus: data.questionnaire.autofillStatus,
          autofillCursor: data.questionnaire.autofillCursor
        },
        items: data.items.map((item) => ({
          id: item.id,
          rowIndex: item.rowIndex,
          text: item.text,
          answer: item.answer,
          citations: item.citations,
          systemStatus: item.systemStatus,
          reviewState: item.reviewState,
          reuseMatchType: item.reuseMatchType,
          notFoundReason: item.notFoundReason
        }))
      }}
      questionnaireOptions={questionnaires.map((questionnaire) => ({
        id: questionnaire.id,
        name: questionnaire.name,
        approvedCount: questionnaire.approvedCount,
        totalCount: questionnaire.totalCount
      }))}
      scopeLabel={scope.label}
      workspaceSlug={params.workspaceSlug}
    />
  );
}
