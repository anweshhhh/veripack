"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

type ProductStep = {
  id: "documents" | "evidence" | "questionnaire" | "proof";
  label: string;
  title: string;
  caption: string;
};

const PRODUCT_STEPS: ProductStep[] = [
  {
    id: "documents",
    label: "Documents",
    title: "Start with the source of truth",
    caption: "Upload the security documents you already trust before Attestly drafts anything."
  },
  {
    id: "evidence",
    label: "Evidence",
    title: "Turn documents into retrievable evidence",
    caption: "The source set becomes grounded evidence blocks that stay tied to where they came from."
  },
  {
    id: "questionnaire",
    label: "Questionnaire",
    title: "Bring in the buyer file",
    caption: "A buyer questionnaire enters the same system so each row can pull from the right evidence."
  },
  {
    id: "proof",
    label: "Proof",
    title: "Review answers with proof attached",
    caption: "Drafts resolve into answer cards with citations, ready for approval and clean export."
  }
];

export function LandingProductCanvas() {
  const stepRefs = useRef<Array<HTMLElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const updateActiveStep = () => {
      const viewportAnchor = window.innerHeight * 0.48;
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      stepRefs.current.forEach((step, index) => {
        if (!step) {
          return;
        }

        const rect = step.getBoundingClientRect();
        const stepCenter = rect.top + rect.height / 2;
        const distance = Math.abs(stepCenter - viewportAnchor);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setActiveIndex((current) => (current === closestIndex ? current : closestIndex));
    };

    let frameId = 0;
    let warmupFrame = 0;
    let warmupTimer = 0;

    const handleScroll = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateActiveStep);
    };

    updateActiveStep();
    warmupFrame = window.requestAnimationFrame(updateActiveStep);
    warmupTimer = window.setTimeout(updateActiveStep, 120);

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.cancelAnimationFrame(warmupFrame);
      window.clearTimeout(warmupTimer);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const activeStep = PRODUCT_STEPS[activeIndex];

  const handleStepSelect = (index: number) => {
    setActiveIndex(index);

    stepRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  };

  return (
    <section className="landing-product landing-product-story" id="product">
      <div className="landing-product-head landing-product-head-story">
        <span className="landing-product-kicker">Product</span>
        <h2>From source document to approved answer.</h2>
      </div>

      <div className="landing-product-shell">
        <div className="landing-product-copy">
          {PRODUCT_STEPS.map((step, index) => (
            <article
              className={clsx("landing-product-step-card", index === activeIndex && "landing-product-step-card-active")}
              data-step={step.id}
              id={`product-step-${step.id}`}
              key={step.id}
              ref={(node) => {
                stepRefs.current[index] = node;
              }}
            >
              <span className="landing-product-step-number">{`0${index + 1}`}</span>
              <h3>{step.title}</h3>
              <p>{step.caption}</p>
            </article>
          ))}
        </div>

        <div className="landing-product-stage-shell">
          <div aria-label="Product flow" className="landing-product-rail" role="tablist">
            {PRODUCT_STEPS.map((step, index) => (
              <button
                aria-controls={`product-step-${step.id}`}
                aria-selected={index === activeIndex}
                className={clsx("landing-product-rail-step", index === activeIndex && "landing-product-rail-step-active")}
                key={step.id}
                onClick={() => handleStepSelect(index)}
                role="tab"
                type="button"
              >
                <span className="landing-product-rail-index">{`0${index + 1}`}</span>
                <span className="landing-product-rail-label">{step.label}</span>
              </button>
            ))}
          </div>

          <div className={clsx("landing-product-stage", `landing-product-stage-${activeStep.id}`)}>
            <div className="landing-product-stage-glow landing-product-stage-glow-a" />
            <div className="landing-product-stage-glow landing-product-stage-glow-b" />
            <div className="landing-product-stage-grid" />

            <div className="landing-product-stage-track">
              <div className="landing-product-stage-track-line" />
              <div className="landing-product-stage-track-fill" />
              {PRODUCT_STEPS.map((step, index) => (
                <span
                  className={clsx(
                    "landing-product-stage-track-stop",
                    index < activeIndex && "landing-product-stage-track-stop-complete",
                    index === activeIndex && "landing-product-stage-track-stop-current"
                  )}
                  key={step.id}
                />
              ))}
            </div>

            <div className="landing-stage-module landing-stage-module-source">
              <span className="landing-stage-module-label">Source</span>

              <div className="landing-stage-source-field">
                <div className="landing-stage-upload-signal">
                  <span />
                </div>

                <div className="landing-stage-document landing-stage-document-a" />
                <div className="landing-stage-document landing-stage-document-b" />
                <div className="landing-stage-document landing-stage-document-c" />
              </div>
            </div>

            <div className="landing-stage-connector landing-stage-connector-a" />
            <div className="landing-stage-connector landing-stage-connector-b" />
            <div className="landing-stage-connector landing-stage-connector-c" />

            <div className="landing-stage-module landing-stage-module-evidence">
              <span className="landing-stage-module-label">Evidence</span>

              <div className="landing-stage-evidence-core">
                <div className="landing-stage-evidence-ring landing-stage-evidence-ring-a" />
                <div className="landing-stage-evidence-ring landing-stage-evidence-ring-b" />

                <div className="landing-stage-evidence-link landing-stage-evidence-link-a" />
                <div className="landing-stage-evidence-link landing-stage-evidence-link-b" />
                <div className="landing-stage-evidence-link landing-stage-evidence-link-c" />

                <div className="landing-stage-evidence-node landing-stage-evidence-node-a" />
                <div className="landing-stage-evidence-node landing-stage-evidence-node-b landing-stage-evidence-node-hot" />
                <div className="landing-stage-evidence-node landing-stage-evidence-node-c" />
                <div className="landing-stage-evidence-node landing-stage-evidence-node-d" />
                <div className="landing-stage-evidence-node landing-stage-evidence-node-e landing-stage-evidence-node-hot" />
              </div>
            </div>

            <div className="landing-stage-module landing-stage-module-questionnaire">
              <span className="landing-stage-module-label">Questionnaire</span>

              <div className="landing-stage-questionnaire-field">
                <div className="landing-stage-questionnaire-head" />
                <div className="landing-stage-questionnaire-row landing-stage-questionnaire-row-a" />
                <div className="landing-stage-questionnaire-row landing-stage-questionnaire-row-b landing-stage-questionnaire-row-highlight" />
                <div className="landing-stage-questionnaire-row landing-stage-questionnaire-row-c" />
                <div className="landing-stage-questionnaire-row landing-stage-questionnaire-row-d" />
              </div>
            </div>

            <div className="landing-stage-module landing-stage-module-proof">
              <span className="landing-stage-module-label">Proof</span>

              <div className="landing-stage-proof-field">
                <div className="landing-stage-answer-card">
                  <div className="landing-stage-line landing-stage-line-strong" />
                  <div className="landing-stage-line landing-stage-line-mid" />
                  <div className="landing-stage-line landing-stage-line-short" />
                </div>

                <div className="landing-stage-proof-card">
                  <div className="landing-stage-proof-chip">1 citation</div>
                  <div className="landing-stage-proof-line landing-stage-proof-line-strong" />
                  <div className="landing-stage-proof-line landing-stage-proof-line-mid" />
                </div>
              </div>
            </div>
          </div>

          <p className="landing-product-stage-caption">{activeStep.caption}</p>
        </div>
      </div>
    </section>
  );
}
