"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EvidenceUploadCard(props: { workspaceSlug: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setMessage("Choose a PDF, TXT, or Markdown file first.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const formData = new FormData();
    formData.set("workspaceSlug", props.workspaceSlug);
    formData.set("file", file);

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
      setMessage("Evidence uploaded.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="task-card" onSubmit={handleSubmit}>
      <div className="task-card-copy">
        <span className="panel-kicker">Step 1</span>
        <h2>Upload evidence</h2>
        <p>Use the source documents you want cited back during autofill.</p>
        <div className="tag-row">
          <span className="tag">PDF</span>
          <span className="tag">TXT</span>
          <span className="tag">Markdown</span>
          <span className="tag">10 MB max</span>
        </div>
      </div>

      <label className="dropzone" htmlFor="evidence-file">
        <span>{file ? file.name : "Choose a source file"}</span>
        <small>Drag and drop works too.</small>
      </label>
      <input
        id="evidence-file"
        accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
        className="sr-only"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        type="file"
      />

      <div className="task-card-actions">
        <button className="button-primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Uploading..." : "Upload evidence"}
        </button>
      </div>

      {message ? <p className="inline-message">{message}</p> : null}
    </form>
  );
}
