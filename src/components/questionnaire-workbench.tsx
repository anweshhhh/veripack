"use client";

import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusChip } from "@/components/status-chip";

type Citation = {
  docName: string;
  chunkId: string;
  quotedSnippet: string;
};

type WorkbenchItem = {
  id: string;
  rowIndex: number;
  text: string;
  answer: string | null;
  citations: Citation[];
  reviewStatus: "DRAFT" | "NEEDS_REVIEW" | "APPROVED";
  reuseMatchType: "EXACT" | "NEAR_EXACT" | "SEMANTIC" | null;
  notFoundReason?: string | null;
};

type WorkbenchData = {
  questionnaire: {
    id: string;
    name: string;
    totalCount: number;
    answeredCount: number;
    approvedCount: number;
    needsReviewCount: number;
    autofillStatus: string;
    autofillCursor: number;
  };
  items: WorkbenchItem[];
};

type MobileView = "queue" | "answer" | "evidence";

function getReviewTone(reviewStatus: WorkbenchItem["reviewStatus"]) {
  switch (reviewStatus) {
    case "APPROVED":
      return "success";
    case "NEEDS_REVIEW":
      return "warning";
    default:
      return "neutral";
  }
}

function getShortStatusLabel(reviewStatus: WorkbenchItem["reviewStatus"]) {
  switch (reviewStatus) {
    case "APPROVED":
      return "Approved";
    case "NEEDS_REVIEW":
      return "Needs review";
    default:
      return "Draft";
  }
}

function getNextSelectionIndex(items: WorkbenchItem[], currentIndex: number) {
  if (items.length === 0) {
    return 0;
  }

  return Math.min(items.length - 1, currentIndex + 1);
}

function truncate(text: string, length: number) {
  if (text.length <= length) {
    return text;
  }

  return `${text.slice(0, length).trimEnd()}...`;
}

