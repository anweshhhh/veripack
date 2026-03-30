export const dynamic = "force-dynamic";

import Link from "next/link";
import { getCurrentUserSafe } from "@/lib/auth";
import { LandingProductCanvas } from "@/components/landing-product-canvas";

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
            <span className="landing-minimal-brand-text">Attestly</span>
          </Link>

          <nav aria-label="Marketing" className="landing-minimal-nav">
            <a href="#product">Product</a>
            <span aria-disabled="true">Docs</span>
            <span aria-disabled="true">Company</span>
          </nav>

          <Link className="landing-minimal-login" href="/login">
            Log In
          </Link>
        </div>
      </header>

      <section className="landing-minimal-stage">
        <div className="landing-minimal-hero">
          <h1>
            Answer Questionnaires
            <br />
            With Proof
          </h1>
          <p>Grounded security questionnaire workflows, built to stay calm from upload to export.</p>
          <div className="landing-minimal-actions">
            <Link className="landing-minimal-primary" href={primaryHref}>
              {primaryLabel}
            </Link>
            <a className="landing-minimal-secondary" href="#why-attestly">
              Why Attestly
            </a>
          </div>
        </div>

        <LandingProductCanvas />

        <section className="landing-minimal-values" id="why-attestly">
          <span className="landing-minimal-values-kicker">Why Attestly</span>

          <div className="landing-minimal-values-grid">
            <p>Grounded answers</p>
            <p>Approved reuse</p>
            <p>Scoped workspaces</p>
            <p>Clean export</p>
          </div>
        </section>

        <div className="landing-minimal-proof-strip" id="proof-strip">
          {Array.from({ length: 4 }).map((_, index) => (
            <div aria-hidden="true" className="landing-minimal-proof-slot" key={index}>
              <span className="landing-minimal-proof-mark" />
              <span className="landing-minimal-proof-bar" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
