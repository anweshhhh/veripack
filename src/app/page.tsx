export const dynamic = "force-dynamic";

import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function LandingPage() {
  const currentUser = await getCurrentUser();
  const primaryHref = currentUser ? `/w/${currentUser.access.workspace.slug}` : "/login";
  const primaryLabel = currentUser ? "Open workspace" : "Start with Google";

  return (
    <main className="site-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <Link className="brand-link" href="/">
            <span className="brand-mark">A</span>
            <span className="brand-copy">
              <strong>Attestly</strong>
              <span>Evidence-first questionnaires</span>
            </span>
          </Link>
          <nav className="site-nav" aria-label="Marketing">
            <a href="#how-it-works">How it works</a>
            <a href="#why-attestly">Why Attestly</a>
          </nav>
          <div className="site-header-actions">
            <Link className="button-secondary" href="/login">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <span className="eyebrow">Minimal questionnaire core</span>
          <h1>Questionnaire automation that feels calm, clear, and grounded.</h1>
          <p>
            Upload evidence, import one buyer file, review the suggested answers, and export with citations still in
            view.
          </p>
          <div className="hero-actions">
            <Link className="button-primary" href={primaryHref}>
              {primaryLabel}
            </Link>
            <a className="button-secondary" href="#how-it-works">
              See how it works
            </a>
          </div>
        </div>

        <div className="landing-preview">
          <div className="preview-card">
            <div className="preview-card-header">
              <span className="preview-dot preview-dot-active" />
              <span className="preview-label">Current workflow</span>
            </div>
            <div className="preview-step preview-step-done">
              <span>1</span>
              <div>
                <strong>Evidence uploaded</strong>
                <small>Source documents are ready for retrieval.</small>
              </div>
            </div>
            <div className="preview-step preview-step-active">
              <span>2</span>
              <div>
                <strong>Questionnaire in review</strong>
                <small>The next action is obvious and kept in one place.</small>
              </div>
            </div>
            <div className="preview-answer">
              <div className="preview-answer-top">
                <strong>Suggested answer</strong>
                <span className="mini-status">1 citation</span>
              </div>
              <p>Yes. MFA is required for administrative access and systems handling customer data.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-steps" id="how-it-works">
        <article className="simple-card">
          <span className="step-number">01</span>
          <strong>Upload evidence</strong>
          <p>Only the source material you trust should drive autofill.</p>
        </article>
        <article className="simple-card">
          <span className="step-number">02</span>
          <strong>Review answers</strong>
          <p>Each row gets a draft, a status, and proof beside it.</p>
        </article>
        <article className="simple-card">
          <span className="step-number">03</span>
          <strong>Export results</strong>
          <p>Keep the buyer file structure and append Attestly output cleanly.</p>
        </article>
      </section>

      <section className="landing-band" id="why-attestly">
        <div>
          <span className="eyebrow">What stays true</span>
          <h2>V1 principles, much cleaner product.</h2>
        </div>
        <div className="band-grid">
          <div>
            <strong>Grounded answers</strong>
            <p>No supported answer should exist without evidence.</p>
          </div>
          <div>
            <strong>Approved reuse</strong>
            <p>Only reviewed answers become reusable memory.</p>
          </div>
          <div>
            <strong>Scoped workspaces</strong>
            <p>RBAC and org isolation remain part of the foundation.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
