"use client";

import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { usePathname } from "next/navigation";
import { brandArt } from "@/lib/brand-art";
import { SignOutButton } from "@/components/sign-out-button";

type NavItem = {
  href: string;
  label: string;
  description: string;
};

export function AppShell(props: {
  workspaceName: string;
  workspaceSlug: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const navItems: NavItem[] = [
    { href: `/w/${props.workspaceSlug}`, label: "Home", description: "Control center" },
    { href: `/w/${props.workspaceSlug}/evidence`, label: "Evidence", description: "Source library" },
    { href: `/w/${props.workspaceSlug}/questionnaires`, label: "Questionnaires", description: "Review queue" }
  ];

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link className="brand-lockup" href={`/w/${props.workspaceSlug}`}>
          <span className="brand-mark">A</span>
          <div>
            <strong>Attestly</strong>
            <span>{props.workspaceName}</span>
          </div>
        </Link>

        <div className="sidebar-kicker">Proof canvas</div>

        <nav className="app-nav" aria-label="Workspace">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link key={item.href} className={clsx("nav-link", isActive && "nav-link-active")} href={item.href}>
                <div className="nav-link-copy">
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-art">
            <Image alt="" aria-hidden="true" className="art-image" fill sizes="220px" src={brandArt.reuseMotif} />
          </div>
          <div className="sidebar-footer-copy">
            <strong>Reviewed answers compound</strong>
            <p>Grounded answering, citations, review state, and workspace isolation stay visible in one place.</p>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <div className="app-main-backdrop">
          <Image alt="" aria-hidden="true" className="art-image" fill sizes="100vw" src={brandArt.masterStyle} />
        </div>

        <header className="app-header">
          <div className="app-header-copy">
            <span className="eyebrow">Questionnaire core</span>
            <div>
              <strong>{props.workspaceName}</strong>
              <span>Scoped, cited, and ready to export.</span>
            </div>
          </div>
          <div className="app-header-actions">
            <span className="app-header-signal">Org isolated</span>
            <SignOutButton />
          </div>
        </header>

        <main className="app-content">{props.children}</main>
      </div>
    </div>
  );
}
