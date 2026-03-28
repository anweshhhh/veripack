"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function QuestionnaireImportCard(props: { workspaceSlug: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setMessage("Choose a CSV file first.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const formData = new FormData();
    formData.set("workspaceSlug", props.workspaceSlug);
    formData.set("file", file);

    try {
      const response = await fetch("/api/questionnaires", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Import failed.");
      }

      setFile(null);
      setMessage("Questionnaire imported.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="task-card" onSubmit={handleSubmit}>
      <div className="task-card-copy">
        <span className="panel-kicker">Step 2</span>
        <h2>Import questionnaire</h2>
        <p>Bring in one buyer CSV after the evidence base is ready.</p>
        <div className="tag-row">
          <span className="tag">CSV only</span>
          <span className="tag">Headers preserved</span>
          <span className="tag">Row order preserved</span>
        </div>
      </div>

      <label className="dropzone" htmlFor="questionnaire-file">
        <span>{file ? file.name : "Choose a questionnaire CSV"}</span>
        <small>We will pick the likely question column automatically.</small>
      </label>
      <input
        id="questionnaire-file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        type="file"
      />

      <div className="task-card-actions">
        <button className="button-primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Importing..." : "Import questionnaire"}
        </button>
      </div>

      {message ? <p className="inline-message">{message}</p> : null}
    </form>
  );
}
