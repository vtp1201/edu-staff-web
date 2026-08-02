/**
 * Integration tests — `ParentChildListRepository` ↔ HTTP boundary (US-E18.33).
 *
 * Two services, two calls, ONE direction: `core`'s linked-students read is the
 * authority for WHICH children exist; IAM's batch lookup only decorates the
 * ids that read returned. The id-scoping assertion below is the security-
 * relevant one — the batch call must never carry an id the parent's own link
 * list did not produce.
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { GRADES_EP } from "@/bootstrap/endpoint/grades.endpoint";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import { ParentChildListRepository } from "./parent-child-list.repository";

function makeHttp(over: Partial<AxiosInstance> = {}) {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    ...over,
  } as unknown as AxiosInstance;
}

function apiError(code: string, status: number, retryable = false) {
  return new ApiError({ code, message: `wire: ${code}`, retryable, status });
}

const LINKS = {
  links: [
    {
      linkId: "link-a",
      parentMemberId: "p-1",
      studentMemberId: "st-1",
      createdAt: "2026-01-01T00:00:00Z",
      classId: "cls-11a2",
      className: "11A2",
    },
    {
      linkId: "link-b",
      parentMemberId: "p-1",
      studentMemberId: "st-2",
      createdAt: "2026-01-02T00:00:00Z",
      classId: null,
      className: null,
    },
  ],
};

describe("ParentChildListRepository.getChildList", () => {
  it("reads the parent's OWN linked students then resolves their names in one batch", async () => {
    const get = vi.fn().mockResolvedValue(LINKS);
    const resolveNames = vi.fn(
      async () =>
        new Map([
          ["st-1", "Nguyễn Minh Khoa"],
          ["st-2", "Nguyễn Thu Hà"],
        ]),
    );
    const repo = new ParentChildListRepository(
      makeHttp({ get }),
      "p-1",
      resolveNames,
    );

    const children = await repo.getChildList();

    expect(get).toHaveBeenCalledWith(GRADES_EP.linkedStudents("p-1"));
    expect(children).toEqual([
      {
        childId: "st-1",
        name: "Nguyễn Minh Khoa",
        className: "11A2",
        avatar: "NK",
        color: "primary",
      },
      {
        childId: "st-2",
        name: "Nguyễn Thu Hà",
        className: "",
        avatar: "NH",
        color: "success",
      },
    ]);
  });

  it("requests ONLY the ids the parent's own link list returned (never an arbitrary id set)", async () => {
    const get = vi.fn().mockResolvedValue(LINKS);
    const resolveNames = vi.fn(async () => new Map<string, string>());
    await new ParentChildListRepository(
      makeHttp({ get }),
      "p-1",
      resolveNames,
    ).getChildList();

    expect(resolveNames).toHaveBeenCalledTimes(1);
    expect(resolveNames).toHaveBeenCalledWith(["st-1", "st-2"]);
  });

  it("skips the batch call entirely when the parent has no linked children", async () => {
    const get = vi.fn().mockResolvedValue({ links: [] });
    const resolveNames = vi.fn(async () => new Map<string, string>());
    const repo = new ParentChildListRepository(
      makeHttp({ get }),
      "p-1",
      resolveNames,
    );

    expect(await repo.getChildList()).toEqual([]);
    expect(resolveNames).not.toHaveBeenCalled();
  });

  it("degrades to the raw-id name when the name lookup fails — the roster still renders", async () => {
    const get = vi.fn().mockResolvedValue(LINKS);
    const resolveNames = vi.fn(async () => {
      throw new Error("iam down");
    });
    const repo = new ParentChildListRepository(
      makeHttp({ get }),
      "p-1",
      resolveNames,
    );

    const children = await repo.getChildList();
    expect(children.map((c) => c.name)).toEqual(["st-1", "st-2"]);
  });

  it("works with NO resolver injected (wire-level construction) — raw-id fallback, no crash", async () => {
    const get = vi.fn().mockResolvedValue(LINKS);
    const repo = new ParentChildListRepository(makeHttp({ get }), "p-1");
    expect((await repo.getChildList()).map((c) => c.name)).toEqual([
      "st-1",
      "st-2",
    ]);
  });

  it("rejects with not-found (empty roster state) on PARENTLINK_FORBIDDEN", async () => {
    // BE returns the same 403 for "not this parent" as for a probe, so the
    // honest client state is "no roster", not a distinguishable permission
    // error (same reasoning as the timetable repository).
    const get = vi
      .fn()
      .mockRejectedValue(apiError("PARENTLINK_FORBIDDEN", 403));
    const repo = new ParentChildListRepository(makeHttp({ get }), "p-1");

    await expect(repo.getChildList()).rejects.toEqual({ type: "not-found" });
  });

  it("rejects with network-error on any other transport failure", async () => {
    const get = vi
      .fn()
      .mockRejectedValue(apiError("UPSTREAM_TIMEOUT", 504, true));
    const repo = new ParentChildListRepository(makeHttp({ get }), "p-1");

    await expect(repo.getChildList()).rejects.toEqual({
      type: "network-error",
    });
  });

  it("rejects with not-found WITHOUT touching the network when the caller is unidentifiable", async () => {
    const get = vi.fn();
    const repo = new ParentChildListRepository(makeHttp({ get }), null);

    await expect(repo.getChildList()).rejects.toEqual({ type: "not-found" });
    expect(get).not.toHaveBeenCalled();
  });

  it("tolerates a missing `links` key (defensive — the wire shape is an object, not a bare array)", async () => {
    const get = vi.fn().mockResolvedValue({});
    const repo = new ParentChildListRepository(makeHttp({ get }), "p-1");
    expect(await repo.getChildList()).toEqual([]);
  });
});
