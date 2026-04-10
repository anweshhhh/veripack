"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import clsx from "clsx";

type WorkspaceHomeNextAction = {
  rowIndex: number;
  totalCount: number;
  questionText: string;
  answerText: string | null;
  citationSource: string | null;
  citationCount: number;
  systemStatus: "PENDING" | "READY" | "PARTIAL" | "BLOCKED";
  reviewState: "UNREVIEWED" | "NEEDS_REVIEW" | "APPROVED";
};

type WorkspaceHomeInsightState = {
  exceptionItems: Array<{
    label: string;
    count: number;
    href: string;
  }>;
  approvalVelocity: {
    series: number[];
    last7Days: number;
    previous7Days: number;
    last30Days: number;
    previous30Days: number;
  };
  answerMix: {
    groundedCount: number;
    reusedCount: number;
    insufficientCount: number;
    totalCount: number;
  };
  quietContext: {
    reusableAnswersCount: number;
    latestExportAge: string | null;
    latestEvidenceRefreshAge: string | null;
  };
};

type ReviewSurfaceProps = {
  latestQuestionnaireName: string;
  latestQuestionnaireApproved: number;
  latestQuestionnaireTotal: number;
  reviewRemaining: number;
  insightState: WorkspaceHomeInsightState;
  nextAction: WorkspaceHomeNextAction | null;
};

type ExportSurfaceProps = {
  latestQuestionnaireName: string;
  latestQuestionnaireApproved: number;
  latestQuestionnaireTotal: number;
  insightState: WorkspaceHomeInsightState;
};

type ExceptionDisplayItem = WorkspaceHomeInsightState["exceptionItems"][number] & {
  phase: "stable" | "entering" | "exiting";
};

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) {
      return false;
    }

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

function useAnimatedCount(target: number, duration = 540) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [displayValue, setDisplayValue] = useState(target);
  const previousValue = useRef(target);

  useEffect(() => {
    if (prefersReducedMotion || previousValue.current === target) {
      previousValue.current = target;
      setDisplayValue(target);
      return;
    }

    const start = performance.now();
    const startValue = previousValue.current;
    let frameId = 0;
    const frame = () => {
      const elapsed = performance.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(startValue + (target - startValue) * eased);
      setDisplayValue(nextValue);

      if (progress < 1) {
        frameId = requestAnimationFrame(frame);
      } else {
        previousValue.current = target;
      }
    };

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [duration, prefersReducedMotion, target]);

  return displayValue;
}

function useSwapText(value: string) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [displayValue, setDisplayValue] = useState(value);
  const [phase, setPhase] = useState<"idle" | "out" | "in">("idle");
  const previousValue = useRef(value);

  useEffect(() => {
    if (previousValue.current === value) {
      return;
    }

    if (prefersReducedMotion) {
      previousValue.current = value;
      setDisplayValue(value);
      setPhase("idle");
      return;
    }

    setPhase("out");
    const swapTimer = window.setTimeout(() => {
      setDisplayValue(value);
      setPhase("in");
    }, 150);
    const settleTimer = window.setTimeout(() => {
      previousValue.current = value;
      setPhase("idle");
    }, 540);

    return () => {
      window.clearTimeout(swapTimer);
      window.clearTimeout(settleTimer);
    };
  }, [prefersReducedMotion, value]);

  return { displayValue, phase };
}

function usePulseOnIncrease(value: number) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isPulsing, setIsPulsing] = useState(false);
  const previousValue = useRef(value);

  useEffect(() => {
    if (prefersReducedMotion) {
      previousValue.current = value;
      setIsPulsing(false);
      return;
    }

    if (value > previousValue.current) {
      setIsPulsing(false);
      const rafId = requestAnimationFrame(() => setIsPulsing(true));
      const settleTimer = window.setTimeout(() => setIsPulsing(false), 760);
      previousValue.current = value;

      return () => {
        cancelAnimationFrame(rafId);
        window.clearTimeout(settleTimer);
      };
    }

    previousValue.current = value;
    return undefined;
  }, [prefersReducedMotion, value]);

  return isPulsing;
}

function useTransientFlag<T>(value: T) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isActive, setIsActive] = useState(false);
  const previousValue = useRef(value);

  useEffect(() => {
    if (prefersReducedMotion || previousValue.current === value) {
      previousValue.current = value;
      setIsActive(false);
      return;
    }

    setIsActive(true);
    previousValue.current = value;
    const timer = window.setTimeout(() => setIsActive(false), 520);

    return () => window.clearTimeout(timer);
  }, [prefersReducedMotion, value]);

  return isActive;
}

