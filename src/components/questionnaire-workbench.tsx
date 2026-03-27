"use client";

import Image from "next/image";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { brandArt } from "@/lib/brand-art";
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

type MobilePanel = "queue" | "answer" | "evidence";

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
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("answer");
  const submitReviewRef = useRef<(reviewStatus: "APPROVED" | "NEEDS_REVIEW") => Promise<void>>(async () => {});

  const selectedItem = data.items[selectedIndex] ?? null;

  useEffect(() => {
    setData(props.initialData);
  }, [props.initialData]);

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

  const progressText = useMemo(() => {
    return `${data.questionnaire.approvedCount}/${data.questionnaire.totalCount} approved`;
  }, [data.questionnaire.approvedCount, data.questionnaire.totalCount]);

  const answeredPercentage = useMemo(() => {
    if (data.questionnaire.totalCount === 0) {
      return 0;
    }

    return Math.round((data.questionnaire.answeredCount / data.questionnaire.totalCount) * 100);
  }, [data.questionnaire.answeredCount, data.questionnaire.totalCount]);

  async function refreshWorkbench() {
    const response = await fetch(
      `/api/questionnaires/${data.questionnaire.id}?workspaceSlug=${encodeURIComponent(props.workspaceSlug)}`,
      {
        cache: "no-store"
      }
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
        setSelectedIndex((current) => Math.min(payload.items.length - 1, current + 1));
        setMobilePanel("answer");
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

  async function exportCsv() {
    window.location.href = `/api/questionnaires/${data.questionnaire.id}/export?workspaceSlug=${encodeURIComponent(props.workspaceSlug)}`;
    setTimeout(() => {
      void refreshWorkbench();
    }, 600);
  }

  function handleSelectIndex(index: number) {
    setSelectedIndex(index);
    setMobilePanel("answer");
  }

  if (!selectedItem) {
    return null;
  }

  return (
    <div className="workbench-shell">
      <section className="workbench-stage">
        <div className="workbench-stage-art">
          <Image
            alt=""
            aria-hidden="true"
            className="art-image art-image-desktop"
            fill
            priority
            sizes="100vw"
            src={brandArt.workbenchDesktop}
          />
          <Image alt="" aria-hidden="true" className="art-image art-image-mobile" fill sizes="100vw" src={brandArt.workbenchMobile} />
        </div>

        <div className="workbench-stage-copy">
          <span className="eyebrow">Review workbench</span>
          <h1>{data.questionnaire.name}</h1>
          <p>
            Stay inside one proof canvas: queue on the left, draft in the center, evidence in view, and clear actions to
            move the file forward.
          </p>
          <div className="workbench-stage-stats">
            <div>
              <span>{progressText}</span>
              <strong>{answeredPercentage}% answered</strong>
            </div>
            <div>
              <span>Needs review</span>
              <strong>{data.questionnaire.needsReviewCount}</strong>
            </div>
            <div>
              <span>Autofill cursor</span>
              <strong>{data.questionnaire.autofillCursor}</strong>
            </div>
          </div>
        </div>

        <div className="workbench-toolbar workbench-toolbar-stage">
          <div className="toolbar-shortcuts">
            <span>Shortcuts</span>
            <small>Shift+J previous</small>
            <small>Shift+K next</small>
            <small>Shift+A approve</small>
            <small>Shift+R needs review</small>
          </div>
          <div className="toolbar-actions">
            <button className="button-secondary button-secondary-dark" disabled={isMutating} onClick={() => void runAutofillBatch()} type="button">
              {isMutating ? "Running batch..." : "Run autofill batch"}
            </button>
            <button className="button-secondary button-secondary-dark" onClick={exportCsv} type="button">
              Export CSV
            </button>
          </div>
        </div>
      </section>

      {message ? <p className="inline-message inline-message-dark">{message}</p> : null}

      <div className="mobile-view-switcher" role="tablist" aria-label="Workbench panels">
        <button
          className={clsx("mobile-view-button", mobilePanel === "queue" && "mobile-view-button-active")}
          onClick={() => setMobilePanel("queue")}
          type="button"
        >
          Queue
        </button>
        <button
          className={clsx("mobile-view-button", mobilePanel === "answer" && "mobile-view-button-active")}
          onClick={() => setMobilePanel("answer")}
          type="button"
        >
          Answer
        </button>
        <button
          className={clsx("mobile-view-button", mobilePanel === "evidence" && "mobile-view-button-active")}
          onClick={() => setMobilePanel("evidence")}
          type="button"
        >
          Evidence
        </button>
      </div>

      <div className="workbench-grid">
        <section
          aria-label="Question queue"
          className={clsx("glass-panel queue-panel", mobilePanel !== "queue" && "mobile-panel-hidden")}
        >
          <div className="panel-header panel-header-tight">
            <div>
              <h2>Queue</h2>
              <p>Move linearly, keep weak rows obvious, and never lose track of which answers still need human attention.</p>
            </div>
          </div>
          <div className="queue-list">
            {data.items.map((item, index) => (
              <button
                className={clsx("queue-row", index === selectedIndex && "queue-row-active")}
                key={item.id}
                onClick={() => handleSelectIndex(index)}
                type="button"
              >
                <div className="queue-row-top">
                  <strong>Row {item.rowIndex + 1}</strong>
                  <StatusChip tone={getReviewTone(item.reviewStatus)}>{item.reviewStatus.replace("_", " ")}</StatusChip>
                </div>
                <p>{item.text}</p>
                <div className="queue-row-footer">
                  <small>{item.citations.length} citations</small>
                  {item.reuseMatchType ? <small>Reuse {item.reuseMatchType}</small> : null}
                  {item.notFoundReason ? <small>Evidence gap</small> : null}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section
          aria-label="Answer editor"
          className={clsx("glass-panel answer-panel", mobilePanel !== "answer" && "mobile-panel-hidden")}
        >
          <div className="panel-header panel-header-tight">
            <div>
              <h2>Answer canvas</h2>
              <p>Write only what the current evidence can support. Approvals promote into the trusted reuse layer automatically.</p>
            </div>
            <div className="answer-panel-signals">
              <StatusChip tone={getReviewTone(selectedItem.reviewStatus)}>{selectedItem.reviewStatus.replace("_", " ")}</StatusChip>
              {selectedItem.reuseMatchType ? <StatusChip tone="success">Reuse {selectedItem.reuseMatchType}</StatusChip> : null}
            </div>
          </div>

          <div className="question-card question-card-spotlight">
            <span className="eyebrow">Selected question</span>
            <p>{selectedItem.text}</p>
          </div>

          <div className="answer-meta-strip">
            <div>
              <span>Evidence status</span>
              <strong>{selectedItem.citations.length > 0 ? "Citations attached" : "Needs citation support"}</strong>
            </div>
            <div>
              <span>Draft status</span>
              <strong>{selectedItem.answer?.trim() ? "Draft in progress" : "No answer yet"}</strong>
            </div>
          </div>

          <label className="field-label" htmlFor="answer-editor">
            Draft answer
          </label>
          <textarea id="answer-editor" onChange={(event) => setDraftAnswer(event.target.value)} rows={12} value={draftAnswer} />

          <div className="panel-actions panel-actions-split">
            <button className="button-primary" disabled={isMutating} onClick={() => void submitReview("APPROVED")} type="button">
              Approve &amp; next
            </button>
            <button
              className="button-secondary button-secondary-dark"
              disabled={isMutating}
              onClick={() => void submitReview("NEEDS_REVIEW")}
              type="button"
            >
              Mark needs review
            </button>
          </div>
        </section>

        <aside
          aria-label="Evidence drawer"
          className={clsx("glass-panel evidence-panel", mobilePanel !== "evidence" && "mobile-panel-hidden")}
        >
          <div className="panel-header panel-header-tight">
            <div>
              <h2>Evidence inspector</h2>
              <p>Keep proof attached to the answer so reviewers never have to infer why something was drafted.</p>
            </div>
            <StatusChip tone={selectedItem.citations.length > 0 ? "success" : "neutral"}>
              {selectedItem.citations.length} citations
            </StatusChip>
          </div>

          {selectedItem.citations.length === 0 ? (
            <div className="empty-state-shell empty-state-shell-compact">
              <div className="empty-state-art empty-state-art-small">
                <Image alt="" aria-hidden="true" className="art-image" fill sizes="180px" src={brandArt.emptyCitations} />
              </div>
              <div className="empty-state-copy">
                <strong>No citations yet</strong>
                <span>Run autofill or mark this row for manual review until better source evidence exists.</span>
              </div>
            </div>
          ) : (
            <div className="citation-list">
              {selectedItem.citations.map((citation) => (
                <article className="citation-card" key={`${citation.chunkId}-${citation.docName}`}>
                  <div className="citation-meta">
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
  );
}
