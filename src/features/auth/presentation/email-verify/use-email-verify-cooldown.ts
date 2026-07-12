"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  CooldownController,
  type CooldownOptions,
} from "./cooldown-controller";

export type UseEmailVerifyCooldownOptions = CooldownOptions;

export interface UseEmailVerifyCooldownResult {
  /** Clamped to [0, durationSeconds]; 0 = actionable (Send/Resend enabled). */
  remainingSeconds: number;
  /** (Re)arms a fresh window from now(); never called by an error path. */
  start: () => void;
}

/** React binding over the framework-free `CooldownController` (unit-tested). */
export function useEmailVerifyCooldown(
  options?: UseEmailVerifyCooldownOptions,
): UseEmailVerifyCooldownResult {
  const ref = useRef<CooldownController | null>(null);
  if (ref.current === null) ref.current = new CooldownController(options);
  const controller = ref.current;

  useEffect(() => () => controller.dispose(), [controller]);

  const remainingSeconds = useSyncExternalStore(
    controller.subscribe,
    controller.getRemaining,
    controller.getRemaining,
  );

  return { remainingSeconds, start: controller.start };
}