function useMorphingBars(series: number[]) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [displaySeries, setDisplaySeries] = useState(prefersReducedMotion ? series : series.map(() => 0));

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplaySeries(series);
      return;
    }

    const nextSeries = [...series];
    const rafId = requestAnimationFrame(() => setDisplaySeries(nextSeries));

    return () => cancelAnimationFrame(rafId);
  }, [prefersReducedMotion, series]);

  return displaySeries;
}

function useMorphingMix(mix: WorkspaceHomeInsightState["answerMix"]) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [displayMix, setDisplayMix] = useState(
    prefersReducedMotion
      ? mix
      : {
          groundedCount: 0,
          reusedCount: 0,
          insufficientCount: 0,
          totalCount: mix.totalCount
        }
  );

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayMix(mix);
      return;
    }

    const rafId = requestAnimationFrame(() => setDisplayMix(mix));
    return () => cancelAnimationFrame(rafId);
  }, [mix, prefersReducedMotion]);

  return displayMix;
}

function AnimatedTextBlock(props: {
  as?: "h2" | "p";
  value: string;
  className?: string;
  blur?: boolean;
}) {
  const { displayValue, phase } = useSwapText(props.value);
  const Component = props.as ?? "p";

  return (
    <Component
      className={clsx(
        props.className,
        "workspace-home-live-text",
        phase !== "idle" && `workspace-home-live-text-${phase}`,
        props.blur && "workspace-home-live-text-soft"
      )}
    >
      {displayValue}
    </Component>
  );
}

function ExceptionsStrip(props: { items: WorkspaceHomeInsightState["exceptionItems"] }) {
  const [displayItems, setDisplayItems] = useState<ExceptionDisplayItem[]>(
    props.items.map((item) => ({ ...item, phase: "stable" }))
  );
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setDisplayItems(props.items.map((item) => ({ ...item, phase: "stable" })));
      return;
    }

    setDisplayItems((previousItems) => {
      const previousMap = new Map(previousItems.map((item) => [item.label, item]));
      const nextLabels = new Set(props.items.map((item) => item.label));
      const enteringItems = props.items.map((item) => {
        const previousItem = previousMap.get(item.label);
        return {
          ...item,
          phase: previousItem ? "stable" : "entering"
        } as ExceptionDisplayItem;
      });
      const exitingItems = previousItems
        .filter((item) => !nextLabels.has(item.label))
        .map((item) => ({ ...item, phase: "exiting" as const }));

      return [...enteringItems, ...exitingItems];
    });
  }, [props.items]);

  useEffect(() => {
    const enterTimer = window.setTimeout(() => {
      setDisplayItems((previousItems) =>
        previousItems.map((item) => (item.phase === "entering" ? { ...item, phase: "stable" } : item))
      );
    }, 240);
    const exitTimer = window.setTimeout(() => {
      setDisplayItems((previousItems) => previousItems.filter((item) => item.phase !== "exiting"));
    }, 320);

    return () => {
      window.clearTimeout(enterTimer);
      window.clearTimeout(exitTimer);
    };
  }, [displayItems.length]);

  if (displayItems.length === 0) {
    return null;
  }

  return (
    <section className="workspace-home-exceptions workspace-home-enter workspace-home-enter-exceptions" aria-label="Needs attention">
      {displayItems.map((item, index) => (
        <Link
          className={clsx(
            "workspace-home-exception-item",
            item.phase === "entering" && "workspace-home-exception-item-entering",
            item.phase === "exiting" && "workspace-home-exception-item-exiting"
          )}
          href={item.href}
          key={item.label}
          style={{ "--workspace-exception-delay": `${300 + index * 90}ms` } as CSSProperties}
        >
          <span>{item.label}</span>
          <strong>
            <AnimatedNumber value={item.count} />
          </strong>
        </Link>
      ))}
    </section>
  );
}

function AnimatedNumber(props: { value: number }) {
  const displayValue = useAnimatedCount(props.value);
  return <>{displayValue}</>;
}

