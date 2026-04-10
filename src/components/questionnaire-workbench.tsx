"use client";

import clsx from "clsx";
import Link from "next/link";
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
  systemStatus: "PENDING" | "READY" | "PARTIAL" | "BLOCKED";
  reviewState: "UNREVIEWED" | "NEEDS_REVIEW" | "APPROVED";
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

type WorkbenchPacketOption = {
  id: string;
  name: string;
  approvedCount: number;
  totalCount: number;
};

type QuestionFieldStatusFilter = "all" | "ready" | "needs-review" | "blocked" | "approved";

type AutofillResponsePayload = WorkbenchData & {
  error?: string;
  processedCount?: number;
  nextCursor?: number;
  done?: boolean;
};

function getReviewTone(item: Pick<WorkbenchItem, "systemStatus" | "reviewState">) {
  if (item.reviewState === "APPROVED") {
    return "success";
  }

  if (item.reviewState === "NEEDS_REVIEW" || item.systemStatus === "PARTIAL") {
    return "warning";
  }

  return "neutral";
}

function getPrimaryStatusLabel(item: Pick<WorkbenchItem, "systemStatus" | "reviewState">) {
  if (item.reviewState === "APPROVED") {
    return "Approved";
  }

  if (item.reviewState === "NEEDS_REVIEW") {
    return "Needs review";
  }

  switch (item.systemStatus) {
    case "READY":
      return "Ready";
    case "PARTIAL":
      return "Partial";
    case "BLOCKED":
      return "Blocked";
    default:
      return "Pending";
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

function getKeywordSet(text: string) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3)
  );
}

function getAnswerFocusData(answer: string, citationText: string) {
  const trimmedAnswer = answer.trim();
  if (!trimmedAnswer) {
    return { snippet: "", score: 0 };
  }

  const segments = trimmedAnswer
    .split(/(?<=[.!?])\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return { snippet: trimmedAnswer, score: 0 };
  }

  const citationWords = getKeywordSet(citationText);
  if (citationWords.size === 0) {
    return { snippet: segments[0], score: 0 };
  }

  let bestSegment = segments[0];
  let bestScore = -1;

  for (const segment of segments) {
    const segmentWords = getKeywordSet(segment);
    let score = 0;

    for (const word of segmentWords) {
      if (citationWords.has(word)) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestSegment = segment;
    }
  }

  return { snippet: bestSegment, score: Math.max(0, bestScore) };
}

function getConfidenceLabel(score: number) {
  if (score >= 4) {
    return "High alignment";
  }

  if (score >= 2) {
    return "Moderate alignment";
  }

  if (score >= 1) {
    return "Light alignment";
  }

  return "Needs review";
}

function getNotFoundReasonLabel(reason: string | null | undefined) {
  switch (reason) {
    case "NO_RELEVANT_EVIDENCE":
      return "No relevant evidence in scope";
    case "NO_CITATIONS_RETURNED":
      return "Evidence found, but support could not be cited";
    default:
      return "No supporting evidence yet";
  }
}

function isReadyForApproval(item: Pick<WorkbenchItem, "systemStatus" | "reviewState" | "citations" | "answer">) {
  return (
    item.systemStatus === "READY" &&
    item.reviewState !== "APPROVED" &&
    Boolean(item.answer?.trim()) &&
    item.citations.length > 0
  );
}

function splitClaimLock(answer: string, snippet: string) {
  const trimmedAnswer = answer.trim();
  const trimmedSnippet = snippet.trim();

  if (!trimmedAnswer) {
    return {
      before: "",
      claim: "",
      after: "",
      matched: false
    };
  }

  if (!trimmedSnippet) {
    return {
      before: "",
      claim: trimmedAnswer,
      after: "",
      matched: false
    };
  }

  const lowerAnswer = trimmedAnswer.toLowerCase();
  const lowerSnippet = trimmedSnippet.toLowerCase();
  const matchIndex = lowerAnswer.indexOf(lowerSnippet);

  if (matchIndex === -1) {
    return {
      before: "",
      claim: trimmedSnippet,
      after: "",
      matched: false
    };
  }

  return {
    before: trimmedAnswer.slice(0, matchIndex).trimEnd(),
    claim: trimmedAnswer.slice(matchIndex, matchIndex + trimmedSnippet.length),
    after: trimmedAnswer.slice(matchIndex + trimmedSnippet.length).trimStart(),
    matched: true
  };
}

