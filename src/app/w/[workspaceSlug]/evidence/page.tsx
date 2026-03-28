export const dynamic = "force-dynamic";

import { StatusChip } from "@/components/status-chip";
import { EvidenceUploadCard } from "@/components/evidence-upload-card";
import { requireCurrentUser } from "@/lib/auth";
import { listEvidenceDocuments } from "@/lib/evidence";

export default async function EvidencePage({ params }: { params: { workspaceSlug: string } }) {
  const currentUser = await requireCurrentUser();
  const { documents, readiness } = await listEvidenceDocuments(currentUser.user.id, params.workspaceSlug);

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <span className="eyebrow">Evidence</span>
          <h1>Build the source library.</h1>
          <p>Start here. Good answers come from clean source material.</p>
        </div>
      </section>

      <EvidenceUploadCard workspaceSlug={params.workspaceSlug} />

      <section className="simple-panel">
        <div className="panel-head-row">
          <div>
            <h2>Library</h2>
            <p>Only ready files should drive autofill.</p>
          </div>
          <div className="status-row">
            <StatusChip tone="neutral">{readiness.totalDocuments} total</StatusChip>
            <StatusChip tone="success">{readiness.readyDocuments} ready</StatusChip>
            {readiness.processingErrors > 0 ? <StatusChip tone="danger">{readiness.processingErrors} errors</StatusChip> : null}
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="empty-panel">
            <strong>No evidence uploaded yet.</strong>
            <span>Upload your first source file to unlock grounded answering.</span>
          </div>
        ) : (
          <div className="list-stack">
            {documents.map((document) => (
              <article className="list-row" key={document.id}>
                <div className="list-row-main">
                  <strong>{document.name}</strong>
                  <small>
                    {document.mimeType} • {Math.max(1, Math.round(document.byteSize / 1024))} KB
                    {document.errorMessage ? ` • ${document.errorMessage}` : ""}
                  </small>
                </div>
                <div className="list-row-meta">
                  {document.status === "READY" ? (
                    <StatusChip tone="success">Ready</StatusChip>
                  ) : document.status === "ERROR" ? (
                    <StatusChip tone="danger">Error</StatusChip>
                  ) : (
                    <StatusChip tone="warning">{document.status}</StatusChip>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