function InsightModules(props: {
  insightState: WorkspaceHomeInsightState;
  mode: "review" | "export";
}) {
  const displaySeries = useMorphingBars(props.insightState.approvalVelocity.series);
  const displayMix = useMorphingMix(props.insightState.answerMix);
  const approvalDelta7 = props.insightState.approvalVelocity.last7Days - props.insightState.approvalVelocity.previous7Days;
  const approvalDelta30 = props.insightState.approvalVelocity.last30Days - props.insightState.approvalVelocity.previous30Days;
  const mixTotal = Math.max(displayMix.totalCount, 1);

  return (
    <section className="workspace-home-insights workspace-home-enter workspace-home-enter-insights" aria-label="Workspace insights">
      <article className="workspace-home-insight-card">
        <header className="workspace-home-insight-head">
          <span>Approval velocity</span>
          <strong>
            <AnimatedNumber
              value={props.mode === "review" ? props.insightState.approvalVelocity.last7Days : props.insightState.approvalVelocity.last30Days}
            />{" "}
            in {props.mode === "review" ? "7d" : "30d"}
          </strong>
        </header>

        <div className="workspace-home-insight-bars" aria-hidden="true">
          {displaySeries.map((value, index, series) => {
            const max = Math.max(...series, 1);
            const height = `${Math.max(18, (value / max) * 72)}px`;
            return <span key={`${index}-${props.mode}`} style={{ height }} />;
          })}
        </div>

        <footer className="workspace-home-insight-foot">
          {props.mode === "review" ? (
            <>
              <span>
                {approvalDelta7 >= 0 ? "+" : ""}
                <AnimatedNumber value={Math.abs(approvalDelta7)} /> vs previous 7d
              </span>
              <span>
                <AnimatedNumber value={props.insightState.approvalVelocity.last30Days} /> in 30d · {approvalDelta30 >= 0 ? "+" : "-"}
                <AnimatedNumber value={Math.abs(approvalDelta30)} />
              </span>
            </>
          ) : (
            <>
              <span>
                <AnimatedNumber value={props.insightState.approvalVelocity.last7Days} /> approved in 7d
              </span>
              <span>
                <AnimatedNumber value={props.insightState.approvalVelocity.previous30Days} /> previous 30d
              </span>
            </>
          )}
        </footer>
      </article>

      <article className="workspace-home-insight-card">
        <header className="workspace-home-insight-head">
          <span>Grounding mix</span>
          <strong>
            <AnimatedNumber
              value={props.mode === "review" ? props.insightState.answerMix.groundedCount : props.insightState.answerMix.reusedCount}
            />{" "}
            {props.mode === "review" ? "grounded" : "reused"}
          </strong>
        </header>

        <div className="workspace-home-mix-stack" aria-hidden="true">
          <span
            className="workspace-home-mix-grounded"
            style={{ width: `${(displayMix.groundedCount / mixTotal) * 100}%` }}
          />
          <span
            className="workspace-home-mix-reused"
            style={{ width: `${(displayMix.reusedCount / mixTotal) * 100}%` }}
          />
          <span
            className="workspace-home-mix-insufficient"
            style={{ width: `${(displayMix.insufficientCount / mixTotal) * 100}%` }}
          />
        </div>

        <footer className="workspace-home-insight-foot">
          {props.mode === "review" ? (
            <>
              <span>
                <AnimatedNumber value={props.insightState.answerMix.reusedCount} /> reused
              </span>
              <span>
                <AnimatedNumber value={props.insightState.answerMix.insufficientCount} /> insufficient
              </span>
            </>
          ) : (
            <>
              <span>
                <AnimatedNumber value={props.insightState.answerMix.groundedCount} /> grounded
              </span>
              <span>
                <AnimatedNumber value={props.insightState.answerMix.insufficientCount} /> insufficient
              </span>
            </>
          )}
        </footer>
      </article>
    </section>
  );
}

function QuietContext(props: { insightState: WorkspaceHomeInsightState }) {
  return (
    <p className="workspace-home-quiet-line workspace-home-enter workspace-home-enter-footer">
      <AnimatedNumber value={props.insightState.quietContext.reusableAnswersCount} /> reusable answers
      {props.insightState.quietContext.latestExportAge ? ` • latest export ${props.insightState.quietContext.latestExportAge}` : ""}
      {props.insightState.quietContext.latestEvidenceRefreshAge
        ? ` • evidence refreshed ${props.insightState.quietContext.latestEvidenceRefreshAge}`
        : ""}
    </p>
  );
}

