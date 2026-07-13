import { describe, expect, it } from "vitest";
import type { Term } from "@/features/principal/domain/reports/entities/reports-summary.entity";
import { principalReportsKeys } from "./principal-reports-keys";

const TERMS: Term[] = ["HK1", "HK2", "FULL_YEAR"];

/**
 * AC-01.4 (stale-response race on rapid term switch) is architecturally solved
 * by TanStack Query's key-based cache identity (state-design.md §4/§10) rather
 * than a hand-rolled race guard: because `termId` is embedded in every region's
 * query key, a late-arriving response for a previous term always writes into a
 * DIFFERENT cache entry than the one the currently-rendered term reads from —
 * there is nothing to "discard" at the application-code level, and nothing to
 * race. This is a cheap, permanent regression guard for that architectural
 * claim: if `termId` were ever accidentally dropped from a key (e.g. during a
 * refactor), every one of these assertions would fail immediately, well before
 * the race would manifest as a real, hard-to-reproduce UI bug.
 */
describe("principalReportsKeys — termId is embedded in every region key (AC-01.4 basis)", () => {
  it("each region factory embeds the given termId as the last key segment", () => {
    for (const termId of TERMS) {
      expect(principalReportsKeys.summary(termId).at(-1)).toBe(termId);
      expect(principalReportsKeys.subjectAverages(termId).at(-1)).toBe(termId);
      expect(principalReportsKeys.attendanceTrend(termId).at(-1)).toBe(termId);
      expect(principalReportsKeys.list(termId).at(-1)).toBe(termId);
    }
  });

  it("distinct terms produce distinct keys for every region (no accidental cache-key collision)", () => {
    for (const factory of [
      principalReportsKeys.summary,
      principalReportsKeys.subjectAverages,
      principalReportsKeys.attendanceTrend,
      principalReportsKeys.list,
    ] as const) {
      const keys = TERMS.map((t) => JSON.stringify(factory(t)));
      expect(new Set(keys).size).toBe(TERMS.length);
    }
  });

  it("the 4 regions have distinct key namespaces for the SAME term (no cross-region collision)", () => {
    const term: Term = "HK1";
    const keys = [
      principalReportsKeys.summary(term),
      principalReportsKeys.subjectAverages(term),
      principalReportsKeys.attendanceTrend(term),
      principalReportsKeys.list(term),
    ].map((k) => JSON.stringify(k));
    expect(new Set(keys).size).toBe(4);
  });
});
