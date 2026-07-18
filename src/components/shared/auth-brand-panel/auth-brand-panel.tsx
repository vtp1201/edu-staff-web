import type { ReactNode } from "react";

interface AuthBrandPanelProps {
  /** Brand heading (e.g. "EduPortal"). Decorative — rendered `aria-hidden`. */
  title: string;
  /** Supporting tagline under the title. Decorative — rendered `aria-hidden`. */
  tagline: string;
  /** Optional extra decorative content (e.g. a feature bullet list). */
  children?: ReactNode;
}

/**
 * Decorative brand panel for the public `(auth)` screens (login, invite-accept).
 * Hidden below `lg`; the page's real `<h1>` lives in the form column, so this
 * visual heading is `aria-hidden` to keep one mobile-safe heading hierarchy
 * (A11Y-004). Promoted from `login/page.tsx`'s inline panel on its 2nd use
 * (US-E21.2, component-organization.md "promote on 2nd use, don't copy").
 *
 * The gradient uses `color-mix()` over runtime tokens — an expressly dynamic
 * value that Tailwind utilities can't represent, so it stays an inline `style`.
 *
 * A11Y-002 fix (US-E21.2 self-audit): white text directly on the gradient's
 * `--edu-success` end measured ~1.7:1 (fails 4.5:1). A `bg-black/45` scrim
 * behind the text block clears ≥6:1 against every gradient stop (verified
 * via WCAG relative luminance) without touching the gradient itself.
 */
export function AuthBrandPanel({
  title,
  tagline,
  children,
}: AuthBrandPanelProps) {
  return (
    <div
      className="hidden w-[42%] flex-col items-center justify-center p-8 lg:flex"
      style={{
        background:
          "linear-gradient(150deg, var(--edu-primary) 0%, color-mix(in srgb, var(--edu-primary) 80%, transparent) 55%, color-mix(in srgb, var(--edu-success) 53%, transparent) 100%)",
      }}
    >
      <div className="rounded-xl bg-black/45 px-6 py-4 text-center">
        <p
          aria-hidden="true"
          className="text-3xl font-extrabold text-primary-foreground"
        >
          {title}
        </p>
        <p aria-hidden="true" className="mt-2 text-sm text-primary-foreground">
          {tagline}
        </p>
      </div>
      {children}
    </div>
  );
}
