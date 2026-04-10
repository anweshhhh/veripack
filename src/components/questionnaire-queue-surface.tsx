"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type QueueQuestionnaire = {
  id: string;
  name: string;
  totalCount: number;
  approvedCount: number;
  needsReviewCount: number;
  scopeLabel: string;
};

export function QuestionnaireQueueSurface(props: {
  workspaceSlug: string;
  questionnaires: QueueQuestionnaire[];
  readyEvidenceCount: number;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [activeMotion, setActiveMotion] = useState<"none" | "enter" | "handoff">("none");
  const [handoffFromId, setHandoffFromId] = useState<string | null>(null);

  const activeQuestionnaire = props.questionnaires[0] ?? null;
  const remainingQueue = props.questionnaires.slice(1);
  const previousActiveIdRef = useRef<string | null>(activeQuestionnaire?.id ?? null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReduceMotion(mediaQuery.matches);

    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);
    return () => mediaQuery.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      previousActiveIdRef.current = activeQuestionnaire?.id ?? null;
      setActiveMotion("none");
      setHandoffFromId(null);
      return;
    }

    const previousActiveId = previousActiveIdRef.current;
    const currentActiveId = activeQuestionnaire?.id ?? null;

    if (currentActiveId && !previousActiveId) {
      setActiveMotion("enter");
    } else if (currentActiveId && previousActiveId && currentActiveId !== previousActiveId) {
      setActiveMotion("handoff");
      setHandoffFromId(previousActiveId);
    } else {
      return;
    }

    previousActiveIdRef.current = currentActiveId;
    const timer = window.setTimeout(() => {
      setActiveMotion("none");
      setHandoffFromId(null);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [activeQuestionnaire?.id, reduceMotion]);

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

      const payload = (await response.json()) as { error?: string };
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
    void importFile(droppedFile);
  }

  function renderImportDock(options: { subtle: boolean }) {
    return (
      <form
        className={clsx("ops-intake-dock", options.subtle && "ops-intake-dock-subtle")}
        onSubmit={(event) => {
          event.preventDefault();
          void importFile(file);
        }}
      >
        <label
          className={clsx(
            "ops-intake-zone",
            isDragActive && "ops-intake-zone-drag",
            file && "ops-intake-zone-selected",
            isSubmitting && "ops-intake-zone-uploading"
          )}
          htmlFor="questionnaire-file"
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <div className="ops-intake-zone-copy">
            <strong>{file ? file.name : "Drop one packet here"}</strong>
            <small>{isSubmitting ? "Importing..." : "or browse"}</small>
          </div>
        </label>
        <input
          id="questionnaire-file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          type="file"
        />
        <button
          className={clsx(options.subtle ? "button-secondary ops-import-quiet" : "button-primary")}
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Importing..." : options.subtle ? "Import another" : "Import packet"}
        </button>
      </form>
    );
  }

  return (
    <section className="ops-surface ops-surface-queue">
      <div className="ops-surface-head">
        <div className="ops-surface-head-copy ops-surface-head-copy-compact">
          <h2>Packets</h2>
          <p className="ops-surface-footnote">New packets snapshot the ready evidence scope by default ({props.readyEvidenceCount} files right now).</p>
        </div>
      </div>

      {message ? <p className="inline-message">{message}</p> : null}

      {activeQuestionnaire ? (
        <>
          <article
            className={clsx(
              "ops-queue-active-row",
              activeMotion === "enter" && "ops-queue-active-row-enter",
              activeMotion === "handoff" && "ops-queue-active-row-handoff"
            )}
          >
            <div className="ops-queue-active-copy">
              <small>Active packet</small>
              <strong>{activeQuestionnaire.name}</strong>
              <p>
                {activeQuestionnaire.totalCount} rows • {activeQuestionnaire.approvedCount} approved •{" "}
                {activeQuestionnaire.needsReviewCount} needs review
              </p>
              <span className="ops-queue-scope-note">Scope: {activeQuestionnaire.scopeLabel}</span>
            </div>
            <Link className="button-primary" href={`/w/${props.workspaceSlug}/review?questionnaireId=${encodeURIComponent(activeQuestionnaire.id)}`}>
              Continue review
            </Link>
          </article>

          {renderImportDock({ subtle: true })}
        </>
      ) : (
        <>
          {renderImportDock({ subtle: false })}
          <p className="ops-library-empty">No packets yet.</p>
        </>
      )}

      {remainingQueue.length > 0 ? (
        <div className="ops-library-list">
          {remainingQueue.map((questionnaire) => (
            <article
              className={clsx(
                "ops-library-row ops-library-row-queue",
                handoffFromId === questionnaire.id && activeMotion === "handoff" && "ops-library-row-handoff-out"
              )}
              key={questionnaire.id}
            >
              <div className="ops-library-row-copy">
                <strong>{questionnaire.name}</strong>
                <small>
                  {questionnaire.totalCount} rows • {questionnaire.needsReviewCount} needs review • {questionnaire.scopeLabel}
                </small>
              </div>
              <div className="ops-library-row-meta">
                <Link className="button-secondary" href={`/w/${props.workspaceSlug}/review?questionnaireId=${encodeURIComponent(questionnaire.id)}`}>
                  Open
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