export function WorkspaceHomeLiveReviewMain(props: ReviewSurfaceProps) {
  const statusIsChanging = useTransientFlag(
    props.nextAction ? `${props.nextAction.reviewState}:${props.nextAction.systemStatus}` : "UNREVIEWED:PENDING"
  );
  const proofPulse = usePulseOnIncrease(props.nextAction?.citationCount ?? 0);
  const proofIsLive = Boolean(props.nextAction?.citationCount && props.nextAction.citationCount > 0);
  const questionText = props.nextAction?.questionText ?? "The next row is ready for review.";
  const answerText =
    props.nextAction?.answerText ??
    (props.nextAction?.systemStatus === "BLOCKED"
      ? "Evidence is missing for this row."
      : "No grounded draft has been written for this row yet.");
  const proofLabel = props.nextAction?.citationSource ?? "Proof not attached yet";
  const proofCountLabel =
    props.nextAction && props.nextAction.citationCount > 0
      ? `${props.nextAction.citationCount} citation${props.nextAction.citationCount === 1 ? "" : "s"} attached`
      : "Awaiting citation";
  const nextActionStatusLabel =
    props.nextAction?.reviewState === "APPROVED"
      ? "Approved"
      : props.nextAction?.reviewState === "NEEDS_REVIEW"
        ? "Needs review"
        : props.nextAction?.systemStatus === "PARTIAL"
          ? "Partial"
          : props.nextAction?.systemStatus === "BLOCKED"
            ? "Blocked"
            : props.nextAction?.systemStatus === "READY"
              ? "Ready"
              : "Pending";

  return (
    <>
      <article className="workspace-stage-main workspace-stage-main-review">
        <header className="workspace-stage-main-head">
          <div className="workspace-stage-main-copy">
            <span className="workspace-stage-sheet-kicker">Latest packet</span>
            <strong>{props.latestQuestionnaireName}</strong>
          </div>

          <div className="workspace-stage-main-meta">
            <span className="workspace-stage-meta-chip">
              Q <AnimatedNumber value={props.nextAction ? props.nextAction.rowIndex + 1 : props.latestQuestionnaireApproved} /> /{" "}
              {props.nextAction?.totalCount ?? props.latestQuestionnaireTotal}
            </span>
            <span className="workspace-stage-meta-chip">
              <AnimatedNumber value={props.reviewRemaining} /> pending
            </span>
            <span
              className={clsx(
                "workspace-stage-meta-chip",
                "workspace-stage-status-pill",
                props.nextAction?.reviewState === "NEEDS_REVIEW" || props.nextAction?.systemStatus === "PARTIAL"
                  ? "workspace-stage-status-pill-review"
                  : "workspace-stage-status-pill-draft",
                statusIsChanging && "workspace-stage-status-pill-changing"
              )}
            >
              {nextActionStatusLabel}
            </span>
          </div>
        </header>

        <section className="workspace-stage-review-question">
          <small>Current question</small>
          <AnimatedTextBlock as="h2" value={questionText} />
        </section>

        <section className="workspace-stage-review-answer">
          <small>Grounded draft</small>
          <AnimatedTextBlock as="p" blur value={answerText} />
        </section>

        <footer
          className={clsx(
            "workspace-stage-proof-strip",
            proofIsLive && "workspace-stage-proof-strip-live",
            proofPulse && "workspace-stage-proof-strip-flash"
          )}
        >
          <span>{proofLabel}</span>
          <strong>{proofCountLabel}</strong>
        </footer>
      </article>

    </>
  );
}

export function WorkspaceHomeLiveExportMain(props: ExportSurfaceProps) {
  return (
    <>
      <article className="workspace-stage-main workspace-stage-main-export">
        <header className="workspace-stage-main-head">
          <div className="workspace-stage-main-copy">
            <span className="workspace-stage-sheet-kicker">Latest file</span>
            <strong>{props.latestQuestionnaireName}.csv</strong>
          </div>

          <div className="workspace-stage-main-meta">
            <span className="workspace-stage-meta-chip">
              <AnimatedNumber value={props.latestQuestionnaireApproved} />/{props.latestQuestionnaireTotal} approved
            </span>
            <span className="workspace-stage-meta-chip workspace-stage-meta-chip-settled">Ready now</span>
          </div>
        </header>

        <div className="workspace-stage-sheet-preview workspace-stage-sheet-preview-export" aria-hidden="true">
          <div className="workspace-stage-export-sheet">
            <div className="workspace-stage-export-line workspace-stage-export-line-strong" />
            <div className="workspace-stage-export-line workspace-stage-export-line-mid" />
            <div className="workspace-stage-export-line workspace-stage-export-line-mid" />
            <div className="workspace-stage-export-line workspace-stage-export-line-short" />
          </div>
        </div>

        <footer className="workspace-stage-proof-strip workspace-stage-proof-strip-export">
          <span>Citations attached</span>
          <strong>Approved file ready to export</strong>
        </footer>
      </article>

    </>
  );
}

export function WorkspaceHomeLiveSupport(props: {
  insightState: WorkspaceHomeInsightState;
  mode: "review" | "export";
}) {
  return (
    <>
      <ExceptionsStrip items={props.insightState.exceptionItems} />
      <InsightModules insightState={props.insightState} mode={props.mode} />
      <QuietContext insightState={props.insightState} />
    </>
  );
}
