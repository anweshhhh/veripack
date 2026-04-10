export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserSafe } from "@/lib/auth";
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
  const currentUser = await getCurrentUserSafe();
  if (currentUser) {
    redirect(`/w/${currentUser.access.workspace.slug}`);
  }

  const callbackUrl = getQueryValue(searchParams?.callbackUrl) ?? "/post-login";
  const error = getQueryValue(searchParams?.error);

  return (
    <main className="site-shell site-shell-auth">
      <header className="site-header">
        <div className="site-header-inner">
          <Link className="brand-link" href="/">
            <span aria-hidden="true" className="brand-mark brand-mark-dual">
              <span />
              <span />
            </span>
            <span className="brand-copy">
              <strong>VeriPack</strong>
              <span>Evidence-first proof packets</span>
            </span>
          </Link>
        </div>
      </header>

      <section className="auth-stage">
        <div className="auth-grid">
          <div className="auth-copy">
            <span className="eyebrow">Sign in</span>
            <h1>Start a private workspace in one step.</h1>
            <p>Use Google sign-in and we will drop you directly into the first action instead of a long setup wizard.</p>

            <div className="auth-benefits">
              <article className="auth-benefit">
                <strong>Evidence first</strong>
                <span>Your source documents shape every grounded draft.</span>
              </article>
              <article className="auth-benefit">
                <strong>Private by default</strong>
                <span>Your workspace, roles, and organization boundaries stay intact.</span>
              </article>
              <article className="auth-benefit">
                <strong>Guided from day one</strong>
                <span>The first screen tells you what to do next and what can wait.</span>
              </article>
            </div>
          </div>

          <div className="auth-panel">
            <span className="panel-kicker">Continue</span>
            <h2>Use Google to begin</h2>
            <p>No complex onboarding. Just sign in and start with trusted source material.</p>
            <GoogleSignInButton callbackUrl={callbackUrl} />
            <small className="auth-footnote">A private workspace is created automatically on first sign-in.</small>
            {error ? (
              <p className="auth-error">
                Google sign-in could not start. Recheck your callback URI and auth environment variables.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
