/**
 * Canonical UI contract for the shared `ChildSwitcher` (US-E20.5 promotion —
 * component-organization.md decision `0026`: a composed component used by ≥2
 * screens lives in `components/shared/`).
 *
 * These types are the component's OWN ViewModel, deliberately self-contained:
 * a `components/shared/` component must not import a specific feature's
 * `domain/entities` (that would couple every consumer to `grades`), and a
 * feature's `domain/` must not import from `components/shared/` (hard layer
 * rule — `domain/` imports nothing outside domain). Consumers pass
 * structurally compatible objects: `grades`' `ChildSummary` (its repository's
 * return contract) and `parent-attendance`'s child list both satisfy this
 * shape, and TypeScript's structural assignability turns any future drift into
 * a compile error rather than a silent mismatch.
 */
export type ChildColor = "primary" | "success" | "warning" | "error" | "purple";

export interface ChildSwitcherChild {
  childId: string;
  name: string;
  className: string;
  /** 2-char initials for avatar fallback */
  avatar: string;
  /** design-token role string → maps to --edu-<color> CSS var in presentation */
  color: ChildColor;
}

export interface ChildSwitcherVM {
  childList: ChildSwitcherChild[];
  activeChildId: string;
}
