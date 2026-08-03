/**
 * Integration tests — IamDirectoryRepository ↔ HTTP boundary (US-E18.23).
 *
 * The http interceptor unwraps the envelope, so repositories receive the
 * payload directly — except for `{ raw: true }` calls, which receive the whole
 * envelope so `meta.pagination` is readable. Errors arrive as a normalised
 * `ApiError`; we branch on `code`, never on `message`.
 *
 * IAM codes are RAW LOWERCASE (`member_list_forbidden`, `too_many_member_ids`)
 * — NOT UPPER_SNAKE like core/social. Same caveat as US-E18.6.
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { IAM_MEMBER_EP } from "@/bootstrap/endpoint/iam-member.endpoint";
import { ApiError, unwrapResponse } from "@/bootstrap/lib/api-envelope";
import type { MemberBatchItemDto } from "../dtos/member-batch-item.dto";
import type { MemberListItemDto } from "../dtos/member-list-item.dto";
import { IamDirectoryRepository } from "./iam-directory.repository";

function apiError(code: string, status: number, retryable = false) {
  return new ApiError({
    code,
    message: `wire message for ${code}`,
    retryable,
    status,
  });
}

function makeHttp(over: Partial<AxiosInstance> = {}) {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    ...over,
  } as unknown as AxiosInstance;
}

function listDto(over: Partial<MemberListItemDto> = {}): MemberListItemDto {
  return {
    memberId: "u-1",
    userId: "u-1",
    displayName: "Trần Thị B",
    email: "b@example.com",
    roles: ["TEACHER"],
    status: "ACTIVE",
    ...over,
  };
}

function batchDto(over: Partial<MemberBatchItemDto> = {}): MemberBatchItemDto {
  return {
    memberId: "u-9",
    displayName: "Lê Văn C",
    email: "c@example.com",
    roles: ["STAFF"],
    ...over,
  };
}

function envelope<T>(
  data: T,
  pagination?: { nextCursor: string | null; hasMore: boolean },
) {
  return {
    success: true as const,
    data,
    error: null,
    meta: { requestId: "req-1", timestamp: "2026-08-01T00:00:00Z", pagination },
  };
}

describe("IamDirectoryRepository.listMembers", () => {
  it("reads the cursor page through { raw: true } + parseEnvelope", async () => {
    const get = vi
      .fn()
      .mockResolvedValue(
        envelope([listDto()], { nextCursor: "cur-2", hasMore: true }),
      );
    const repo = new IamDirectoryRepository(makeHttp({ get }));

    const result = await repo.listMembers({
      tenantId: "t-1",
      role: "TEACHER",
      search: "tra",
      cursor: "cur-1",
      limit: 100,
    });

    expect(get).toHaveBeenCalledWith(IAM_MEMBER_EP.directoryMembers("t-1"), {
      params: { role: "TEACHER", search: "tra", cursor: "cur-1", limit: 100 },
      raw: true,
    });
    expect(result).toEqual({
      ok: true,
      value: {
        data: [
          {
            memberId: "u-1",
            userId: "u-1",
            displayName: "Trần Thị B",
            email: "b@example.com",
            roles: ["TEACHER"],
            status: "ACTIVE",
          },
        ],
        nextCursor: "cur-2",
        hasMore: true,
      },
    });
  });

  it("passes `raw` as a TOP-LEVEL config sibling of `params` (US-E18.19 regression)", async () => {
    // Nesting `raw` inside `params` silently disables the unwrap opt-out, so
    // parseEnvelope would receive an already-unwrapped payload → UNKNOWN_ERROR.
    // Pipe the real interceptor over the recorded config to prove the flag bites.
    const get = vi.fn().mockResolvedValue(envelope([listDto()]));
    await new IamDirectoryRepository(makeHttp({ get })).listMembers({
      tenantId: "t-1",
    });

    const config = get.mock.calls[0]?.[1] as { raw?: boolean };
    expect(config.raw).toBe(true);
    expect(unwrapResponse({ data: envelope([listDto()]), config })).toEqual(
      envelope([listDto()]),
    );
  });

  it("treats a missing meta.pagination as the last page", async () => {
    const get = vi.fn().mockResolvedValue(envelope([listDto()]));
    const repo = new IamDirectoryRepository(makeHttp({ get }));

    const result = await repo.listMembers({ tenantId: "t-1" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.hasMore).toBe(false);
    expect(result.value.nextCursor).toBeNull();
  });

  it("maps IAM's lowercase member_list_forbidden → forbidden", async () => {
    const get = vi
      .fn()
      .mockRejectedValue(apiError("member_list_forbidden", 403));
    const repo = new IamDirectoryRepository(makeHttp({ get }));

    expect(await repo.listMembers({ tenantId: "t-1" })).toEqual({
      ok: false,
      failure: { type: "forbidden" },
    });
  });

  it("maps a bare 403 (no recognised code) → forbidden", async () => {
    const get = vi.fn().mockRejectedValue(apiError("some_other_code", 403));
    const repo = new IamDirectoryRepository(makeHttp({ get }));

    expect(await repo.listMembers({ tenantId: "t-1" })).toEqual({
      ok: false,
      failure: { type: "forbidden" },
    });
  });

  it("maps NETWORK_ERROR → network-error", async () => {
    const get = vi
      .fn()
      .mockRejectedValue(
        new ApiError({ code: "NETWORK_ERROR", message: "", retryable: true }),
      );
    const repo = new IamDirectoryRepository(makeHttp({ get }));

    expect(await repo.listMembers({ tenantId: "t-1" })).toEqual({
      ok: false,
      failure: { type: "network-error" },
    });
  });

  it("maps a retryable transport error → network-error", async () => {
    const get = vi
      .fn()
      .mockRejectedValue(apiError("upstream_timeout", 504, true));
    const repo = new IamDirectoryRepository(makeHttp({ get }));

    expect(await repo.listMembers({ tenantId: "t-1" })).toEqual({
      ok: false,
      failure: { type: "network-error" },
    });
  });

  it("falls back to unknown for an unmapped code", async () => {
    const get = vi.fn().mockRejectedValue(apiError("member_invalid_role", 400));
    const repo = new IamDirectoryRepository(makeHttp({ get }));

    expect(await repo.listMembers({ tenantId: "t-1" })).toEqual({
      ok: false,
      failure: { type: "unknown" },
    });
  });
});

describe("IamDirectoryRepository.batchLookup", () => {
  it("sends the ids as one comma-separated query param and maps the payload", async () => {
    const get = vi.fn().mockResolvedValue([batchDto()]);
    const repo = new IamDirectoryRepository(makeHttp({ get }));

    const result = await repo.batchLookup(["u-9", "u-10"]);

    expect(get).toHaveBeenCalledWith(IAM_MEMBER_EP.batchMembers, {
      params: { ids: "u-9,u-10" },
    });
    expect(result).toEqual({
      ok: true,
      value: [
        {
          memberId: "u-9",
          displayName: "Lê Văn C",
          email: "c@example.com",
          roles: ["STAFF"],
        },
      ],
    });
  });

  it("narrowed tier (PARENT/STUDENT caller) — a memberId+displayName-only payload round-trips without inventing email/roles keys (ADR-0120)", async () => {
    // Real narrowed-tier JSON: the email/roles/dob/gender keys are genuinely
    // ABSENT (US-E18.33 ground-truth against services/iam/docs/openapi.yaml).
    const get = vi
      .fn()
      .mockResolvedValue([
        { memberId: "st-1", displayName: "Nguyễn Minh Khoa" },
      ]);
    const repo = new IamDirectoryRepository(makeHttp({ get }));

    const result = await repo.batchLookup(["st-1"]);

    expect(result).toEqual({
      ok: true,
      value: [{ memberId: "st-1", displayName: "Nguyễn Minh Khoa" }],
    });
    const row = result.ok ? result.value[0] : undefined;
    expect(row && "email" in row).toBe(false);
    expect(row && "roles" in row).toBe(false);
  });

  it("staff tier — a row WITH dob/gender round-trips both PII fields (IAM US-169, US-E18.35)", async () => {
    // Real staff-tier JSON: `dob` is a Go `*time.Time` → RFC3339 date-time, and
    // `gender` is the raw UPPER enum. Neither is reshaped at this boundary; the
    // consuming feature owns display formatting.
    const get = vi.fn().mockResolvedValue([
      {
        memberId: "st-2",
        displayName: "Nguyễn Minh Anh",
        email: "anh@example.com",
        roles: ["STUDENT"],
        dob: "2010-03-15T00:00:00Z",
        gender: "FEMALE",
      },
    ]);
    const repo = new IamDirectoryRepository(makeHttp({ get }));

    const result = await repo.batchLookup(["st-2"]);

    expect(result).toEqual({
      ok: true,
      value: [
        {
          memberId: "st-2",
          displayName: "Nguyễn Minh Anh",
          email: "anh@example.com",
          roles: ["STUDENT"],
          dob: "2010-03-15T00:00:00Z",
          gender: "FEMALE",
        },
      ],
    });
  });

  it("staff tier + PII unset — dob/gender keys stay ABSENT (optional per user, ADR-0122)", async () => {
    const get = vi.fn().mockResolvedValue([
      {
        memberId: "st-3",
        displayName: "Trần Văn Bình",
        email: "binh@example.com",
        roles: ["STUDENT"],
      },
    ]);
    const repo = new IamDirectoryRepository(makeHttp({ get }));

    const result = await repo.batchLookup(["st-3"]);
    const row = result.ok ? result.value[0] : undefined;

    // `toEqual` ignores undefined-valued keys, so assert the KEY SET.
    expect(row && Object.keys(row).sort()).toEqual([
      "displayName",
      "email",
      "memberId",
      "roles",
    ]);
  });

  it("maps too_many_member_ids → too-many-ids (defensive: the use-case chunks at 50)", async () => {
    const get = vi.fn().mockRejectedValue(apiError("too_many_member_ids", 400));
    const repo = new IamDirectoryRepository(makeHttp({ get }));

    expect(await repo.batchLookup(["a"])).toEqual({
      ok: false,
      failure: { type: "too-many-ids" },
    });
  });

  it("maps member_list_forbidden (no active tenant claim) → forbidden", async () => {
    const get = vi
      .fn()
      .mockRejectedValue(apiError("member_list_forbidden", 403));
    const repo = new IamDirectoryRepository(makeHttp({ get }));

    expect(await repo.batchLookup(["a"])).toEqual({
      ok: false,
      failure: { type: "forbidden" },
    });
  });
});