export function QuestionnaireWorkbench(props: {
  workspaceSlug: string;
  initialData: WorkbenchData;
  questionnaireOptions?: WorkbenchPacketOption[];
  scopeLabel: string;
}) {
  const router = useRouter();
  const [data, setData] = useState(props.initialData);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [draftAnswer, setDraftAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [isMutating, setIsMutating] = useState(false);
  const [mutationKind, setMutationKind] = useState<"autofill" | "review" | null>(null);
  const [surfaceMotion, setSurfaceMotion] = useState<"settle" | "advance" | "divert" | "switch" | null>(null);
  const [recentlyChangedRowIds, setRecentlyChangedRowIds] = useState<string[]>([]);
  const [questionFieldMode, setQuestionFieldMode] = useState<"all" | "changed">("all");
  const [statusFilter, setStatusFilter] = useState<QuestionFieldStatusFilter>("all");
  const [lensOpen, setLensOpen] = useState(false);
  const [selectedCitationIndex, setSelectedCitationIndex] = useState(0);
  const [transitionRowId, setTransitionRowId] = useState<string | null>(null);
  const [transitionMode, setTransitionMode] = useState<"advance" | "divert" | null>(null);
  const [incomingRowId, setIncomingRowId] = useState<string | null>(null);
  const [metricPulse, setMetricPulse] = useState(false);
  const submitReviewRef = useRef<(reviewState: "APPROVED" | "NEEDS_REVIEW") => Promise<void>>(async () => {});
  const pendingMotionRef = useRef<"advance" | "divert" | null>(null);
  const previousQuestionnaireIdRef = useRef(props.initialData.questionnaire.id);
  const previousSelectedItemIdRef = useRef<string | null>(null);
  const answerEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const selectedItem = selectedIndex === null ? null : (data.items[selectedIndex] ?? null);
  const remainingCount = Math.max(0, data.questionnaire.totalCount - data.questionnaire.approvedCount);

  useEffect(() => {
    setData(props.initialData);
  }, [props.initialData]);

  useEffect(() => {
    setSelectedIndex((current) => {
      if (current === null) {
        return null;
      }

      return Math.min(current, Math.max(0, props.initialData.items.length - 1));
    });
  }, [props.initialData.items.length]);

  useEffect(() => {
    setDraftAnswer(selectedItem?.answer ?? "");
  }, [selectedItem?.id, selectedItem?.answer]);

  useEffect(() => {
    if (previousQuestionnaireIdRef.current !== data.questionnaire.id) {
      setSelectedIndex(null);
      setLensOpen(false);
    }
  }, [data.questionnaire.id]);

  useEffect(() => {
    setSelectedCitationIndex(0);
    setLensOpen(false);
  }, [selectedItem]);

  useEffect(() => {
    if (!answerEditorRef.current || !selectedItem) {
      return;
    }

    answerEditorRef.current.style.height = "0px";
    const nextHeight = Math.min(Math.max(answerEditorRef.current.scrollHeight, 84), 320);
    answerEditorRef.current.style.height = `${nextHeight}px`;
  }, [draftAnswer, selectedItem]);

  useEffect(() => {
    const questionnaireChanged = previousQuestionnaireIdRef.current !== data.questionnaire.id;
    const selectedItemChanged = previousSelectedItemIdRef.current !== (selectedItem?.id ?? null);
    const nextMotion = questionnaireChanged ? "switch" : pendingMotionRef.current ?? (selectedItemChanged && selectedItem ? "settle" : null);

    previousQuestionnaireIdRef.current = data.questionnaire.id;
    previousSelectedItemIdRef.current = selectedItem?.id ?? null;
    pendingMotionRef.current = null;

    if (!nextMotion) {
      return;
    }

    setSurfaceMotion(nextMotion);
    const timeout = window.setTimeout(() => setSurfaceMotion(null), 320);
    return () => window.clearTimeout(timeout);
  }, [data.questionnaire.id, selectedItem]);

  useEffect(() => {
    if (!selectedItem) {
      return;
    }

    const target = rowRefs.current[selectedItem.id];
    if (!target) {
      return;
    }

    window.requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }, [selectedItem]);

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
        setSelectedIndex((current) => {
          if (current === null) {
            return 0;
          }

          return Math.max(0, current - 1);
        });
        return;
      }

      if (event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSelectedIndex((current) => {
          if (current === null) {
            return 0;
          }

          return Math.min(data.items.length - 1, current + 1);
        });
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

  useEffect(() => {
    if (recentlyChangedRowIds.length === 0) {
      return;
    }

    setMetricPulse(true);
    const pulseTimeout = window.setTimeout(() => setMetricPulse(false), 900);

    const timeout = window.setTimeout(() => {
      setRecentlyChangedRowIds([]);
      setQuestionFieldMode("all");
    }, 12000);

    return () => {
      window.clearTimeout(timeout);
      window.clearTimeout(pulseTimeout);
    };
  }, [recentlyChangedRowIds]);

  useEffect(() => {
    if (!transitionRowId && !incomingRowId) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setTransitionRowId(null);
      setTransitionMode(null);
      setIncomingRowId(null);
    }, 520);

    return () => window.clearTimeout(timeout);
  }, [incomingRowId, transitionRowId]);

  async function refreshWorkbench() {
    const response = await fetch(
      `/api/questionnaires/${data.questionnaire.id}?workspaceSlug=${encodeURIComponent(props.workspaceSlug)}`,
      { cache: "no-store" }
    );

    const payload = (await response.json()) as WorkbenchData & { error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to refresh packet.");
    }

    setData(payload);
    return payload;
  }

  async function runAutofillBatch() {
    setIsMutating(true);
    setMutationKind("autofill");
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

      const payload = (await response.json()) as AutofillResponsePayload;
      if (!response.ok) {
        throw new Error(payload.error ?? "Autofill failed.");
      }

      const changedIds = payload.items
        .filter((item, index) => {
          const previousItem = data.items[index];
          if (!previousItem) {
            return true;
          }

          return (
            previousItem.answer !== item.answer ||
            previousItem.reviewState !== item.reviewState ||
            previousItem.systemStatus !== item.systemStatus ||
            previousItem.notFoundReason !== item.notFoundReason ||
            previousItem.reuseMatchType !== item.reuseMatchType ||
            previousItem.citations.length !== item.citations.length
          );
        })
        .map((item) => item.id);

      setData(payload);
      setRecentlyChangedRowIds(changedIds);
      setQuestionFieldMode(changedIds.length > 0 ? "changed" : "all");
      setMessage(
        payload.processedCount && payload.processedCount > 0
          ? `${payload.processedCount} row${payload.processedCount === 1 ? "" : "s"} grounded.`
          : "Autofill batch completed."
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Autofill failed.");
    } finally {
      setIsMutating(false);
      setMutationKind(null);
    }
  }

  const submitReview = useCallback(
    async (reviewState: "APPROVED" | "NEEDS_REVIEW") => {
      if (!selectedItem) {
        return;
      }

      setIsMutating(true);
      setMutationKind("review");
      setMessage("");

      try {
        pendingMotionRef.current = reviewState === "APPROVED" ? "advance" : "divert";
        setTransitionRowId(selectedItem.id);
        setTransitionMode(reviewState === "APPROVED" ? "advance" : "divert");
        const response = await fetch(`/api/questionnaires/${data.questionnaire.id}/items/${selectedItem.id}/review`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            workspaceSlug: props.workspaceSlug,
            answer: draftAnswer,
            reviewState
          })
        });

        const payload = (await response.json()) as WorkbenchData & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Review update failed.");
        }

        setData(payload);
        setMessage(reviewState === "APPROVED" ? "Answer approved." : "Marked for review.");
        setSelectedIndex((current) => {
          const nextIndex = getNextSelectionIndex(payload.items, current ?? 0);
          const nextItem = payload.items[nextIndex] ?? null;
          setIncomingRowId(nextItem?.id ?? null);
          return nextIndex;
        });
        router.refresh();
      } catch (error) {
        setTransitionRowId(null);
        setTransitionMode(null);
        setIncomingRowId(null);
        setMessage(error instanceof Error ? error.message : "Review update failed.");
      } finally {
        setIsMutating(false);
        setMutationKind(null);
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
    setSelectedIndex((current) => (current === index ? null : index));
  }

  const statusCounts = useMemo(() => {
    return {
      all: data.items.length,
      ready: data.items.filter((item) => item.reviewState === "UNREVIEWED" && item.systemStatus === "READY").length,
      "needs-review": data.items.filter((item) => item.reviewState === "NEEDS_REVIEW").length,
      blocked: data.items.filter((item) => item.systemStatus === "BLOCKED").length,
      approved: data.items.filter((item) => item.reviewState === "APPROVED").length
    } as const;
  }, [data.items]);

  const visibleItems = data.items.filter((item) => {
    const passesChanged = questionFieldMode !== "changed" || recentlyChangedRowIds.includes(item.id);
    const passesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "ready"
          ? item.reviewState === "UNREVIEWED" && item.systemStatus === "READY"
          : statusFilter === "needs-review"
            ? item.reviewState === "NEEDS_REVIEW"
            : statusFilter === "blocked"
              ? item.systemStatus === "BLOCKED"
              : item.reviewState === "APPROVED";

    return passesChanged && passesStatus;
  });

  useEffect(() => {
    if (!selectedItem) {
      return;
    }

    const selectedStillVisible = visibleItems.some((item) => item.id === selectedItem.id);
    if (!selectedStillVisible) {
      setSelectedIndex(null);
      setLensOpen(false);
    }
  }, [selectedItem, visibleItems]);

  if (data.items.length === 0) {
    return (
      <div className="page-stack">
        <section className="empty-panel">
          <strong>No packet rows available.</strong>
          <span>Import one file to start review.</span>
        </section>
      </div>
    );
  }

  const activeCitation = selectedItem?.citations[selectedCitationIndex] ?? selectedItem?.citations[0] ?? null;
  const answerFocus = activeCitation ? getAnswerFocusData(draftAnswer, activeCitation.quotedSnippet) : { snippet: "", score: 0 };
  const answerFocusSnippet = answerFocus.snippet;
  const focusConfidenceLabel = getConfidenceLabel(answerFocus.score);
  const blockedCount = data.items.filter((item) => item.systemStatus === "BLOCKED").length;
  const packetReadinessLabel =
    blockedCount > 0
      ? `${blockedCount} blocked`
      : summary.needsReview > 0
        ? `${summary.needsReview} needs review`
        : data.questionnaire.approvedCount >= data.questionnaire.totalCount
          ? "Export-ready"
          : "Review active";
  const autofillProgress = data.questionnaire.totalCount === 0 ? 0 : Math.min(100, Math.round((data.questionnaire.autofillCursor / data.questionnaire.totalCount) * 100));
  const progressLabel =
    mutationKind === "autofill"
      ? `Grounding next batch from row ${Math.min(data.questionnaire.autofillCursor + 1, data.questionnaire.totalCount)}`
      : `${data.questionnaire.autofillCursor}/${data.questionnaire.totalCount} rows grounded`;
  const autofillLabel =
    mutationKind === "autofill"
      ? "Grounding in progress"
      : data.questionnaire.autofillStatus === "COMPLETED"
        ? "Autofill ready"
        : data.questionnaire.autofillStatus === "RUNNING"
          ? "Grounding in progress"
          : "Ready to ground";

  return (
    <div className="page-stack workspace-ops-page workspace-ops-page-review review-workbench-shell">
      <section className="review-workbench-head review-workbench-head-quietmode">
        <div>
          <span className="eyebrow">Review</span>
          <h1>Review</h1>
          <p>Select a row to verify.</p>
        </div>
      </section>

      {message ? <p className="inline-message">{message}</p> : null}

      <section className="review-command-deck review-packet-band">
        <div className="review-command-deck-summary">
            <div className="review-packet-dossier">
              <div className="review-packet-dossier-copy">
                <span className="review-workbench-meta-line">Active packet</span>
                <strong>{data.questionnaire.name}</strong>
                <p>Scope: {props.scopeLabel}</p>
              </div>
            <div className={clsx("review-packet-dossier-state", metricPulse && "review-packet-dossier-state-live")}>
              <small>{autofillLabel}</small>
              <strong>{packetReadinessLabel}</strong>
            </div>
          </div>

          <div className="review-command-deck-actions">
            <button className="button-ghost review-command-deck-button" disabled={isMutating} onClick={() => void runAutofillBatch()} type="button">
              {isMutating ? "Grounding..." : "Ground"}
            </button>
            <button
              className={clsx("button-ghost review-command-deck-button", questionFieldMode === "changed" && "review-command-deck-button-active")}
              disabled={recentlyChangedRowIds.length === 0}
              onClick={() => setQuestionFieldMode((current) => (current === "changed" ? "all" : "changed"))}
              type="button"
            >
              {recentlyChangedRowIds.length > 0 ? `Changed (${recentlyChangedRowIds.length})` : "Changed"}
            </button>
            <button className="button-ghost review-command-deck-button" onClick={exportCsv} type="button">
              Export CSV
            </button>
          </div>
        </div>

        <div className="review-command-deck-progress review-packet-progress" aria-label="Autofill progress">
          <div className="review-command-deck-progress-copy">
            <strong>{progressLabel}</strong>
            <small>
              {data.questionnaire.approvedCount} approved · {summary.needsReview} needs review · {blockedCount} blocked
            </small>
          </div>
          <div
            className={clsx("review-command-deck-progress-rail", mutationKind === "autofill" && "review-command-deck-progress-rail-running")}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={autofillProgress}
          >
            <span style={{ width: `${autofillProgress}%` }} />
          </div>
        </div>

        {props.questionnaireOptions && props.questionnaireOptions.length > 1 ? (
          <div className="review-workbench-packets-list" aria-label="Packet selector">
            {props.questionnaireOptions.map((option) => (
              <Link
                className={clsx("review-workbench-packet-pill", option.id === data.questionnaire.id && "review-workbench-packet-pill-active")}
                href={`/w/${props.workspaceSlug}/review?questionnaireId=${encodeURIComponent(option.id)}`}
                key={option.id}
                prefetch={false}
              >
                <span>{option.name}</span>
                <small>
                  {option.approvedCount}/{option.totalCount}
                </small>
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <section className="review-question-field">
        <div className="review-question-field-head">
          <div>
            <span className="panel-kicker">Questions</span>
            <strong>{visibleItems.length} row{visibleItems.length === 1 ? "" : "s"}</strong>
          </div>
          <div className="review-question-field-hints">
            <span>Shift + J / K</span>
          </div>
        </div>

        <div className="review-question-filter-rail" aria-label="Question status filters">
          {(
            [
              ["all", "All"],
              ["ready", "Ready"],
              ["needs-review", "Needs review"],
              ["blocked", "Blocked"],
              ["approved", "Approved"]
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              className={clsx("review-question-filter-chip", statusFilter === value && "review-question-filter-chip-active")}
              onClick={() => setStatusFilter(value)}
              type="button"
            >
              <span>{label}</span>
              <small>{statusCounts[value]}</small>
            </button>
          ))}
        </div>

        <div className="review-question-field-list" role="list" aria-label="Question field">
          {visibleItems.map((item) => {
            const itemIndex = data.items.findIndex((candidate) => candidate.id === item.id);
            const itemIsSelected = selectedIndex === itemIndex;
            const itemActiveCitation = itemIsSelected ? activeCitation : null;
            const itemAnswerFocusSnippet = itemIsSelected ? answerFocusSnippet : "";
            const itemFocusConfidenceLabel = itemIsSelected ? focusConfidenceLabel : "";
            const stateLabel = getPrimaryStatusLabel(item);
            const showBlockedState = item.systemStatus === "BLOCKED";
            const showPartialState = item.systemStatus === "PARTIAL" && item.reviewState === "UNREVIEWED";
            const showReadyState = item.systemStatus === "READY" && item.reviewState === "UNREVIEWED";
            const blockedReasonLabel = getNotFoundReasonLabel(item.notFoundReason);
            const itemIsApproved = item.reviewState === "APPROVED";
            const itemNeedsReview = item.reviewState === "NEEDS_REVIEW";
            const itemIsPending = item.systemStatus === "PENDING";
            const itemIsBlocked = item.systemStatus === "BLOCKED";
            const itemIsPartial = item.systemStatus === "PARTIAL" && item.reviewState === "UNREVIEWED";
            const itemCanApprove = isReadyForApproval({
              systemStatus: item.systemStatus,
              reviewState: item.reviewState,
              citations: item.citations,
              answer: draftAnswer
            });
            const claimLock = splitClaimLock(draftAnswer || item.answer || "", itemAnswerFocusSnippet || activeCitation?.quotedSnippet || "");
            const supportHeadline = itemIsBlocked
              ? "Evidence gap"
              : itemIsPending
                ? "Grounding pending"
                : item.citations[0]
                  ? `${item.citations.length} citation${item.citations.length === 1 ? "" : "s"} ready`
                  : "No supporting evidence yet";
            const supportMeta = itemIsBlocked
              ? blockedReasonLabel
              : itemIsPending
                ? "Run autofill to ground this row before review."
                : itemIsPartial
                  ? "Support is partial"
                  : item.citations.length > 0
                    ? "Source attached"
                    : "Waiting on source";

            return (
              <div
                className="review-question-row-stack"
                key={item.id}
              >
                <button
                  className={clsx(
                    "review-question-row",
                    selectedIndex === itemIndex && "review-question-row-active",
                    transitionRowId === item.id && transitionMode === "advance" && "review-question-row-progress-out",
                    transitionRowId === item.id && transitionMode === "divert" && "review-question-row-divert-out",
                    incomingRowId === item.id && "review-question-row-incoming",
                    recentlyChangedRowIds.includes(item.id) && "review-question-row-changed"
                  )}
                  onClick={() => selectRow(itemIndex)}
                  ref={(node) => {
                    rowRefs.current[item.id] = node;
                  }}
                  type="button"
                >
                  <div className="review-question-row-index">
                    <strong>{item.rowIndex + 1}</strong>
                  </div>
                  <div className="review-question-row-copy">
                    <p>{truncate(item.text, 112)}</p>
                    <div className="review-question-row-rail">
                      <span
                        className={clsx(
                          "review-question-row-state",
                          item.reviewState === "APPROVED" && "review-question-row-state-approved",
                          item.reviewState === "NEEDS_REVIEW" && "review-question-row-state-flagged",
                          showBlockedState && "review-question-row-state-blocked",
                          (showReadyState || showPartialState) && "review-question-row-state-ready"
                        )}
                      >
                        {stateLabel}
                      </span>
                      <span className="review-question-row-rail-item review-question-row-rail-item-muted">
                        {item.citations.length > 0
                          ? `${item.citations.length} proof link${item.citations.length === 1 ? "" : "s"}`
                          : item.systemStatus === "PENDING"
                            ? "Awaiting autofill"
                            : "No proof yet"}
                      </span>
                      {recentlyChangedRowIds.includes(item.id) ? <span className="review-question-row-rail-item review-question-row-rail-item-changed">Changed</span> : null}
                    </div>
                  </div>
                </button>

                {itemIsSelected ? (
                <section
                  className={clsx(
                    "review-workbench-stage review-workbench-stage-inline",
                    lensOpen && "review-workbench-stage-focus-live",
                    transitionRowId === item.id && transitionMode === "advance" && "review-workbench-stage-progress-out",
                    transitionRowId === item.id && transitionMode === "divert" && "review-workbench-stage-divert-out"
                  )}
                  data-motion={surfaceMotion ?? undefined}
                >
                  <div className="review-workbench-stage-glow" aria-hidden="true" />

                  <div className="review-workbench-stage-head review-stage-part review-stage-part-head">
                    <div className="review-workbench-stage-meta">
                      <div className="review-workbench-stage-rowline">
                        <strong>Q {item.rowIndex + 1}</strong>
                        <span>{stateLabel}</span>
                      </div>
                    </div>
                    {item.reuseMatchType ? (
                      <div className="status-row">
                        <StatusChip tone="success">Reuse {item.reuseMatchType}</StatusChip>
                      </div>
                    ) : null}
                  </div>

                  <div className="review-workbench-stage-question review-stage-part review-stage-part-question">
                    <p>{item.text}</p>
                  </div>

                  <div className={clsx("review-workbench-plane review-stage-part review-stage-part-plane", lensOpen && "review-workbench-plane-focus-open")}>
                    {itemIsBlocked ? (
                      <div className="review-workbench-blocked-stage">
                        <div className="review-workbench-blocked-stage-head">
                          <label className="field-label">Evidence gap</label>
                          <StatusChip tone="warning">Blocked</StatusChip>
                        </div>
                        <p>{blockedReasonLabel}</p>
                        <small>
                          This row does not have enough in-scope evidence to generate a grounded draft yet.
                        </small>
                      </div>
                    ) : itemIsPending ? (
                      <div className="review-workbench-blocked-stage review-workbench-blocked-stage-pending">
                        <div className="review-workbench-blocked-stage-head">
                          <label className="field-label">Awaiting grounding</label>
                          <StatusChip tone="neutral">Pending</StatusChip>
                        </div>
                        <p>This row has not been grounded yet.</p>
                        <small>Run autofill before opening this row for answer review.</small>
                      </div>
                    ) : itemIsApproved ? (
                      <div className="review-workbench-answer-stage review-workbench-answer-stage-approved">
                        <div className="review-workbench-answer-stage-head">
                          <label className="field-label">Approved answer</label>
                          {item.answer ? <span className="review-workbench-answer-count">{Math.max(1, item.answer.trim().split(/\s+/).length)} words</span> : null}
                        </div>
                        <div className="review-workbench-approved-answer">
                          <p>{draftAnswer || item.answer || "No approved answer saved."}</p>
                        </div>
                        {lensOpen && itemActiveCitation ? (
                          <div className="review-workbench-claim-lock" key={`${item.id}-${itemActiveCitation.chunkId}`}>
                            <div className="review-workbench-claim-lock-scan" aria-hidden="true" />
                            <div className="review-workbench-claim-lock-answer">
                              <span className="review-workbench-claim-lock-kicker">Approved proof</span>
                              <p>
                                {claimLock.before ? <span>{claimLock.before} </span> : null}
                                <span className="review-workbench-claim-lock-claim">{claimLock.claim || "No linked claim found yet."}</span>
                                {claimLock.after ? <span> {claimLock.after}</span> : null}
                              </p>
                            </div>

                            <div className="review-workbench-claim-lock-connector" aria-hidden="true">
                              <span />
                            </div>

                            <div className="review-workbench-claim-lock-artifact">
                              <div className="review-workbench-claim-lock-artifact-head">
                                <span className="review-workbench-proof-artifact-chip">{itemActiveCitation.docName}</span>
                                <small>{itemFocusConfidenceLabel}</small>
                              </div>
                              <p>{itemActiveCitation.quotedSnippet}</p>
                              <div className="review-workbench-claim-lock-artifact-meta">
                                <span>Chunk {itemActiveCitation.chunkId.slice(0, 8)}</span>
                                <span>{answerFocus.score} keyword match{answerFocus.score === 1 ? "" : "es"}</span>
                              </div>
                              {item.citations.length > 1 ? (
                                <div className="review-workbench-proof-switcher" aria-label="Citation switcher">
                                  {item.citations.map((citation, index) => (
                                    <button
                                      className={clsx(
                                        "review-workbench-proof-switcher-button",
                                        index === selectedCitationIndex && "review-workbench-proof-switcher-button-active"
                                      )}
                                      key={`${citation.chunkId}-${citation.docName}`}
                                      onClick={() => setSelectedCitationIndex(index)}
                                      type="button"
                                    >
                                      <span>{citation.docName}</span>
                                      <small>{index + 1}</small>
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                        <div className="review-workbench-support-inline">
                          <div className="review-workbench-support-inline-copy">
                            <strong>{supportHeadline}</strong>
                            <span>{supportMeta}</span>
                          </div>
                          <button
                            className="button-ghost review-workbench-lens-trigger"
                            disabled={!item.citations[0]}
                            onClick={() => setLensOpen((current) => !current)}
                            type="button"
                          >
                            {lensOpen ? "Hide proof" : "Proof"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={clsx("review-workbench-answer-stage", lensOpen && "review-workbench-answer-stage-active")}>
                        <div className="review-workbench-answer-stage-head">
                          <label className="field-label" htmlFor="answer-editor">
                            {itemNeedsReview ? "Review answer" : itemIsPartial ? "Partial answer" : "Draft answer"}
                          </label>
                          {item.answer ? <span className="review-workbench-answer-count">{Math.max(1, item.answer.trim().split(/\s+/).length)} words</span> : null}
                        </div>
                        <textarea
                          id="answer-editor"
                          onChange={(event) => setDraftAnswer(event.target.value)}
                          placeholder={
                            item.systemStatus === "PARTIAL"
                                ? "Complete the partial grounded answer for this row."
                                : itemNeedsReview
                                  ? "Resolve the answer and confirm the supporting proof."
                              : "Draft the response for this row."
                          }
                          ref={answerEditorRef}
                          rows={2}
                          value={draftAnswer}
                        />
                        {lensOpen && itemActiveCitation ? (
                          <div className="review-workbench-claim-lock" key={`${item.id}-${itemActiveCitation.chunkId}`}>
                            <div className="review-workbench-claim-lock-scan" aria-hidden="true" />
                            <div className="review-workbench-claim-lock-answer">
                              <span className="review-workbench-claim-lock-kicker">Claim lock</span>
                              <p>
                                {claimLock.before ? <span>{claimLock.before} </span> : null}
                                <span className="review-workbench-claim-lock-claim">{claimLock.claim || "No linked claim found yet."}</span>
                                {claimLock.after ? <span> {claimLock.after}</span> : null}
                              </p>
                            </div>

                            <div className="review-workbench-claim-lock-connector" aria-hidden="true">
                              <span />
                            </div>

                            <div className="review-workbench-claim-lock-artifact">
                              <div className="review-workbench-claim-lock-artifact-head">
                                <span className="review-workbench-proof-artifact-chip">{itemActiveCitation.docName}</span>
                                <small>{itemFocusConfidenceLabel}</small>
                              </div>
                              <p>{itemActiveCitation.quotedSnippet}</p>
                              <div className="review-workbench-claim-lock-artifact-meta">
                                <span>Chunk {itemActiveCitation.chunkId.slice(0, 8)}</span>
                                <span>{answerFocus.score} keyword match{answerFocus.score === 1 ? "" : "es"}</span>
                              </div>
                              {item.citations.length > 1 ? (
                                <div className="review-workbench-proof-switcher" aria-label="Citation switcher">
                                  {item.citations.map((citation, index) => (
                                    <button
                                      className={clsx(
                                        "review-workbench-proof-switcher-button",
                                        index === selectedCitationIndex && "review-workbench-proof-switcher-button-active"
                                      )}
                                      key={`${citation.chunkId}-${citation.docName}`}
                                      onClick={() => setSelectedCitationIndex(index)}
                                      type="button"
                                    >
                                      <span>{citation.docName}</span>
                                      <small>{index + 1}</small>
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                        <div className="review-workbench-support-inline">
                          <div className="review-workbench-support-inline-copy">
                            <strong>{supportHeadline}</strong>
                            <span>
                              {item.citations.length > 0 ? itemFocusConfidenceLabel : itemIsPending ? "Not grounded yet" : supportMeta}{" "}
                              {item.citations.length > 0 ? `· ${supportMeta}` : ""}
                            </span>
                          </div>
                          <button
                            className="button-ghost review-workbench-lens-trigger"
                            disabled={!item.citations[0] || itemIsPending}
                            onClick={() => setLensOpen((current) => !current)}
                            type="button"
                          >
                            {lensOpen ? "Hide proof" : "Proof"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="review-workbench-decision-rail review-workbench-decision-rail-instrument review-stage-part review-stage-part-actions">
                    <div className="review-workbench-surface-actions">
                      {itemIsApproved ? (
                        <button className="button-secondary" disabled={isMutating} onClick={() => void submitReview("NEEDS_REVIEW")} type="button">
                          Reopen
                        </button>
                      ) : itemIsPending ? (
                        <button className="button-secondary" disabled={isMutating} onClick={() => void runAutofillBatch()} type="button">
                          Run autofill
                        </button>
                      ) : (
                        <>
                          <button
                            className="button-primary"
                            disabled={isMutating || !itemCanApprove}
                            onClick={() => void submitReview("APPROVED")}
                            type="button"
                          >
                            Approve &amp; next
                          </button>
                          <button className="button-secondary" disabled={isMutating} onClick={() => void submitReview("NEEDS_REVIEW")} type="button">
                            {itemIsBlocked ? "Follow up" : itemIsPartial ? "Complete later" : "Needs review"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </section>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