export function QuestionnaireWorkbench(props: {
  workspaceSlug: string;
  initialData: WorkbenchData;
}) {
  const router = useRouter();
  const [data, setData] = useState(props.initialData);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [draftAnswer, setDraftAnswer] = useState(props.initialData.items[0]?.answer ?? "");
  const [message, setMessage] = useState("");
  const [isMutating, setIsMutating] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("answer");
  const submitReviewRef = useRef<(reviewStatus: "APPROVED" | "NEEDS_REVIEW") => Promise<void>>(async () => {});

  const selectedItem = data.items[selectedIndex] ?? null;
  const remainingCount = Math.max(0, data.questionnaire.totalCount - data.questionnaire.approvedCount);

  useEffect(() => {
    setData(props.initialData);
  }, [props.initialData]);

  useEffect(() => {
    setSelectedIndex((current) => Math.min(current, Math.max(0, props.initialData.items.length - 1)));
  }, [props.initialData.items.length]);

  useEffect(() => {
    setDraftAnswer(selectedItem?.answer ?? "");
  }, [selectedItem?.id, selectedItem?.answer]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const isTextInput =
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "INPUT" ||
        target?.getAttribute("contenteditable") === "true";

      if (event.shiftKey && event.key.toLowerCase() === "j") {
        event.preventDefault();
        setSelectedIndex((current) => Math.max(0, current - 1));
        return;
      }

      if (event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSelectedIndex((current) => Math.min(data.items.length - 1, current + 1));
        return;
      }

      if (isTextInput) {
        return;
      }

      if (event.shiftKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        void submitReviewRef.current("APPROVED");
      }

      if (event.shiftKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        void submitReviewRef.current("NEEDS_REVIEW");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [data.items.length]);

  const summary = useMemo(() => {
    return {
      approved: `${data.questionnaire.approvedCount}/${data.questionnaire.totalCount}`,
      remaining: remainingCount,
      needsReview: data.questionnaire.needsReviewCount
    };
  }, [data.questionnaire.approvedCount, data.questionnaire.needsReviewCount, data.questionnaire.totalCount, remainingCount]);

  async function refreshWorkbench() {
    const response = await fetch(
      `/api/questionnaires/${data.questionnaire.id}?workspaceSlug=${encodeURIComponent(props.workspaceSlug)}`,
      { cache: "no-store" }
    );

    const payload = (await response.json()) as WorkbenchData & { error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to refresh questionnaire.");
    }

    setData(payload);
    return payload;
  }

  async function runAutofillBatch() {
    setIsMutating(true);
    setMessage("");

    try {
      const response = await fetch(`/api/questionnaires/${data.questionnaire.id}/autofill`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          workspaceSlug: props.workspaceSlug
        })
      });

      const payload = (await response.json()) as WorkbenchData & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Autofill failed.");
      }

      setData(payload);
      setMessage("Autofill batch completed.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Autofill failed.");
    } finally {
      setIsMutating(false);
    }
  }

  const submitReview = useCallback(
    async (reviewStatus: "APPROVED" | "NEEDS_REVIEW") => {
      if (!selectedItem) {
        return;
      }

      setIsMutating(true);
      setMessage("");

      try {
        const response = await fetch(`/api/questionnaires/${data.questionnaire.id}/items/${selectedItem.id}/review`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            workspaceSlug: props.workspaceSlug,
            answer: draftAnswer,
            reviewStatus
          })
        });

        const payload = (await response.json()) as WorkbenchData & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Review update failed.");
        }

        setData(payload);
        setMessage(reviewStatus === "APPROVED" ? "Answer approved." : "Marked for review.");
        setSelectedIndex((current) => getNextSelectionIndex(payload.items, current));
        setMobileView("answer");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Review update failed.");
      } finally {
        setIsMutating(false);
      }
    },
    [data.questionnaire.id, draftAnswer, props.workspaceSlug, router, selectedItem]
  );

  submitReviewRef.current = submitReview;

  function exportCsv() {
    window.location.href = `/api/questionnaires/${data.questionnaire.id}/export?workspaceSlug=${encodeURIComponent(props.workspaceSlug)}`;
    setTimeout(() => {
      void refreshWorkbench();
    }, 600);
  }

  function selectRow(index: number) {
    setSelectedIndex(index);
    setMobileView("answer");
  }

  if (!selectedItem) {
    return (
      <div className="page-stack">
        <section className="empty-panel">
          <strong>No questionnaire rows available.</strong>
          <span>Import a CSV to start the review workflow.</span>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="workbench-header">
        <div>
          <span className="eyebrow">Review</span>
          <h1>{data.questionnaire.name}</h1>
          <p>Approve what is ready, flag what needs work, and keep the next action obvious.</p>
        </div>

        <div className="workbench-header-actions">
          <button className="button-secondary" disabled={isMutating} onClick={() => void runAutofillBatch()} type="button">
            {isMutating ? "Running..." : "Run autofill"}
          </button>
          <button className="button-secondary" onClick={exportCsv} type="button">
            Export CSV
          </button>
        </div>
      </section>

      <section className="compact-panel workbench-summary">
        <div className="summary-block">
          <span>Approved</span>
          <strong>{summary.approved}</strong>
        </div>
        <div className="summary-block">
          <span>Remaining</span>
          <strong>{summary.remaining}</strong>
        </div>
        <div className="summary-block">
          <span>Needs review</span>
          <strong>{summary.needsReview}</strong>
        </div>
      </section>

      {message ? <p className="inline-message">{message}</p> : null}

      <div className="mobile-switcher" role="tablist" aria-label="Workbench sections">
        <button
          className={clsx("switch-pill", mobileView === "queue" && "switch-pill-active")}
          onClick={() => setMobileView("queue")}
          type="button"
        >
          Queue
        </button>
        <button
          className={clsx("switch-pill", mobileView === "answer" && "switch-pill-active")}
          onClick={() => setMobileView("answer")}
          type="button"
        >
          Answer
        </button>
        <button
          className={clsx("switch-pill", mobileView === "evidence" && "switch-pill-active")}
          onClick={() => setMobileView("evidence")}
          type="button"
        >
          Evidence
        </button>
      </div>

      <div className="workbench-grid">
        <section className={clsx("simple-panel queue-panel", mobileView !== "queue" && "mobile-hidden")}>
          <div className="panel-head-row">
            <div>
              <h2>Queue</h2>
              <p>{data.items.length} rows in this file.</p>
            </div>
          </div>

          <div className="queue-stack">
            {data.items.map((item, index) => (
              <button
                className={clsx("queue-item", index === selectedIndex && "queue-item-active")}
                key={item.id}
                onClick={() => selectRow(index)}
                type="button"
              >
                <div className="queue-item-top">
                  <strong>Row {item.rowIndex + 1}</strong>
                  <StatusChip tone={getReviewTone(item.reviewStatus)}>{getShortStatusLabel(item.reviewStatus)}</StatusChip>
                </div>
                <p>{truncate(item.text, 108)}</p>
                <small>
                  {item.citations.length} citation{item.citations.length === 1 ? "" : "s"}
                  {item.reuseMatchType ? ` • reuse ${item.reuseMatchType.toLowerCase()}` : ""}
                  {item.notFoundReason ? " • evidence gap" : ""}
                </small>
              </button>
            ))}
          </div>
        </section>

        <div className="workbench-main-stack">
          <section className={clsx("simple-panel answer-panel", mobileView !== "answer" && "mobile-hidden")}>
            <div className="panel-head-row">
              <div>
                <h2>Current answer</h2>
                <p>Row {selectedItem.rowIndex + 1}</p>
              </div>
              <div className="status-row">
                <StatusChip tone={getReviewTone(selectedItem.reviewStatus)}>
                  {getShortStatusLabel(selectedItem.reviewStatus)}
                </StatusChip>
                {selectedItem.reuseMatchType ? <StatusChip tone="success">Reuse {selectedItem.reuseMatchType}</StatusChip> : null}
              </div>
            </div>

            <div className="question-block">
              <span className="panel-kicker">Question</span>
              <strong>{selectedItem.text}</strong>
            </div>

            <label className="field-label" htmlFor="answer-editor">
              Draft answer
            </label>
            <textarea id="answer-editor" onChange={(event) => setDraftAnswer(event.target.value)} rows={11} value={draftAnswer} />

            <div className="answer-actions">
              <button className="button-primary" disabled={isMutating} onClick={() => void submitReview("APPROVED")} type="button">
                Approve &amp; next
              </button>
              <button
                className="button-secondary"
                disabled={isMutating}
                onClick={() => void submitReview("NEEDS_REVIEW")}
                type="button"
              >
                Mark needs review
              </button>
            </div>

            <details className="details-panel">
              <summary>Keyboard shortcuts</summary>
              <div className="details-grid details-grid-compact">
                <div>
                  <span>Shift + J / K</span>
                  <strong>Move rows</strong>
                </div>
                <div>
                  <span>Shift + A</span>
                  <strong>Approve</strong>
                </div>
                <div>
                  <span>Shift + R</span>
                  <strong>Needs review</strong>
                </div>
              </div>
            </details>
          </section>

          <aside className={clsx("simple-panel evidence-panel", mobileView !== "evidence" && "mobile-hidden")}>
            <div className="panel-head-row">
              <div>
                <h2>Evidence</h2>
                <p>{selectedItem.citations.length > 0 ? "Support is shown here." : "This row still needs support."}</p>
              </div>
            </div>

            {selectedItem.citations.length === 0 ? (
              <div className="empty-panel">
                <strong>No citations yet.</strong>
                <span>{selectedItem.notFoundReason ?? "Run autofill or move this row to review."}</span>
              </div>
            ) : (
              <div className="list-stack">
                {selectedItem.citations.map((citation) => (
                  <article className="citation-row" key={`${citation.chunkId}-${citation.docName}`}>
                    <div className="citation-head">
                      <strong>{citation.docName}</strong>
                      <small>{citation.chunkId}</small>
                    </div>
                    <p>{citation.quotedSnippet}</p>
                  </article>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
