export const dynamic = "force-dynamic";

import Link from "next/link";
import { getCurrentUserSafe } from "@/lib/auth";
import { LandingProductCanvas } from "@/components/landing-product-canvas";
import { SmoothScrollLink } from "@/components/smooth-scroll-link";

const FAQS = [
  {
    question: "How is VeriPack different from a generic questionnaire autofill tool?",
    answer:
      "VeriPack is built around linked proof. Draft answers stay tied to source material, so reviewers can approve with evidence instead of trusting opaque generated text."
  },
  {
    question: "Do I need to upload evidence every time a new packet arrives?",
    answer:
      "No. The library is designed as a reusable source vault. Once your evidence is in place, new packets can ground against that same source set and reuse already approved answers where they still fit."
  },
  {
    question: "Can teams still review answers manually?",
    answer:
      "Yes. VeriPack is not trying to remove review. It shortens the path to a reviewable answer, highlights evidence gaps, and keeps the human approval step explicit."
  },
  {
    question: "What happens when there is not enough proof?",
    answer:
      "Rows without enough support are surfaced as evidence gaps instead of fake completed drafts, so the team can follow up, add source material, or reroute those questions intentionally."
  },
  {
    question: "Does VeriPack replace the security team’s judgment?",
    answer:
      "No. It reduces the manual drafting burden, but the approval step stays explicit. Teams still decide what is accurate, what needs follow-up, and what should not be sent."
  },
  {
    question: "Can the same evidence support multiple packets?",
    answer:
      "Yes. The source vault is designed for reuse. Once evidence is ready, new packets can ground against the same material without forcing duplicate uploads every time."
  },
  {
    question: "What if an approved answer becomes stale?",
    answer:
      "VeriPack can surface stale approvals when the underlying source set changes, so teams can revisit only the parts that need attention instead of re-reviewing everything."
  },
  {
    question: "How do blocked rows work?",
    answer:
      "Blocked rows are treated as real evidence gaps, not hidden failures. They stay visible so the team can add source material, follow up with owners, or route them differently."
  },
  {
    question: "Can I export only after review is complete?",
    answer:
      "That’s the intended flow. VeriPack helps teams move from grounded draft to approved packet so exports reflect reviewed, defensible answers rather than partially checked output."
  },
  {
    question: "Is this only for one questionnaire framework?",
    answer:
      "No. VeriPack is built around packets and proof, not a single template. The same workflow can support different buyer questionnaires as long as the source material is in scope."
  }
] as const;

const WHY_VERIPACK = [
  {
    title: "Proof stays attached",
    body: "Every grounded draft keeps a visible source link, so review starts from evidence instead of guesswork.",
    status: "linked proof",
    metric: "1:1 trace"
  },
  {
    title: "Reuse is controlled",
    body: "Approved answers become reusable without turning your workspace into a stale answer dump disconnected from fresh evidence.",
    status: "reuse lane",
    metric: "safe carry"
  },
  {
    title: "Review stays human",
    body: "VeriPack accelerates the work, but approval, follow-up, and evidence gaps stay visible for the team using it.",
    status: "human gate",
    metric: "clear handoff"
  }
] as const;

export default async function LandingPage() {
  const currentUser = await getCurrentUserSafe();
  const primaryHref = currentUser ? `/w/${currentUser.access.workspace.slug}` : "/login";
  const primaryLabel = currentUser ? "Open workspace" : "Start with Google";

  return (
    <main className="landing-minimal">
      <header className="landing-minimal-header">
        <div className="landing-minimal-header-inner">
          <Link className="landing-minimal-brand" href="/">
            <span aria-hidden="true" className="landing-minimal-brand-mark">
              <span />
              <span />
            </span>
            <span className="landing-minimal-brand-text">VeriPack</span>
          </Link>

          <nav aria-label="Marketing" className="landing-minimal-nav">
            <SmoothScrollLink href="#product">Product</SmoothScrollLink>
            <SmoothScrollLink href="#why-veripack">Why VeriPack</SmoothScrollLink>
            <SmoothScrollLink href="#faq">FAQ</SmoothScrollLink>
          </nav>

          <Link className="landing-minimal-login" href="/login">
            Log In
          </Link>
        </div>
      </header>

      <section className="landing-minimal-stage">
        <section className="landing-minimal-hero">
          <h1>
            Answer Security Questionnaires
            <br />
            With Linked Proof
          </h1>
          <p>Upload evidence once. Review grounded drafts. Export with citations.</p>
          <div className="landing-minimal-actions">
            <Link className="landing-minimal-primary" href={primaryHref}>
              {primaryLabel}
            </Link>
          </div>
        </section>

        <LandingProductCanvas />

        <section className="landing-minimal-values" id="why-veripack">
          <span className="landing-minimal-values-kicker">Why VeriPack</span>
          <div className="landing-minimal-values-grid">
            {WHY_VERIPACK.map((item, index) => (
              <article className="landing-minimal-value-card" key={item.title}>
                <div className="landing-minimal-value-head">
                  <span>{item.status}</span>
                  <strong>{item.metric}</strong>
                </div>
                <div className="landing-minimal-value-signal" aria-hidden="true">
                  <span style={{ animationDelay: `${index * 140}ms` }} />
                  <span style={{ animationDelay: `${index * 140 + 120}ms` }} />
                  <span style={{ animationDelay: `${index * 140 + 240}ms` }} />
                </div>
                <div className="landing-minimal-value-copy">
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-minimal-faq" id="faq">
          <div className="landing-minimal-faq-head">
            <span className="landing-minimal-values-kicker">FAQ</span>
            <h2>What teams usually want to know first.</h2>
          </div>
          <div className="landing-minimal-faq-list">
            {FAQS.map((item) => (
              <details className="landing-minimal-faq-item" key={item.question}>
                <summary>
                  <strong>{item.question}</strong>
                  <span className="landing-minimal-faq-toggle" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
