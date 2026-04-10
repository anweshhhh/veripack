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
    title: "Start with trusted source files",
    caption: "Bring in the policies and documents your team already relies on."
  },
  {
    id: "evidence",
    label: "Evidence",
    title: "Make the source set retrievable",
    caption: "VeriPack keeps every draft tied back to the material it came from."
  },
  {
    id: "questionnaire",
    label: "Packet",
    title: "Bring in the buyer packet",
    caption: "Each question lines up against the right evidence without losing context."
  },
  {
    id: "proof",
    label: "Proof",
    title: "Approve with proof attached",
    caption: "Drafts resolve into cited answers that are ready to review and send."
  }
];

function getStageReadout(step: ProductStep["id"]) {
  switch (step) {
    case "documents":
      return ["6 source docs", "2 packets waiting", "vault warming"];
    case "evidence":
      return ["24 chunks live", "scope aligned", "retrieval ready"];
    case "questionnaire":
      return ["17 rows pending", "4 needs review", "grounding active"];
    case "proof":
      return ["1 linked citation", "approval ready", "export lane open"];
    default:
      return [];
  }
}

export function LandingProductCanvas() {
  const stepRefs = useRef<Array<HTMLElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const visibleRatios = new Map<number, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = stepRefs.current.findIndex((step) => step === entry.target);
          if (index >= 0) {
            visibleRatios.set(index, entry.isIntersecting ? entry.intersectionRatio : 0);
          }
        });

        let nextIndex = 0;
        let bestRatio = -1;

        visibleRatios.forEach((ratio, index) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            nextIndex = index;
          }
        });

        setActiveIndex((current) => (current === nextIndex ? current : nextIndex));
      },
      {
        root: null,
        rootMargin: "-18% 0px -18% 0px",
        threshold: [0.2, 0.35, 0.5, 0.65, 0.8]
      }
    );

    stepRefs.current.forEach((step, index) => {
      if (!step) {
        return;
      }

      visibleRatios.set(index, 0);
      observer.observe(step);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const activeStep = PRODUCT_STEPS[activeIndex];
  const stageReadout = getStageReadout(activeStep.id);

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
          <div aria-hidden="true" className="landing-product-rail">
            {PRODUCT_STEPS.map((step, index) => (
              <div
                className={clsx("landing-product-rail-step", index === activeIndex && "landing-product-rail-step-active")}
                key={step.id}
              >
                <span className="landing-product-rail-index">{`0${index + 1}`}</span>
                <span className="landing-product-rail-label">{step.label}</span>
              </div>
            ))}
          </div>

          <div className={clsx("landing-product-stage", `landing-product-stage-${activeStep.id}`)}>
            <div className="landing-product-stage-glow landing-product-stage-glow-a" />
            <div className="landing-product-stage-glow landing-product-stage-glow-b" />
            <div className="landing-product-stage-grid" />

            <div className="landing-product-readout">
              {stageReadout.map((item) => (
                <span className="landing-product-readout-pill" key={item}>
                  {item}
                </span>
              ))}
            </div>

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
              <span className="landing-stage-module-label">Packet</span>

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

            <div className="landing-product-proof-strip" aria-hidden="true">
              <span className="landing-product-proof-strip-label">Live packet</span>
              <div className="landing-product-proof-strip-line" />
              <span className="landing-product-proof-strip-value">{activeStep.label}</span>
            </div>
          </div>

          <div className="landing-product-stage-copy">
            <strong>{activeStep.title}</strong>
            <p className="landing-product-stage-caption">{activeStep.caption}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
