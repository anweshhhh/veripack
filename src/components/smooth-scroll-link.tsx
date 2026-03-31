"use client";

import { MouseEvent, ReactNode } from "react";

function easeInOutCubic(progress: number) {
  return progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

export function SmoothScrollLink(props: {
  href: `#${string}`;
  className?: string;
  children: ReactNode;
  offset?: number;
  duration?: number;
}) {
  const { href, className, children, offset = 92, duration = 1150 } = props;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const targetId = href.slice(1);
    const target = document.getElementById(targetId);

    if (!target) {
      return;
    }

    event.preventDefault();

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      target.scrollIntoView({ behavior: "auto", block: "start" });
      window.history.pushState(null, "", href);
      return;
    }

    const startY = window.scrollY;
    const targetY = Math.max(target.getBoundingClientRect().top + window.scrollY - offset, 0);
    const distance = targetY - startY;

    if (Math.abs(distance) < 4) {
      window.history.pushState(null, "", href);
      return;
    }

    const startTime = performance.now();

    const tick = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);

      window.scrollTo({ top: startY + distance * eased, left: 0, behavior: "auto" });

      if (progress < 1) {
        window.requestAnimationFrame(tick);
        return;
      }

      window.history.pushState(null, "", href);
    };

    window.requestAnimationFrame(tick);
  };

  return (
    <a className={className} href={href} onClick={handleClick}>
      {children}
    </a>
  );
}
