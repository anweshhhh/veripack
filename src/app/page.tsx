export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { brandArt } from "@/lib/brand-art";

export default async function LandingPage() {
  const currentUser = await getCurrentUser();
  const primaryHref = currentUser ? `/w/${currentUser.access.workspace.slug}` : "/login";
  const primaryLabel = currentUser ? "Open proof canvas" : "Continue with Google";

  return (
    <main className="marketing-page">
      <section className="marketing-hero-section">
        <div className="marketing-hero-copy">
          <span className="eyebrow">Evidence-first answer operations</span>
          <h1>Security answers that feel traced, not guessed.</h1>
          <p>
            Attestly turns source evidence into grounded questionnaire answers, keeps proof beside every draft, and
            promotes only reviewed responses into reusable knowledge.
          </p>
          <div className="marketing-chip-row">
            <span className="marketing-chip">Grounded answering</span>
            <span className="marketing-chip">Citations in view</span>
            <span className="marketing-chip">Approved-answer reuse</span>
            <span className="marketing-chip">{currentUser ? "Workspace live" : "Google sign-in"}</span>
          </div>
          <div className="hero-actions hero-actions-marketing">
            <Link className="button-primary" href={primaryHref}>
              {primaryLabel}
            </Link>
            <Link className="button-secondary button-secondary-dark" href="#workflow">
              See the proof flow
            </Link>
          </div>
        </div>

        <div className="marketing-hero-visual">
          <div className="art-frame art-frame-hero">
            <Image
              alt=""
              aria-hidden="true"
              className="art-image"
              fill
              priority
              sizes="(max-width: 920px) 100vw, 48vw"
              src={brandArt.landingHero}
            />
            <div className="floating-insight-card floating-insight-card-top">
              <span>Proof trail</span>
              <strong>Every drafted answer stays tethered to source evidence.</strong>
            </div>
            <div className="floating-insight-card floating-insight-card-bottom">
              <span>Review loop</span>
              <strong>Approve once, reuse later only when the evidence is still fresh.</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-ribbon">
        <article className="ribbon-card">
          <span>Upload</span>
          <strong>Evidence becomes the operating surface, not an afterthought.</strong>
        </article>
        <article className="ribbon-card">
          <span>Review</span>
          <strong>Writers move through a proof canvas with the cited answer and source side by side.</strong>
        </article>
        <article className="ribbon-card">
          <span>Reuse</span>
          <strong>Only approved answers graduate into the reusable library with evidence snapshots.</strong>
        </article>
      </section>

      <section className="marketing-story-section" id="workflow">
        <div className="story-visual-shell">
          <div className="art-frame art-frame-story">
            <Image
              alt=""
              aria-hidden="true"
              className="art-image"
              fill
              sizes="(max-width: 920px) 100vw, 42vw"
              src={brandArt.landingWorkflow}
            />
          </div>
        </div>

        <div className="story-copy-shell">
          <span className="eyebrow">One proof canvas</span>
          <h2>Three moves. One traceable system.</h2>
          <div className="story-stage-grid">
            <article className="story-stage-card">
              <strong>01. Build the source set</strong>
              <p>Upload only the material you want cited back so the system starts with clean, reviewable evidence.</p>
            </article>
            <article className="story-stage-card">
              <strong>02. Draft with proof visible</strong>
              <p>Autofill happens in batches, citations stay adjacent, and weak rows are made obvious instead of hidden.</p>
            </article>
            <article className="story-stage-card">
              <strong>03. Approve into memory</strong>
              <p>Reviewed answers become reusable assets only when their evidence lineage still holds up.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="marketing-proof-section">
        <article className="feature-art-panel feature-art-panel-reuse">
          <div className="feature-art-copy">
            <span className="eyebrow">Approved reuse</span>
            <h2>Attestly remembers the answers you actually trust.</h2>
            <p>
              Reuse is not a blind snippet library. Approved answers keep their linked evidence fingerprints so stale
              proof can be caught before it spreads.
            </p>
          </div>
          <div className="feature-art-visual">
            <Image
              alt=""
              aria-hidden="true"
              className="feature-art-image"
              fill
              sizes="(max-width: 920px) 100vw, 32vw"
              src={brandArt.reuseMotif}
            />
          </div>
        </article>

        <article className="feature-art-panel feature-art-panel-export">
          <div className="feature-art-visual">
            <Image
              alt=""
              aria-hidden="true"
              className="feature-art-image"
              fill
              sizes="(max-width: 920px) 100vw, 28vw"
              src={brandArt.exportComplete}
            />
          </div>
          <div className="feature-art-copy">
            <span className="eyebrow">Clean finish</span>
            <h2>Export back into the buyer file without losing context.</h2>
            <p>
              Rows keep their original structure while Attestly appends answer, citations, and review status for a handoff
              that still feels human.
            </p>
          </div>
        </article>

        <article className="proof-principles-panel">
          <span className="eyebrow">V1 principles, rebuilt UI</span>
          <div className="principles-grid">
            <div>
              <strong>Grounded answers</strong>
              <p>No supported answer ships without a visible citation path.</p>
            </div>
            <div>
              <strong>RBAC and isolation</strong>
              <p>Every workspace keeps its own documents, questionnaires, exports, and answer memory.</p>
            </div>
            <div>
              <strong>Questionnaire-first speed</strong>
              <p>The product is narrowed to the flow teams actually need to reach a first export fast.</p>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
