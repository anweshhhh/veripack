"use client";

import Link from "next/link";
import clsx from "clsx";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";

type NavItem = {
  href: string;
  label: string;
};

export function AppShell(props: {
  workspaceSlug: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const navItems: NavItem[] = [
    { href: `/w/${props.workspaceSlug}`, label: "Home" },
    { href: `/w/${props.workspaceSlug}/evidence`, label: "Evidence" },
    { href: `/w/${props.workspaceSlug}/questionnaires`, label: "Questionnaires" }
  ];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <Link className="brand-link brand-link-app" href={`/w/${props.workspaceSlug}`}>
            <span aria-hidden="true" className="brand-mark brand-mark-dual">
              <span />
              <span />
            </span>
            <span className="brand-copy">
              <strong>Attestly</strong>
            </span>
          </Link>

          <nav className="main-nav" aria-label="Workspace navigation">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link key={item.href} className={clsx("nav-link", isActive && "nav-link-active")} href={item.href}>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="app-header-actions">
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="app-main-inner">{props.children}</div>
      </main>
    </div>
  );
}
