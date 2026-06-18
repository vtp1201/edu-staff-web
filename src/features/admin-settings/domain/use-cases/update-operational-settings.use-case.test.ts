import { describe, expect, it, vi } from "vitest";
import type { OperationalSettings } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { IAdminSettingsRepository } from "../repositories/i-admin-settings.repository";
import { UpdateOperationalSettingsUseCase } from "./update-operational-settings.use-case";

function makeRepo(over: Partial<IAdminSettingsRepository> = {}) {
  return {
    getOperationalSettings: vi.fn(),
    updateOperationalSettings: vi.fn(),
    ...over,
  } as IAdminSettingsRepository;
}

describe("UpdateOperationalSettingsUseCase", () => {
  it("delegates to the repo and returns ok on success", async () => {
    const update = vi.fn().mockResolvedValue({ ok: true });
    const repo = makeRepo({ updateOperationalSettings: update });
    const useCase = new UpdateOperationalSettingsUseCase(repo);

    const result = await useCase.execute({ gradePublishMode: "SELF_PUBLISH" });

    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith({ gradePublishMode: "SELF_PUBLISH" });
  });

  it("propagates a network-error failure from the repo", async () => {
    const repo = makeRepo({
      updateOperationalSettings: vi
        .fn()
        .mockResolvedValue({ ok: false, error: { type: "network-error" } }),
    });
    const useCase = new UpdateOperationalSettingsUseCase(repo);

    const result = await useCase.execute({
      gradePublishMode: "ADMIN_APPROVAL",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe("network-error");
  });

  it("rejects an invalid grade publish mode without touching the repo", async () => {
    const update = vi.fn();
    const repo = makeRepo({ updateOperationalSettings: update });
    const useCase = new UpdateOperationalSettingsUseCase(repo);

    const result = await useCase.execute({
      gradePublishMode: "BOGUS",
    } as unknown as OperationalSettings);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe("unknown");
    expect(update).not.toHaveBeenCalled();
  });
});
