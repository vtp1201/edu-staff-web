import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import { AdminSettingsRepository } from "./admin-settings.repository";

// The http interceptor unwraps the success envelope (US-E06.1): calls resolve to
// the payload directly and reject with a normalised ApiError. The repo catches
// and returns a { ok: false, error } result mapped to an AdminSettingsFailure.
function apiError(code: string, status = 400) {
  return new ApiError({ code, message: code, retryable: false, status });
}

function makeHttp(over: Partial<AxiosInstance> = {}) {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    ...over,
  } as unknown as AxiosInstance;
}

describe("AdminSettingsRepository", () => {
  it("getOperationalSettings returns the mapped payload on success", async () => {
    const http = makeHttp({
      get: vi.fn().mockResolvedValue({ gradePublishMode: "ADMIN_APPROVAL" }),
    });
    const repo = new AdminSettingsRepository(http);

    const res = await repo.getOperationalSettings();

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.gradePublishMode).toBe("ADMIN_APPROVAL");
  });

  it("getOperationalSettings maps a transport error to network-error", async () => {
    const http = makeHttp({
      get: vi.fn().mockRejectedValue(apiError("NETWORK_ERROR")),
    });
    const repo = new AdminSettingsRepository(http);

    const res = await repo.getOperationalSettings();

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("network-error");
  });

  it("updateOperationalSettings returns ok on success", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const http = makeHttp({ put });
    const repo = new AdminSettingsRepository(http);

    const res = await repo.updateOperationalSettings({
      gradePublishMode: "SELF_PUBLISH",
    });

    expect(res.ok).toBe(true);
    expect(put).toHaveBeenCalledWith(expect.any(String), {
      gradePublishMode: "SELF_PUBLISH",
    });
  });

  it("updateOperationalSettings maps SCHOOL_FORBIDDEN to forbidden", async () => {
    const http = makeHttp({
      put: vi.fn().mockRejectedValue(apiError("SCHOOL_FORBIDDEN", 403)),
    });
    const repo = new AdminSettingsRepository(http);

    const res = await repo.updateOperationalSettings({
      gradePublishMode: "ADMIN_APPROVAL",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("forbidden");
  });

  it("maps an unknown error code to unknown", async () => {
    const http = makeHttp({
      get: vi.fn().mockRejectedValue(apiError("WEIRD_CODE")),
    });
    const repo = new AdminSettingsRepository(http);

    const res = await repo.getOperationalSettings();

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("unknown");
  });
});
