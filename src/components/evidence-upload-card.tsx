"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { brandArt } from "@/lib/brand-art";

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
      setMessage("Evidence uploaded and processed.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="workflow-card workflow-upload-card" onSubmit={handleSubmit}>
      <div className="workflow-card-copy">
        <span className="eyebrow">Evidence ingestion</span>
        <h2>Build the proof set before the first draft lands.</h2>
        <p>
          Keep the evidence library tight. Every uploaded file becomes the material Attestly can cite back during
          autofill and review.
        </p>
        <div className="workflow-checklist">
          <span>PDF, TXT, or Markdown</span>
          <span>10 MB max</span>
          <span>Chunked and embedded automatically</span>
        </div>
      </div>

      <div className="workflow-card-stage">
        <div className="workflow-card-art">
          <Image alt="" aria-hidden="true" className="art-image" fill sizes="(max-width: 920px) 100vw, 34vw" src={brandArt.evidenceAccent} />
        </div>
        <label className="upload-dropzone upload-dropzone-rich" htmlFor="evidence-file">
          <span>{file ? file.name : "Choose a citation-ready source file"}</span>
          <small>Drop in a real policy, IR plan, or source note. The app will parse, chunk, and prepare it for retrieval.</small>
        </label>
        <input
          id="evidence-file"
          accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
          className="sr-only"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          type="file"
        />

        <div className="panel-actions workflow-card-actions">
          <button className="button-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Processing evidence..." : "Upload evidence"}
          </button>
          <span className="subtle-inline-note">Private to this workspace and processed in place.</span>
        </div>

        {message ? <p className="inline-message inline-message-dark">{message}</p> : null}
      </div>
    </form>
  );
}
