"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";

type ProductStep = {
  id: "documents" | "evidence" | "questionnaire" | "proof";
  label: string;
  caption: string;
};

const PRODUCT_STEPS: ProductStep[] = [
  {
    id: "documents",
    label: "Documents",
    caption: "Upload the source documents you trust."
  },
  {
    id: "evidence",
    label: "Evidence",
    caption: "Attestly turns source material into retrievable evidence."
  },
  {
    id: "questionnaire",
    label: "Questionnaire",
    caption: "Import one buyer file and move through it row by row."
  },
  {
    id: "proof",
    label: "Proof",
    caption: "Review answers with proof attached before export."
  }
];

export function LandingProductCanvas() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % PRODUCT_STEPS.length);
    }, 4200);

    return () => window.clearInterval(intervalId);
  }, [isPaused]);

  const activeStep = PRODUCT_STEPS[activeIndex];

  return (
    <section className="landing-product" id="product">
      <div className="landing-product-head">
        <span className="landing-product-kicker">Product</span>
        <h2>From source document to approved answer.</h2>
      </div>

      <div aria-label="Product workflow steps" className="landing-product-switcher" role="tablist">
        {PRODUCT_STEPS.map((step, index) => (
          <button
            aria-selected={index === activeIndex}
            className={clsx("landing-product-step", index === activeIndex && "landing-product-step-active")}
            key={step.id}
            onClick={() => setActiveIndex(index)}
            role="tab"
            type="button"
          >
            <span>{step.label}</span>
          </button>
        ))}
      </div>

      <div
        className={clsx("landing-canvas", `landing-canvas-${activeStep.id}`)}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="landing-canvas-stage">
          <div className="landing-canvas-sheen" />
          <div className="landing-canvas-grid" />

          <div className="landing-canvas-progress-track" aria-hidden="true">
            <span className="landing-canvas-progress-line" />
            <span className="landing-canvas-progress-line-fill" />

            {PRODUCT_STEPS.map((step, index) => (
              <span
                className={clsx(
                  "landing-canvas-progress-stop",
                  index < activeIndex && "landing-canvas-progress-stop-complete",
                  index === activeIndex && "landing-canvas-progress-stop-current"
                )}
                key={step.id}
              />
            ))}

            <span className="landing-canvas-progress-pulse" />
          </div>

          <div className="canvas-panel canvas-panel-documents">
            <span className="canvas-panel-label">Documents</span>

            <div className="canvas-panel-body canvas-panel-body-documents">
              <div className="canvas-upload-pill">
                <span className="canvas-upload-pill-dot" />
              </div>

              <div className="canvas-doc-card canvas-doc-card-a" />
              <div className="canvas-doc-card canvas-doc-card-b" />
              <div className="canvas-doc-card canvas-doc-card-c" />
            </div>
          </div>

          <div className="canvas-evidence-cluster">
            <span className="canvas-panel-label">Evidence</span>

            <div className="canvas-evidence-core">
              <div className="canvas-evidence-ring canvas-evidence-ring-a" />
              <div className="canvas-evidence-ring canvas-evidence-ring-b" />

              <div className="canvas-evidence-link canvas-evidence-link-a" />
              <div className="canvas-evidence-link canvas-evidence-link-b" />
              <div className="canvas-evidence-link canvas-evidence-link-c" />

              <div className="canvas-evidence-node canvas-evidence-node-a" />
              <div className="canvas-evidence-node canvas-evidence-node-b" />
              <div className="canvas-evidence-node canvas-evidence-node-c" />
              <div className="canvas-evidence-node canvas-evidence-node-d" />
              <div className="canvas-evidence-node canvas-evidence-node-e" />
            </div>
          </div>

          <div className="canvas-panel canvas-panel-questionnaire">
            <span className="canvas-panel-label">Questionnaire</span>

            <div className="canvas-panel-body canvas-panel-body-questionnaire">
              <div className="canvas-questionnaire-head" />
              <div className="canvas-questionnaire-row canvas-questionnaire-row-a" />
              <div className="canvas-questionnaire-row canvas-questionnaire-row-b" />
              <div className="canvas-questionnaire-row canvas-questionnaire-row-c" />
              <div className="canvas-questionnaire-row canvas-questionnaire-row-d" />
            </div>
          </div>

          <div className="canvas-panel canvas-panel-proof">
            <span className="canvas-panel-label">Proof</span>

            <div className="canvas-panel-body canvas-panel-body-proof">
              <div className="canvas-answer-card">
                <div className="canvas-answer-line canvas-answer-line-strong" />
                <div className="canvas-answer-line canvas-answer-line-mid" />
                <div className="canvas-answer-line canvas-answer-line-short" />
              </div>

              <div className="canvas-proof-card">
                <div className="canvas-proof-chip">1 citation</div>
                <div className="canvas-proof-line canvas-proof-line-strong" />
                <div className="canvas-proof-line canvas-proof-line-mid" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="landing-product-caption">{activeStep.caption}</p>
    </section>
  );
}
