import { type Mock, vi } from "vitest";
import type { IPeriodLogRepository } from "../../repositories/i-period-log.repository";

/** Spy repository — every method counted so a guard test can prove ZERO calls.
 *  Typed as `Mock`s (not the bare interface) so a test can assert call args. */
export type SpyPeriodLogRepository = IPeriodLogRepository & {
  [K in keyof IPeriodLogRepository]: Mock;
};

export function makeSpyRepo(
  over: Partial<IPeriodLogRepository> = {},
): SpyPeriodLogRepository {
  return {
    listPeriodLogs: vi.fn().mockResolvedValue([]),
    savePeriodLog: vi.fn().mockResolvedValue(undefined),
    deletePeriodLog: vi.fn().mockResolvedValue(undefined),
    listPeriodPreps: vi.fn().mockResolvedValue([]),
    savePeriodPrep: vi.fn().mockResolvedValue(undefined),
    deletePeriodPrep: vi.fn().mockResolvedValue(undefined),
    ...over,
  } as unknown as SpyPeriodLogRepository;
}

/**
 * Every app role a forged token could carry (decision 0063 testability
 * contract): NONE of them may substitute for "I am the slot's teacher".
 */
export const FORGED_ROLES = [
  "teacher",
  "principal",
  "admin",
  "student",
  "parent",
] as const;
