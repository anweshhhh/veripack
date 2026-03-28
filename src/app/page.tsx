export const dynamic = "force-dynamic";

import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function LandingPage() {
  const currentUser = await getCurrentUser();
  const primaryHref = currentUser ? `/w/${currentUser.access.workspace.slug}` : "/login";
  const primaryLabel = currentUser ? "Open workspace" : "Start with Google";

  return (
    <main className="site-shell site-shell-landing">
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

      <section className="landing-stage">
        <div className="landing-grid">
          <div className="landing-copy">
            <span className="eyebrow">Minimal questionnaire core</span>
            <h1>Security questionnaires with less noise and more proof.</h1>
            <p>
              Attestly keeps the flow simple: upload trusted evidence, import one buyer file, review grounded drafts,
              and export with confidence.
            </p>
            <div className="hero-actions">
              <Link className="button-primary" href={primaryHref}>
                {primaryLabel}
              </Link>
              <a className="button-secondary" href="#how-it-works">
                See product flow
              </a>
            </div>

            <div className="landing-signal-row">
              <span className="signal-pill">Grounded answers</span>
              <span className="signal-pill">Approved reuse</span>
              <span className="signal-pill">Scoped workspaces</span>
            </div>
          </div>

          <div className="landing-scene">
            <div className="scene-shell">
              <div className="scene-topbar">
                <span className="scene-kicker">Questionnaire in review</span>
                <span className="scene-counter">2 of 5 approved</span>
              </div>

              <div className="scene-focus-card">
                <div className="scene-focus-copy">
                  <span className="scene-label">Current row</span>
                  <strong>Do you perform periodic access reviews?</strong>
                  <p>Yes. Quarterly access reviews are tracked and remediation is followed through to completion.</p>
                </div>

                <div className="scene-proof-card">
                  <span className="scene-label">Evidence</span>
                  <strong>Security Policy 2026.md</strong>
                  <p>Access reviews are performed quarterly for production systems and tracked by the security team.</p>
                </div>
              </div>

              <div className="scene-grid">
                <article className="scene-mini-card scene-mini-card-positive">
                  <span>Evidence</span>
                  <strong>3 files ready</strong>
                  <small>Autofill is grounded in approved source material.</small>
                </article>
                <article className="scene-mini-card">
                  <span>Review</span>
                  <strong>One clear next action</strong>
                  <small>Approve or mark for review without losing context.</small>
                </article>
                <article className="scene-mini-card">
                  <span>Export</span>
                  <strong>Original CSV preserved</strong>
                  <small>Attestly adds answers, citations, and status cleanly.</small>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-story" id="how-it-works">
        <article className="story-card">
          <span className="step-number">01</span>
          <strong>Add the source of truth</strong>
          <p>Start with policies, procedures, and documents you actually trust.</p>
        </article>
        <article className="story-card story-card-highlight">
          <span className="step-number">02</span>
          <strong>Review the grounded draft</strong>
          <p>Move row by row with citations close by and a clear primary action.</p>
        </article>
        <article className="story-card">
          <span className="step-number">03</span>
          <strong>Export the finished file</strong>
          <p>Preserve the original structure and append Attestly output cleanly.</p>
        </article>
      </section>

      <section className="landing-foundation" id="why-attestly">
        <div className="foundation-main">
          <span className="eyebrow">What stays true</span>
          <h2>Keep the V1 rigor. Lose the V1 friction.</h2>
          <p>
            The engine principles stay intact: grounded answers, citations, approved-answer reuse, RBAC, and workspace
            isolation.
          </p>
        </div>

        <div className="foundation-grid">
          <article className="foundation-card">
            <strong>Grounded answers</strong>
            <p>Supported answers stay tied to evidence instead of floating as AI output.</p>
          </article>
          <article className="foundation-card">
            <strong>Approved reuse</strong>
            <p>Only reviewed answers become reusable memory for future questionnaires.</p>
          </article>
          <article className="foundation-card">
            <strong>Scoped workspaces</strong>
            <p>RBAC and org isolation remain part of the product foundation from day one.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
