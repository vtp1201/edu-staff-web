/**
 * Unit tests — Feed Server Actions (US-E19.1), especially the two
 * cross-story delegation seams flagged by QA as highest-risk:
 *  - reportContentAction  → moderation's SHARED submit-report use-case
 *    (AC-1906.3: correct kind/contentId/reason/note propagate; NOT a
 *    feed-local re-implementation).
 *  - removeContentAction  → moderation's SHARED remove-content use-case,
 *    ADR-0052: the feed direct-removal path NEVER sends a `reportId`
 *    (AC-1910.2). This action wrapper had ZERO prior test coverage.
 *
 * DI factories are mocked at the module boundary (matches the repo's
 * `principal/teachers/actions.test.ts` convention) — no HTTP, no server-only
 * repo internals exercised here.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const listFeedExecute = vi.fn();
const createPostExecute = vi.fn();
const reactToPostExecute = vi.fn();
const listCommentsExecute = vi.fn();
const addCommentExecute = vi.fn();
const togglePinMockExecute = vi.fn();

vi.mock("@/bootstrap/di/feed.di", () => ({
  makeListFeedUseCase: vi.fn(async () => ({ execute: listFeedExecute })),
  makeCreatePostUseCase: vi.fn(async () => ({ execute: createPostExecute })),
  makeReactToPostUseCase: vi.fn(async () => ({
    execute: reactToPostExecute,
  })),
  makeListCommentsUseCase: vi.fn(async () => ({
    execute: listCommentsExecute,
  })),
  makeAddCommentUseCase: vi.fn(async () => ({ execute: addCommentExecute })),
  makeTogglePinMockUseCase: vi.fn(async () => ({
    execute: togglePinMockExecute,
  })),
}));

const submitReportExecute = vi.fn();
const removeContentExecute = vi.fn();

vi.mock("@/bootstrap/di/moderation.di", () => ({
  makeSubmitReportUseCase: vi.fn(async () => ({
    execute: submitReportExecute,
  })),
  makeRemoveContentUseCase: vi.fn(async () => ({
    execute: removeContentExecute,
  })),
}));

import {
  createPostAction,
  fetchFeedPageAction,
  removeContentAction,
  reportContentAction,
} from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchFeedPageAction", () => {
  it("maps a successful FeedResult to { ok: true, data }", async () => {
    const page = { posts: [], nextCursor: null, hasMore: false };
    listFeedExecute.mockResolvedValue({ ok: true, value: page });
    const res = await fetchFeedPageAction({
      selection: { scope: "school" },
      cursor: null,
    });
    expect(res).toEqual({ ok: true, data: page });
  });

  it("maps a retryable failure to { ok: false, errorKey, retryable: true }", async () => {
    listFeedExecute.mockResolvedValue({
      ok: false,
      error: { type: "fetch-failed" },
    });
    const res = await fetchFeedPageAction({
      selection: { scope: "school" },
    });
    expect(res).toEqual({
      ok: false,
      errorKey: "fetch-failed",
      retryable: true,
    });
  });

  it("maps forbidden to non-retryable", async () => {
    listFeedExecute.mockResolvedValue({
      ok: false,
      error: { type: "forbidden" },
    });
    const res = await fetchFeedPageAction({ selection: { scope: "school" } });
    expect(res).toEqual({
      ok: false,
      errorKey: "forbidden",
      retryable: false,
    });
  });
});

describe("createPostAction", () => {
  it("delegates scope/content/hasAttachment to the use-case", async () => {
    createPostExecute.mockResolvedValue({
      ok: true,
      value: { postId: "p1" },
    });
    await createPostAction({
      selection: { scope: "class", classId: "11A2" },
      content: "hello",
      hasAttachment: true,
    });
    expect(createPostExecute).toHaveBeenCalledWith({
      scope: { scope: "class", classId: "11A2" },
      content: "hello",
      hasAttachment: true,
    });
  });
});

describe("reportContentAction (AC-1906.3 — delegates to the SHARED submit-report use-case)", () => {
  it("propagates kind=post + contentId + reason + note unchanged", async () => {
    submitReportExecute.mockResolvedValue({ ok: true });
    const res = await reportContentAction({
      kind: "post",
      contentId: "p-42",
      reason: "spam",
    });
    expect(submitReportExecute).toHaveBeenCalledWith({
      kind: "post",
      contentId: "p-42",
      reason: "spam",
      note: undefined,
    });
    expect(res).toEqual({ ok: true });
  });

  it("propagates kind=comment distinctly from kind=post (no discriminator lost)", async () => {
    submitReportExecute.mockResolvedValue({ ok: true });
    await reportContentAction({
      kind: "comment",
      contentId: "c-7",
      reason: "other",
      note: "lời lẽ xúc phạm",
    });
    expect(submitReportExecute).toHaveBeenCalledWith({
      kind: "comment",
      contentId: "c-7",
      reason: "other",
      note: "lời lẽ xúc phạm",
    });
  });

  it("maps a moderation failure to { ok:false, errorKey, retryable }", async () => {
    submitReportExecute.mockResolvedValue({
      ok: false,
      error: { type: "already-reported" },
    });
    const res = await reportContentAction({
      kind: "post",
      contentId: "p-1",
      reason: "spam",
    });
    expect(res).toEqual({
      ok: false,
      errorKey: "already-reported",
      retryable: false,
    });
  });
});

describe("removeContentAction (AC-1910.2 — delegates to the SHARED remove-content use-case, ADR-0052)", () => {
  it("propagates kind/contentId/parentId to the use-case", async () => {
    removeContentExecute.mockResolvedValue({ ok: true });
    await removeContentAction({
      kind: "comment",
      contentId: "c-9",
      parentId: "p-9",
    });
    expect(removeContentExecute).toHaveBeenCalledWith({
      kind: "comment",
      contentId: "c-9",
      parentId: "p-9",
    });
  });

  it("NEVER sends a reportId — the feed direct-removal path has no report in scope (ADR-0052)", async () => {
    removeContentExecute.mockResolvedValue({ ok: true });
    await removeContentAction({ kind: "post", contentId: "p-9" });
    const callArg = removeContentExecute.mock.calls[0][0];
    expect(callArg).not.toHaveProperty("reportId");
  });

  it("maps forbidden failure through with retryable:false", async () => {
    removeContentExecute.mockResolvedValue({
      ok: false,
      error: { type: "forbidden" },
    });
    const res = await removeContentAction({ kind: "post", contentId: "p-1" });
    expect(res).toEqual({
      ok: false,
      errorKey: "forbidden",
      retryable: false,
    });
  });

  it("maps network-error failure through with retryable:true", async () => {
    removeContentExecute.mockResolvedValue({
      ok: false,
      error: { type: "network-error" },
    });
    const res = await removeContentAction({ kind: "post", contentId: "p-1" });
    expect(res).toEqual({
      ok: false,
      errorKey: "network-error",
      retryable: true,
    });
  });
});
