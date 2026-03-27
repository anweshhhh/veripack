export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { brandArt } from "@/lib/brand-art";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

type LoginPageProps = {
  searchParams?: {
    callbackUrl?: string | string[];
    error?: string | string[];
  };
};

function getQueryValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (Array.isArray(value)) {
    const firstValue = value.find((entry) => entry.trim());
    return firstValue ?? null;
  }

  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect(`/w/${currentUser.access.workspace.slug}`);
  }

  const callbackUrl = getQueryValue(searchParams?.callbackUrl) ?? "/";
  const error = getQueryValue(searchParams?.error);

  return (
    <main className="auth-page">
      <section className="auth-stage">
        <div className="auth-visual-shell">
          <div className="art-frame art-frame-auth">
            <Image
              alt=""
              aria-hidden="true"
              className="art-image"
              fill
              priority
              sizes="(max-width: 920px) 100vw, 46vw"
              src={brandArt.masterStyle}
            />
            <div className="floating-insight-card floating-insight-card-auth">
              <span>Private workspace</span>
              <strong>Verified sign-in opens a review environment built around evidence, not loose chat threads.</strong>
            </div>
          </div>
        </div>

        <div className="auth-card">
          <Link className="auth-back-link" href="/">
            Back to overview
          </Link>
          <span className="eyebrow">Sign in</span>
          <h1>Enter the proof canvas with your real work identity.</h1>
          <p className="auth-note">
            Use a verified Google email. Your first sign-in bootstraps a private workspace with app-owned RBAC and
            workspace isolation already enforced.
          </p>
          <div className="auth-bullet-list">
            <span>Grounded answering with citations</span>
            <span>Approved-answer reuse with stale-proof checks</span>
            <span>Questionnaire-first flow built for fast export</span>
          </div>
          <GoogleSignInButton callbackUrl={callbackUrl} />
          {error ? (
            <p className="auth-error">
              Google sign-in could not start. If this keeps happening after redeploy, recheck the Google callback URI and
              Vercel auth environment variables.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
