/**
 * Pure read/write of the sidebar collapse preference. Storage is injected so
 * the logic is unit-testable in a node env (no jsdom). The React hook
 * `use-sidebar-collapsed.ts` wires this to `window.localStorage`.
 */
export const SIDEBAR_COLLAPSE_KEY = "eduportal:sidebar-collapsed";

type ReadStore = Pick<Storage, "getItem"> | null | undefined;
type WriteStore = Pick<Storage, "setItem"> | null | undefined;

/** Collapsed only when explicitly persisted as "1"; default (no value) = expanded. */
export function readCollapsed(store: ReadStore): boolean {
  try {
    return store?.getItem(SIDEBAR_COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeCollapsed(store: WriteStore, value: boolean): void {
  try {
    store?.setItem(SIDEBAR_COLLAPSE_KEY, value ? "1" : "0");
  } catch {
    // private-mode / quota — collapse simply won't persist.
  }
}
