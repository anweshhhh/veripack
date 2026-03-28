export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
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
        </div>
      </header>

      <section className="auth-section">
        <div className="auth-panel">
          <span className="eyebrow">Sign in</span>
          <h1>Start with your real work identity.</h1>
          <p>We use Google sign-in to create a private workspace and keep the onboarding simple.</p>
          <GoogleSignInButton callbackUrl={callbackUrl} />
          {error ? (
            <p className="auth-error">
              Google sign-in could not start. Recheck your callback URI and auth environment variables.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
