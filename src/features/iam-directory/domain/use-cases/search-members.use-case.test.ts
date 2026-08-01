/**
 * Unit tests — SearchMembersUseCase (US-E18.23, IAM US-144).
 *
 * The BE contract is explicit that `role`/`search` are applied AFTER a keyset
 * read, so a page may return fewer than `limit` items — even zero — while
 * `meta.pagination.hasMore` is still true. The only termination signal is
 * `hasMore === false`. This is the headline edge case below.
 */
import { describe, expect, it, vi } from "vitest";
import type { DirectoryMember } from "../entities/directory-member.entity";
import type { IamDirectoryFailure } from "../failures/iam-directory.failure";
import type {
  DirectoryPage,
  IIamDirectoryRepository,
} from "../repositories/i-iam-directory.repository";
import { fail, ok, type Result } from "./result";
import { SearchMembersUseCase } from "./search-members.use-case";

function member(over: Partial<DirectoryMember> = {}): DirectoryMember {
  return {
    memberId: "m-1",
    userId: "m-1",
    displayName: "Nguyễn Văn A",
    email: "a@example.com",
    roles: ["TEACHER"],
    status: "ACTIVE",
    ...over,
  };
}

function page(
  data: DirectoryMember[],
  hasMore: boolean,
  nextCursor: string | null = hasMore ? "c" : null,
): DirectoryPage {
  return { data, hasMore, nextCursor };
}

function makeRepo(
  pages: Array<Result<DirectoryPage, IamDirectoryFailure>>,
): IIamDirectoryRepository {
  const listMembers = vi.fn();
  for (const p of pages) listMembers.mockResolvedValueOnce(p);
  return {
    listMembers,
    batchLookup: vi.fn(),
  };
}

describe("SearchMembersUseCase", () => {
  it("does NOT stop early on a short (even zero-length) page while hasMore is true", async () => {
    const p1 = member({ memberId: "m-1", userId: "m-1" });
    const p3 = member({ memberId: "m-3", userId: "m-3" });
    const repo = makeRepo([
      ok(page([p1], true, "cur-1")),
      ok(page([], true, "cur-2")), // zero-length but NOT done
      ok(page([p3], false)),
    ]);

    const result = await new SearchMembersUseCase(repo).execute({
      tenantId: "t-1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((m) => m.memberId)).toEqual(["m-1", "m-3"]);
    expect(repo.listMembers).toHaveBeenCalledTimes(3);
  });

  it("forwards tenantId/role/search on the first call and the cursor afterwards", async () => {
    const repo = makeRepo([
      ok(page([member()], true, "cur-1")),
      ok(page([member({ memberId: "m-2", userId: "m-2" })], false)),
    ]);

    await new SearchMembersUseCase(repo).execute({
      tenantId: "t-1",
      role: "TEACHER",
      search: "ngu",
    });

    expect(repo.listMembers).toHaveBeenNthCalledWith(1, {
      tenantId: "t-1",
      role: "TEACHER",
      search: "ngu",
      cursor: undefined,
    });
    expect(repo.listMembers).toHaveBeenNthCalledWith(2, {
      tenantId: "t-1",
      role: "TEACHER",
      search: "ngu",
      cursor: "cur-1",
    });
  });

  it("stops when hasMore is true but the BE returns no nextCursor (defensive)", async () => {
    const repo = makeRepo([ok(page([member()], true, null))]);

    const result = await new SearchMembersUseCase(repo).execute({
      tenantId: "t-1",
    });

    expect(result.ok).toBe(true);
    expect(repo.listMembers).toHaveBeenCalledTimes(1);
  });

  it("propagates a forbidden failure from any page without aggregating", async () => {
    const repo = makeRepo([
      ok(page([member()], true, "cur-1")),
      fail<IamDirectoryFailure>({ type: "forbidden" }),
    ]);

    const result = await new SearchMembersUseCase(repo).execute({
      tenantId: "t-1",
    });

    expect(result).toEqual({ ok: false, failure: { type: "forbidden" } });
  });

  it("returns an empty list when the single page is empty and done", async () => {
    const repo = makeRepo([ok(page([], false))]);

    const result = await new SearchMembersUseCase(repo).execute({
      tenantId: "t-1",
    });

    expect(result).toEqual({ ok: true, value: [] });
  });
});
