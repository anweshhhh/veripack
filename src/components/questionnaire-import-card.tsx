"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { brandArt } from "@/lib/brand-art";

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
    <form className="workflow-card workflow-upload-card" onSubmit={handleSubmit}>
      <div className="workflow-card-copy">
        <span className="eyebrow">Questionnaire intake</span>
        <h2>Bring in the buyer file only when the proof base is ready.</h2>
        <p>
          CSV-only in V3. Attestly keeps the original row order and headers, then layers answer, citations, and review
          status back into the export.
        </p>
        <div className="workflow-checklist">
          <span>CSV import</span>
          <span>Original headers preserved</span>
          <span>Batch autofill ready</span>
        </div>
      </div>

      <div className="workflow-card-stage">
        <div className="workflow-card-art">
          <Image
            alt=""
            aria-hidden="true"
            className="art-image"
            fill
            sizes="(max-width: 920px) 100vw, 34vw"
            src={brandArt.questionnaireAccent}
          />
        </div>
        <label className="upload-dropzone upload-dropzone-rich" htmlFor="questionnaire-file">
          <span>{file ? file.name : "Choose the questionnaire CSV"}</span>
          <small>The most likely question column is selected automatically so you can move straight into review.</small>
        </label>
        <input
          id="questionnaire-file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          type="file"
        />

        <div className="panel-actions workflow-card-actions">
          <button className="button-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Importing questionnaire..." : "Import questionnaire"}
          </button>
          <span className="subtle-inline-note">Rows stay intact so export feels native to the buyer file.</span>
        </div>

        {message ? <p className="inline-message inline-message-dark">{message}</p> : null}
      </div>
    </form>
  );
}
