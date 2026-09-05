"use client";

import type { ReactNode } from "react";
import type { ClassHubHeaderVm, ClassHubTabsVm } from "./class-hub.i-vm";
import { ClassHubHeader } from "./class-hub-header";
import { ClassHubTabs, panelId, tabId } from "./class-hub-tabs";

export interface ClassHubScreenProps {
  header: ClassHubHeaderVm;
  tabs: ClassHubTabsVm;
  /**
   * The active tab's body — a Server Component subtree already resolved by
   * `page.tsx` (Server-Component-as-children). Never fetched here.
   */
  children: ReactNode;
}

/**
 * Class-detail shell (US-E24.8): identity header + tab strip + the ONE active
 * panel. Composition only — no data fetching, no client state; `?tab=` is the
 * state and the server resolved it before this component rendered.
 */
export function ClassHubScreen({
  header,
  tabs,
  children,
}: ClassHubScreenProps) {
  return (
    <div className="flex flex-col gap-4">
      <ClassHubHeader vm={header} />
      <ClassHubTabs vm={tabs} />
      <div
        role="tabpanel"
        id={panelId(tabs.activeTab)}
        aria-labelledby={tabId(tabs.activeTab)}
      >
        {children}
      </div>
    </div>
  );
}
