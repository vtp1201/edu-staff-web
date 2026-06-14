import { describe, expect, it, vi } from "vitest";
import type { IClassManagementRepository } from "../repositories/i-class-management.repository";
import { ArchiveClassUseCase } from "./archive-class.use-case";
import { fail, ok } from "./result";

/**
 * Unit tests for ArchiveClassUseCase (AC-4 server-side path).
 *
 * The "class has students" warning is a UI-only concern (studentCount in VM).
 * The use-case is a pass-through to the repo — tests verify delegation and
 * failure propagation only.
 */
describe("ArchiveClassUseCase", () => {
  it("archives a class via the repository", async () => {
    const repo = {
      archiveClass: vi.fn().mockResolvedValue(ok(undefined)),
    } as unknown as IClassManagementRepository;
    const useCase = new ArchiveClassUseCase(repo);

    const result = await useCase.execute("c-1");

    expect(result.ok).toBe(true);
    expect(repo.archiveClass).toHaveBeenCalledWith("c-1");
    expect(repo.archiveClass).toHaveBeenCalledTimes(1);
  });

  it("propagates not-found failure from the repository", async () => {
    const repo = {
      archiveClass: vi.fn().mockResolvedValue(fail({ type: "not-found" })),
    } as unknown as IClassManagementRepository;
    const useCase = new ArchiveClassUseCase(repo);

    const result = await useCase.execute("missing");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("not-found");
  });

  it("propagates forbidden failure from the repository", async () => {
    const repo = {
      archiveClass: vi.fn().mockResolvedValue(fail({ type: "forbidden" })),
    } as unknown as IClassManagementRepository;
    const useCase = new ArchiveClassUseCase(repo);

    const result = await useCase.execute("c-protected");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("forbidden");
  });

  it("propagates network-error failure from the repository", async () => {
    const repo = {
      archiveClass: vi.fn().mockResolvedValue(fail({ type: "network-error" })),
    } as unknown as IClassManagementRepository;
    const useCase = new ArchiveClassUseCase(repo);

    const result = await useCase.execute("c-1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("network-error");
  });
});
