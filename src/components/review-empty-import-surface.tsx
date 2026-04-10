"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReviewEmptyImportSurface(props: { workspaceSlug: string; readyEvidenceCount: number }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  async function importFile(targetFile: File | null) {
    if (!targetFile) {
      setMessage("Choose one packet file first.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const formData = new FormData();
    formData.set("workspaceSlug", props.workspaceSlug);
    formData.set("file", targetFile);

    try {
      const response = await fetch("/api/questionnaires", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as { error?: string; id?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Import failed.");
      }

      setFile(null);
      setMessage("Packet imported.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="review-empty-surface">
      <div className="review-empty-copy">
        <span className="panel-kicker">Default scope</span>
        <strong>
          New packets start against all ready evidence in this workspace ({props.readyEvidenceCount}).
        </strong>
      </div>
      <form
        className="ops-intake-dock review-empty-dock"
        onSubmit={(event) => {
          event.preventDefault();
          void importFile(file);
        }}
      >
        <label
          className={clsx(
            "ops-intake-zone review-empty-zone",
            isDragActive && "ops-intake-zone-drag",
            file && "ops-intake-zone-selected",
            isSubmitting && "ops-intake-zone-uploading"
          )}
          htmlFor="review-import-file"
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragActive(false);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragActive(false);
            const droppedFile = event.dataTransfer.files?.[0] ?? null;
            if (!droppedFile) {
              return;
            }
            setFile(droppedFile);
            void importFile(droppedFile);
          }}
        >
          <div className="ops-intake-zone-copy">
            <strong>{file ? file.name : "Drop one packet here"}</strong>
            <small>{isSubmitting ? "Importing..." : "or browse"}</small>
          </div>
        </label>
        <input
          id="review-import-file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          type="file"
        />
        <button className="button-primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Importing..." : "Import packet"}
        </button>
      </form>

      {message ? <p className="inline-message">{message}</p> : null}
    </section>
  );
}
