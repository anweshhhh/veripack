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

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % PRODUCT_STEPS.length);
    }, 3600);

    return () => window.clearInterval(intervalId);
  }, []);

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

      <div className={clsx("landing-canvas", `landing-canvas-${activeStep.id}`)}>
        <div className="landing-canvas-stage">
          <div className="landing-canvas-orbit landing-canvas-orbit-a" />
          <div className="landing-canvas-orbit landing-canvas-orbit-b" />

          <div className="canvas-upload-rail">
            <span>Upload</span>
          </div>

          <div className="canvas-doc-stack">
            <div className="canvas-doc canvas-doc-a" />
            <div className="canvas-doc canvas-doc-b" />
            <div className="canvas-doc canvas-doc-c" />
          </div>

          <div className="canvas-node-network">
            <div className="canvas-link canvas-link-a" />
            <div className="canvas-link canvas-link-b" />
            <div className="canvas-link canvas-link-c" />
            <div className="canvas-node canvas-node-a" />
            <div className="canvas-node canvas-node-b" />
            <div className="canvas-node canvas-node-c" />
            <div className="canvas-node canvas-node-d" />
          </div>

          <div className="canvas-questionnaire">
            <div className="canvas-questionnaire-head" />
            <div className="canvas-questionnaire-row canvas-questionnaire-row-a" />
            <div className="canvas-questionnaire-row canvas-questionnaire-row-b" />
            <div className="canvas-questionnaire-row canvas-questionnaire-row-c" />
            <div className="canvas-questionnaire-row canvas-questionnaire-row-d" />
          </div>

          <div className="canvas-answer-surface">
            <div className="canvas-answer-card">
              <div className="canvas-answer-line canvas-answer-line-strong" />
              <div className="canvas-answer-line canvas-answer-line-mid" />
              <div className="canvas-answer-line canvas-answer-line-mid" />
            </div>
            <div className="canvas-proof-card">
              <div className="canvas-proof-chip">1 citation</div>
              <div className="canvas-proof-line canvas-proof-line-strong" />
              <div className="canvas-proof-line canvas-proof-line-mid" />
            </div>
          </div>
        </div>
      </div>

      <p className="landing-product-caption">{activeStep.caption}</p>
    </section>
  );
}
