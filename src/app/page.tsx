export const dynamic = "force-dynamic";

import Link from "next/link";
import { getCurrentUserSafe } from "@/lib/auth";
import { LandingProductCanvas } from "@/components/landing-product-canvas";
import { SmoothScrollLink } from "@/components/smooth-scroll-link";

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
            <SmoothScrollLink href="#product">Product</SmoothScrollLink>
            <span aria-disabled="true">Docs</span>
            <span aria-disabled="true">Company</span>
          </nav>

          <Link className="landing-minimal-login" href="/login">
            Log In
          </Link>
        </div>
      </header>

      <section className="landing-minimal-stage">
        <section className="landing-minimal-hero">
          <h1>
            Answer Questionnaires
            <br />
            With Proof
          </h1>
          <p>Grounded drafts. Visible citations. Clean export.</p>
          <div className="landing-minimal-actions">
            <Link className="landing-minimal-primary" href={primaryHref}>
              {primaryLabel}
            </Link>
            <SmoothScrollLink className="landing-minimal-secondary" href="#product">
              See product
            </SmoothScrollLink>
          </div>
        </section>

        <LandingProductCanvas />

        <section className="landing-minimal-values" id="why-attestly">
          <div className="landing-minimal-values-grid">
            <p>Grounded by source</p>
            <p>Approved once, reused safely</p>
            <p>Scoped to one workspace</p>
          </div>
        </section>
      </section>
    </main>
  );
}
