import { describe, expect, it, vi } from "vitest";
import type { IAdminSettingsRepository } from "../repositories/i-admin-settings.repository";
import { GetOperationalSettingsUseCase } from "./get-operational-settings.use-case";

function makeRepo(over: Partial<IAdminSettingsRepository> = {}) {
  return {
    getOperationalSettings: vi.fn(),
    updateOperationalSettings: vi.fn(),
    ...over,
  } as IAdminSettingsRepository;
}

describe("GetOperationalSettingsUseCase", () => {
  it("returns the settings on the happy path", async () => {
    const repo = makeRepo({
      getOperationalSettings: vi.fn().mockResolvedValue({
        ok: true,
        data: { gradePublishMode: "ADMIN_APPROVAL" },
      }),
    });
    const useCase = new GetOperationalSettingsUseCase(repo);

    const result = await useCase.execute();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.gradePublishMode).toBe("ADMIN_APPROVAL");
  });

  it("propagates a network-error failure from the repo", async () => {
    const repo = makeRepo({
      getOperationalSettings: vi
        .fn()
        .mockResolvedValue({ ok: false, error: { type: "network-error" } }),
    });
    const useCase = new GetOperationalSettingsUseCase(repo);

    const result = await useCase.execute();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe("network-error");
  });
});
