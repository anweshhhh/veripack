export const dynamic = "force-dynamic";

import Link from "next/link";
import { Inter } from "next/font/google";
import { getCurrentUserSafe } from "@/lib/auth";

const landingFont = Inter({
  subsets: ["latin"],
  display: "swap"
});

export default async function LandingPage() {
  const currentUser = await getCurrentUserSafe();
  const primaryHref = currentUser ? `/w/${currentUser.access.workspace.slug}` : "/login";
  const primaryLabel = currentUser ? "Open workspace" : "Start with Google";

  return (
    <main className={`${landingFont.className} landing-minimal`}>
      <header className="landing-minimal-header">
        <div className="landing-minimal-header-inner">
          <Link className="landing-minimal-brand" href="/">
            <span aria-hidden="true" className="landing-minimal-brand-mark">
              A
            </span>
            <span className="landing-minimal-brand-text">Attestly</span>
          </Link>

          <nav aria-label="Marketing" className="landing-minimal-nav">
            <a href="#product">Product</a>
            <a href="#proof-strip">Docs</a>
            <a href="#why-attestly">Company</a>
          </nav>

          <Link className="landing-minimal-login" href="/login">
            Log In
          </Link>
        </div>
      </header>

      <section className="landing-minimal-stage" id="product">
        <div className="landing-minimal-hero">
          <h1>
            Answer Questionnaires
            <br />
            With Proof
          </h1>
          <p>Grounded questionnaire workflows for security teams.</p>
          <div className="landing-minimal-actions">
            <Link className="landing-minimal-primary" href={primaryHref}>
              {primaryLabel}
            </Link>
            <a className="landing-minimal-secondary" href="#why-attestly">
              Why Attestly
            </a>
          </div>
        </div>

        <div className="landing-minimal-proof-strip" id="proof-strip">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="landing-minimal-proof-slot" key={index}>
              [proof / logo]
            </div>
          ))}
        </div>
      </section>

      <section className="landing-minimal-note" id="why-attestly">
        <p>Grounded answers. Approved reuse. Scoped workspaces. Clean export.</p>
      </section>
    </main>
  );
}
