import { describe, expect, it } from "vitest";
import { DEFAULT_REPORT_QUEUE_FILTER } from "../../../domain/entities/report-queue-filter.entity";
import {
  filtersEqual,
  parseFilterFromParams,
  parseTabFromParams,
  toQueryString,
} from "./filter-search-params";

describe("parseFilterFromParams", () => {
  it("returns defaults for an empty query string", () => {
    expect(parseFilterFromParams(new URLSearchParams())).toEqual(
      DEFAULT_REPORT_QUEUE_FILTER,
    );
  });

  it("parses valid status/type/q and trims search", () => {
    const p = new URLSearchParams("status=resolved&type=comment&q=%20abc%20");
    expect(parseFilterFromParams(p)).toEqual({
      status: "resolved",
      contentType: "comment",
      search: "abc",
    });
  });

  it("falls back to defaults for unknown status/type", () => {
    const p = new URLSearchParams("status=bogus&type=weird");
    expect(parseFilterFromParams(p)).toEqual(DEFAULT_REPORT_QUEUE_FILTER);
  });
});

describe("parseTabFromParams", () => {
  it("defaults to queue and reads audit", () => {
    expect(parseTabFromParams(new URLSearchParams())).toBe("queue");
    expect(parseTabFromParams(new URLSearchParams("tab=audit"))).toBe("audit");
    expect(parseTabFromParams(new URLSearchParams("tab=queue"))).toBe("queue");
  });
});

describe("toQueryString", () => {
  it("omits default filter values on the queue tab", () => {
    expect(toQueryString(DEFAULT_REPORT_QUEUE_FILTER, "queue")).toBe("");
  });

  it("round-trips a non-default filter + audit tab", () => {
    const filter = {
      status: "resolved" as const,
      contentType: "post" as const,
      search: "spam",
    };
    const qs = toQueryString(filter, "audit");
    const params = new URLSearchParams(qs);
    expect(parseFilterFromParams(params)).toEqual(filter);
    expect(parseTabFromParams(params)).toBe("audit");
  });
});

describe("parseFilterFromParams — unsupported status", () => {
  it('falls back to the default tab for a legacy "?status=all" URL', () => {
    // The service has no `all` partition (US-E18.32); silently paging PENDING
    // is the only sane fallback, and it matches the wire's own default.
    const params = new URLSearchParams("status=all");
    expect(parseFilterFromParams(params).status).toBe("pending");
  });
});

describe("filtersEqual", () => {
  it("is empty-normalized on search", () => {
    expect(
      filtersEqual(
        { status: "pending", contentType: "all", search: "  " },
        { status: "pending", contentType: "all", search: "" },
      ),
    ).toBe(true);
    expect(
      filtersEqual(
        { status: "pending", contentType: "all", search: "a" },
        { status: "pending", contentType: "all", search: "b" },
      ),
    ).toBe(false);
  });
});
