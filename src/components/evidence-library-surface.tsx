"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type EvidenceRecord = {
  id: string;
  name: string;
  mimeType: string;
  byteSize: number;
  status: "UPLOADED" | "PROCESSING" | "READY" | "ERROR";
  errorMessage: string | null;
  updatedAt: string;
};

function formatFileSize(byteSize: number) {
  return `${Math.max(1, Math.round(byteSize / 1024))} KB`;
}

export function EvidenceLibrarySurface(props: {
  workspaceSlug: string;
  documents: EvidenceRecord[];
}) {
  const router = useRouter();
  const [documents, setDocuments] = useState(props.documents);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [processingPollRound, setProcessingPollRound] = useState(0);

  useEffect(() => {
    setDocuments(props.documents);
  }, [props.documents]);

  const metrics = useMemo(() => {
    const total = documents.length;
    const ready = documents.filter((document) => document.status === "READY").length;
    const errors = documents.filter((document) => document.status === "ERROR").length;
    const processing = documents.filter((document) => document.status === "UPLOADED" || document.status === "PROCESSING").length;

    return {
      total,
      ready,
      errors,
      processing
    };
  }, [documents]);

  const hasLongRunningProcessing = useMemo(() => {
    if (metrics.processing === 0) {
      return false;
    }

    return processingPollRound >= 4;
  }, [metrics.processing, processingPollRound]);

  const refreshDocuments = useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        const response = await fetch(`/api/evidence?workspaceSlug=${encodeURIComponent(props.workspaceSlug)}`, {
          cache: "no-store"
        });
        const payload = (await response.json()) as { documents?: EvidenceRecord[]; error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to refresh evidence.");
        }

        setDocuments(
          (payload.documents ?? []).map((document) => ({
            id: document.id,
            name: document.name,
            mimeType: document.mimeType,
            byteSize: document.byteSize,
            status: document.status,
            errorMessage: document.errorMessage ?? null,
            updatedAt: document.updatedAt
          }))
        );
      } catch (error) {
        if (!options?.silent) {
          setMessage(error instanceof Error ? error.message : "Failed to refresh evidence.");
        }
      }
    },
    [props.workspaceSlug]
  );

  useEffect(() => {
    if (metrics.processing === 0) {
      if (processingPollRound !== 0) {
        setProcessingPollRound(0);
      }
      return;
    }

    const delay = processingPollRound < 2 ? 2000 : 5000;
    const timer = window.setTimeout(async () => {
      await refreshDocuments({ silent: true });
      setProcessingPollRound((current) => current + 1);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [metrics.processing, processingPollRound, refreshDocuments]);

  async function uploadFile(targetFile: File | null) {
    if (!targetFile) {
      setMessage("Choose a PDF, TXT, or Markdown file first.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const formData = new FormData();
    formData.set("workspaceSlug", props.workspaceSlug);
    formData.set("file", targetFile);

    try {
      const response = await fetch("/api/evidence", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Upload failed.");
      }

      setFile(null);
      setMessage("Source file uploaded.");
      await refreshDocuments();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function removeDocument(documentId: string) {
    const shouldDelete = window.confirm("Remove this evidence file? This cannot be undone.");
    if (!shouldDelete) {
      return;
    }

    setDeletingDocumentId(documentId);
    setMessage("");

    try {
      const response = await fetch(`/api/evidence/${documentId}?workspaceSlug=${encodeURIComponent(props.workspaceSlug)}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to remove evidence.");
      }

      setMessage("Evidence removed.");
      await refreshDocuments();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to remove evidence.");
    } finally {
      setDeletingDocumentId(null);
    }
  }

  function onDragOver(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragActive(true);
  }

  function onDragLeave(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragActive(false);
  }

  function onDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragActive(false);

    const droppedFile = event.dataTransfer.files?.[0] ?? null;
    if (!droppedFile) {
      return;
    }

    setFile(droppedFile);
    void uploadFile(droppedFile);
  }

  return (
    <section className="ops-surface ops-surface-evidence">
      <div className="ops-surface-head">
        <div className="ops-surface-head-copy ops-surface-head-copy-compact">
          <h2>Source set</h2>
        </div>
        <div className="ops-surface-metrics" aria-live="polite">
          <span className="ops-metric-chip">
            <small>Total</small>
            <strong>{metrics.total}</strong>
          </span>
          <span className="ops-metric-chip ops-metric-chip-ready">
            <small>Ready</small>
            <strong>{metrics.ready}</strong>
          </span>
          <span className={clsx("ops-metric-chip", metrics.processing > 0 && "ops-metric-chip-processing")}>
            <small>Processing</small>
            <strong>{metrics.processing}</strong>
          </span>
          <span className={clsx("ops-metric-chip", metrics.errors > 0 && "ops-metric-chip-error")}>
            <small>Errors</small>
            <strong>{metrics.errors}</strong>
          </span>
        </div>
      </div>

      <form
        className="ops-intake-dock"
        onSubmit={(event) => {
          event.preventDefault();
          void uploadFile(file);
        }}
      >
        <label
          className={clsx(
            "ops-intake-zone",
            isDragActive && "ops-intake-zone-drag",
            file && "ops-intake-zone-selected",
            isSubmitting && "ops-intake-zone-uploading"
          )}
          htmlFor="evidence-file"
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <div className="ops-intake-zone-copy">
            <strong>{file ? file.name : "Drop one source file here"}</strong>
            <small>{isSubmitting ? "Processing upload..." : "PDF, TXT, MD or browse"}</small>
          </div>
        </label>
        <input
          id="evidence-file"
          accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
          className="sr-only"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          type="file"
        />
        <button className="button-primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Uploading..." : "Upload source"}
        </button>
      </form>

      {message ? <p className="inline-message">{message}</p> : null}

      {hasLongRunningProcessing ? (
        <p className="ops-processing-note">Processing is taking longer than usual. It will settle automatically when ready.</p>
      ) : null}

      <div className="ops-library-list" aria-live="polite">
        {documents.length === 0 ? (
          <p className="ops-library-empty">No source files yet.</p>
        ) : (
          documents.map((document) => {
            const isReady = document.status === "READY";
            const isError = document.status === "ERROR";
            const isProcessing = document.status === "UPLOADED" || document.status === "PROCESSING";
            const statusLabel = isReady ? "Ready" : isError ? "Error" : document.status === "UPLOADED" ? "Queued" : "Processing";

            return (
              <article
                className={clsx(
                  "ops-library-row",
                  isReady && "ops-library-row-ready",
                  isProcessing && "ops-library-row-processing",
                  isError && "ops-library-row-error"
                )}
                key={document.id}
              >
                <div className="ops-library-row-copy">
                  <strong>{document.name}</strong>
                  <small>
                    {document.mimeType} • {formatFileSize(document.byteSize)}
                    {document.errorMessage ? ` • ${document.errorMessage}` : ""}
                  </small>
                </div>
                <div className="ops-library-row-meta">
                  <span className="ops-row-status">{statusLabel}</span>
                  {isProcessing ? <span className="ops-row-progress" aria-hidden="true" /> : null}
                  <button
                    className="ops-row-remove"
                    disabled={deletingDocumentId === document.id}
                    onClick={() => void removeDocument(document.id)}
                    type="button"
                  >
                    {deletingDocumentId === document.id ? "Removing..." : "Remove"}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      <p className="ops-surface-footnote">Only ready evidence is used for grounded autofill.</p>
    </section>
  );
}
