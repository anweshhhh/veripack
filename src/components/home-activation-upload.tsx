"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

function formatAcceptedTypeLabel(file: File | null) {
  if (!file) {
    return "PDF, TXT, MD";
  }

  return file.name;
}

export function HomeActivationUpload(props: { workspaceSlug: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef(0);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"idle" | "error" | "info">("idle");

  const acceptedTypeLabel = useMemo(() => formatAcceptedTypeLabel(file), [file]);

  const openPicker = () => {
    inputRef.current?.click();
  };

  const handleFileSelection = (nextFile: File | null) => {
    setFile(nextFile);
    setMessage("");
    setMessageTone("idle");
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFileSelection(event.target.files?.[0] ?? null);
  };

  const handleDragEnter = (event: DragEvent<HTMLFormElement>) => {
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  };

  const handleDragOver = (event: DragEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (event: DragEvent<HTMLFormElement>) => {
    event.preventDefault();
    dragDepthRef.current = Math.max(dragDepthRef.current - 1, 0);

    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLFormElement>) => {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragActive(false);
    handleFileSelection(event.dataTransfer.files?.[0] ?? null);
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    if (!file) {
      setMessage("Choose a PDF, TXT, or Markdown file first.");
      setMessageTone("error");
      openPicker();
      return;
    }

    setIsSubmitting(true);
    setMessage("Processing source material...");
    setMessageTone("info");

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

      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
      setMessageTone("error");
      setIsSubmitting(false);
    }
  };

  const selected = Boolean(file);

  return (
    <form
      className={clsx(
        "home-activation-canvas",
        isDragActive && "home-activation-canvas-drag-active",
        selected && "home-activation-canvas-selected",
        isSubmitting && "home-activation-canvas-uploading"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <input
        ref={inputRef}
        accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
        className="sr-only"
        onChange={handleInputChange}
        type="file"
      />

      <div className="home-activation-canvas-wash home-activation-canvas-wash-a" />
      <div className="home-activation-canvas-wash home-activation-canvas-wash-b" />
      <div className="home-activation-canvas-grid" />

      <article className="home-activation-future home-activation-future-evidence" aria-hidden="true">
        <div className="home-activation-future-shell">
          <div className="home-activation-future-orbit">
            <div className="home-activation-future-ring home-activation-future-ring-a" />
            <div className="home-activation-future-ring home-activation-future-ring-b" />
            <div className="home-activation-future-link home-activation-future-link-a" />
            <div className="home-activation-future-link home-activation-future-link-b" />
            <div className="home-activation-future-link home-activation-future-link-c" />
            <div className="home-activation-future-node home-activation-future-node-a" />
            <div className="home-activation-future-node home-activation-future-node-b home-activation-future-node-hot" />
            <div className="home-activation-future-node home-activation-future-node-c" />
            <div className="home-activation-future-node home-activation-future-node-d" />
          </div>
        </div>
      </article>

      <article className="home-activation-future home-activation-future-questionnaire" aria-hidden="true">
        <div className="home-activation-future-shell">
          <div className="home-activation-future-head" />
          <div className="home-activation-future-row home-activation-future-row-a" />
          <div className="home-activation-future-row home-activation-future-row-b" />
          <div className="home-activation-future-row home-activation-future-row-c" />
        </div>
      </article>

      <article className="home-activation-future home-activation-future-proof" aria-hidden="true">
        <div className="home-activation-future-shell">
          <div className="home-activation-future-chip" />
          <div className="home-activation-future-line home-activation-future-line-strong" />
          <div className="home-activation-future-line home-activation-future-line-mid" />
          <div className="home-activation-future-line home-activation-future-line-short" />
        </div>
      </article>

      <article className="home-activation-dock">
        <button className="home-activation-dropzone" onClick={openPicker} type="button">
          <div className="home-activation-upload-signal">
            <span />
          </div>

          <div className="home-activation-doc home-activation-doc-a" />
          <div className="home-activation-doc home-activation-doc-b" />
          <div className="home-activation-doc home-activation-doc-c" />

          <div className="home-activation-dropzone-copy">
            <span>{selected ? "Selected file" : "Start here"}</span>
            <strong>{selected ? acceptedTypeLabel : "Drop your first file here"}</strong>
            <small>{selected ? "Ready to process" : "PDF, TXT, and MD supported"}</small>
          </div>
        </button>

        <div className="home-activation-dock-actions">
          <button className="home-activation-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Processing..." : selected ? "Start processing" : "Upload evidence"}
          </button>
          <button className="home-activation-secondary" onClick={openPicker} type="button">
            {selected ? "Choose another file" : "Browse files"}
          </button>
        </div>

        {message ? (
          <p className={clsx("home-activation-inline-message", `home-activation-inline-message-${messageTone}`)}>{message}</p>
        ) : null}
      </article>
    </form>
  );
}
