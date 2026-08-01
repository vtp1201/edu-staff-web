/**
 * Unit tests — BatchResolveMembersUseCase (US-E18.23, IAM US-144).
 *
 * `GET /iam/api/v1/members?ids=` accepts at most 50 ids per call and silently
 * omits unknown/malformed/other-tenant ids (it is deliberately NOT an
 * existence oracle). This use-case owns the chunking so callers never have to
 * think about the limit, and never surfaces a per-id error.
 */
import { describe, expect, it, vi } from "vitest";
import type { MemberSummary } from "../entities/member-summary.entity";
import type { IamDirectoryFailure } from "../failures/iam-directory.failure";
import type { IIamDirectoryRepository } from "../repositories/i-iam-directory.repository";
import { BatchResolveMembersUseCase } from "./batch-resolve-members.use-case";
import { fail, ok } from "./result";

function summary(memberId: string): MemberSummary {
  return {
    memberId,
    displayName: `Name ${memberId}`,
    email: `${memberId}@example.com`,
    roles: ["STAFF"],
  };
}

function makeRepo(
  impl: (ids: string[]) => ReturnType<IIamDirectoryRepository["batchLookup"]>,
): IIamDirectoryRepository {
  return {
    listMembers: vi.fn(),
    batchLookup: vi.fn(impl),
  };
}

describe("BatchResolveMembersUseCase", () => {
  it("chunks >50 ids into ≤50-id calls and merges the results", async () => {
    const ids = Array.from({ length: 120 }, (_, i) => `m-${i}`);
    const repo = makeRepo(async (chunk) => ok(chunk.map(summary)));

    const result = await new BatchResolveMembersUseCase(repo).execute(ids);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(120);
    const calls = vi.mocked(repo.batchLookup).mock.calls;
    expect(calls.map(([chunk]) => chunk.length)).toEqual([50, 50, 20]);
  });

  it("silently omits ids the BE did not resolve — never a per-id error", async () => {
    const repo = makeRepo(async () => ok([summary("m-1")]));

    const result = await new BatchResolveMembersUseCase(repo).execute([
      "m-1",
      "m-unknown",
    ]);

    expect(result).toEqual({ ok: true, value: [summary("m-1")] });
  });

  it("de-duplicates ids before chunking", async () => {
    const repo = makeRepo(async (chunk) => ok(chunk.map(summary)));

    await new BatchResolveMembersUseCase(repo).execute(["m-1", "m-1", "m-2"]);

    expect(repo.batchLookup).toHaveBeenCalledExactlyOnceWith(["m-1", "m-2"]);
  });

  it("makes no HTTP call at all for an empty id list", async () => {
    const repo = makeRepo(async () => ok([]));

    const result = await new BatchResolveMembersUseCase(repo).execute([]);

    expect(result).toEqual({ ok: true, value: [] });
    expect(repo.batchLookup).not.toHaveBeenCalled();
  });

  it("propagates a repository failure (callers degrade, never throw)", async () => {
    const repo = makeRepo(async () =>
      fail<IamDirectoryFailure>({ type: "network-error" }),
    );

    const result = await new BatchResolveMembersUseCase(repo).execute(["m-1"]);

    expect(result).toEqual({ ok: false, failure: { type: "network-error" } });
  });
});
