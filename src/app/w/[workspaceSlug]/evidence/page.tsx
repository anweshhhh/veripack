export const dynamic = "force-dynamic";

import Image from "next/image";
import { StatusChip } from "@/components/status-chip";
import { EvidenceUploadCard } from "@/components/evidence-upload-card";
import { requireCurrentUser } from "@/lib/auth";
import { brandArt } from "@/lib/brand-art";
import { listEvidenceDocuments } from "@/lib/evidence";

export default async function EvidencePage({ params }: { params: { workspaceSlug: string } }) {
  const currentUser = await requireCurrentUser();
  const { documents, readiness } = await listEvidenceDocuments(currentUser.user.id, params.workspaceSlug);

  return (
    <div className="workflow-page">
      <section className="page-stage">
        <div className="page-stage-copy">
          <span className="eyebrow">Evidence library</span>
          <h1>Keep the source set small, sharp, and ready to quote.</h1>
          <p>
            This is the material the model can stand on. If a file is weak, noisy, or stale, it should not be driving
            autofill.
          </p>
        </div>
        <div className="page-stage-art">
          <div className="art-frame art-frame-stage">
            <Image alt="" aria-hidden="true" className="art-image" fill sizes="(max-width: 920px) 100vw, 34vw" src={brandArt.evidenceAccent} />
          </div>
        </div>
      </section>

      <EvidenceUploadCard workspaceSlug={params.workspaceSlug} />

      <section className="library-panel">
        <div className="panel-header panel-header-tight">
          <div>
            <h2>Evidence readiness</h2>
            <p>Every document below lives inside the workspace boundary and feeds retrieval only when it is actually ready.</p>
          </div>
          <div className="meta-pills">
            <StatusChip tone="neutral">{readiness.totalDocuments} total</StatusChip>
            <StatusChip tone="success">{readiness.readyDocuments} ready</StatusChip>
            {readiness.processingErrors > 0 ? <StatusChip tone="danger">{readiness.processingErrors} errors</StatusChip> : null}
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="empty-state-shell">
            <div className="empty-state-art">
              <Image alt="" aria-hidden="true" className="art-image" fill sizes="240px" src={brandArt.emptyEvidence} />
            </div>
            <div className="empty-state-copy">
              <strong>No evidence uploaded yet</strong>
              <span>Upload the first source document to unlock grounded answering and visible citations.</span>
            </div>
          </div>
        ) : (
          <div className="record-stack">
            {documents.map((document) => (
              <article className="record-card" key={document.id}>
                <div className="record-card-main">
                  <div className="record-card-title">
                    <strong>{document.name}</strong>
                    <span>{document.mimeType}</span>
                  </div>
                  <p>
                    {Math.max(1, Math.round(document.byteSize / 1024))} KB
                    {document.chunkCount > 0 ? ` • ${document.chunkCount} chunks prepared` : ""}
                    {document.errorMessage ? ` • ${document.errorMessage}` : ""}
                  </p>
                </div>
                <div className="record-card-meta">
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
