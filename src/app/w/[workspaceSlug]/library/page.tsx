export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth";
import { listEvidenceDocuments } from "@/lib/evidence";
import { describeQuestionnaireEvidenceScope, listQuestionnaires } from "@/lib/questionnaires";
import { EvidenceLibrarySurface } from "@/components/evidence-library-surface";
import { QuestionnaireQueueSurface } from "@/components/questionnaire-queue-surface";

type LibraryTab = "evidence" | "questionnaires";

function resolveTab(value: string | string[] | undefined): LibraryTab {
  return value === "questionnaires" ? "questionnaires" : "evidence";
}

export default async function LibraryPage({
  params,
  searchParams
}: {
  params: { workspaceSlug: string };
  searchParams?: { tab?: string | string[] };
}) {
  const currentUser = await requireCurrentUser();
  const tab = resolveTab(searchParams?.tab);

  const [evidenceData, questionnairesData] = await Promise.all([
    listEvidenceDocuments(currentUser.user.id, params.workspaceSlug),
    listQuestionnaires(currentUser.user.id, params.workspaceSlug)
  ]);
  const readyEvidenceCount = evidenceData.documents.filter((document) => document.status === "READY").length;
  const processingEvidenceCount = evidenceData.documents.filter(
    (document) => document.status === "UPLOADED" || document.status === "PROCESSING"
  ).length;
  const approvedRowsCount = questionnairesData.questionnaires.reduce(
    (sum, questionnaire) => sum + questionnaire.approvedCount,
    0
  );
  const needsReviewRowsCount = questionnairesData.questionnaires.reduce(
    (sum, questionnaire) => sum + questionnaire.needsReviewCount,
    0
  );

  return (
    <div className="page-stack workspace-ops-page workspace-ops-page-library">
      <section className="workspace-ops-head workspace-ops-head-library">
        <div>
          <span className="eyebrow">Library</span>
          <h1>Dossier archive</h1>
          <p>{tab === "evidence" ? "Source vault for live evidence, readiness, and freshness." : "Packet archive for import, scope, and review entry."}</p>
        </div>
      </section>

      <section className="library-ledger" aria-label="Library archive ledger">
        <article className="library-ledger-item">
          <span>Ready sources</span>
          <strong>{readyEvidenceCount}</strong>
          <small>{processingEvidenceCount > 0 ? `${processingEvidenceCount} still indexing` : "source vault settled"}</small>
        </article>
        <article className="library-ledger-item">
          <span>Packets</span>
          <strong>{questionnairesData.questionnaires.length}</strong>
          <small>{tab === "questionnaires" ? "archive in scope" : "ready for review"}</small>
        </article>
        <article className="library-ledger-item">
          <span>Approved rows</span>
          <strong>{approvedRowsCount}</strong>
          <small>{needsReviewRowsCount} needs review</small>
        </article>
      </section>

      <section className="library-shell">
        <div className="library-tabs" role="tablist" aria-label="Library tabs">
          <Link
            aria-selected={tab === "evidence"}
            className={tab === "evidence" ? "library-tab library-tab-active" : "library-tab"}
            href={`/w/${params.workspaceSlug}/library?tab=evidence`}
            role="tab"
          >
            Evidence
          </Link>
          <Link
            aria-selected={tab === "questionnaires"}
            className={tab === "questionnaires" ? "library-tab library-tab-active" : "library-tab"}
            href={`/w/${params.workspaceSlug}/library?tab=questionnaires`}
            role="tab"
          >
            Packets
          </Link>
        </div>

        {tab === "evidence" ? (
          <EvidenceLibrarySurface
            documents={evidenceData.documents.map((document) => ({
              id: document.id,
              name: document.name,
              mimeType: document.mimeType,
              byteSize: document.byteSize,
              status: document.status,
              errorMessage: document.errorMessage,
              updatedAt: document.updatedAt.toISOString()
            }))}
            workspaceSlug={params.workspaceSlug}
          />
        ) : (
          <QuestionnaireQueueSurface
            questionnaires={questionnairesData.questionnaires.map((questionnaire) => ({
              id: questionnaire.id,
              name: questionnaire.name,
              totalCount: questionnaire.totalCount,
              approvedCount: questionnaire.approvedCount,
              needsReviewCount: questionnaire.needsReviewCount,
              scopeLabel: describeQuestionnaireEvidenceScope(questionnaire).label
            }))}
            readyEvidenceCount={readyEvidenceCount}
            workspaceSlug={params.workspaceSlug}
          />
        )}
      </section>
    </div>
  );
}
