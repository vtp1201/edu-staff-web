/**
 * Unit tests — `makePrincipalTeachersRepository()` (US-E18.40).
 *
 * The real branch composes TWO services: core (classes / subject-assignments /
 * subjects) over its own http client, and IAM's member directory (the teacher
 * roster) through `iam-directory`'s `SearchMembersUseCase`. This is the env
 * matrix for the `USE_MOCK` gate plus proof that the composed port is actually
 * wired with the pinned `role: "TEACHER"` + token-derived tenant id.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL = process.env.NEXT_PUBLIC_USE_MOCK;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock("@/bootstrap/lib/http.server");
  vi.doUnmock("@/bootstrap/di/auth.di");
  vi.doUnmock("@/bootstrap/di/iam-directory.di");
  vi.doUnmock("@/bootstrap/lib/auth-token.server");
  vi.doUnmock("@/bootstrap/lib/jwt");
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = ORIGINAL;
});

/** Stub the server-only seams the real branch touches (cookies / session / IAM). */
function stubServerSeams() {
  const get = vi.fn().mockRejectedValue(new Error("no http in this test"));
  const createServerHttpClient = vi.fn().mockResolvedValue({ get });
  const ensureFreshSession = vi.fn().mockResolvedValue(undefined);
  const execute = vi.fn().mockResolvedValue({ ok: true, value: [] });
  const makeSearchMembersUseCase = vi.fn().mockResolvedValue({ execute });
  const getAccessToken = vi.fn().mockResolvedValue("jwt-token");
  const decodeTenantId = vi.fn().mockReturnValue("tenant-42");

  vi.doMock("@/bootstrap/lib/http.server", () => ({ createServerHttpClient }));
  vi.doMock("@/bootstrap/di/auth.di", () => ({ ensureFreshSession }));
  vi.doMock("@/bootstrap/di/iam-directory.di", () => ({
    makeSearchMembersUseCase,
  }));
  vi.doMock("@/bootstrap/lib/auth-token.server", () => ({ getAccessToken }));
  vi.doMock("@/bootstrap/lib/jwt", () => ({ decodeTenantId }));

  return {
    createServerHttpClient,
    ensureFreshSession,
    execute,
    getAccessToken,
    decodeTenantId,
  };
}

async function makeWithEnv(value: string | undefined) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = value;
  const { makePrincipalTeachersRepository } = await import(
    "./principal-teachers.di"
  );
  return makePrincipalTeachersRepository();
}

describe("makePrincipalTeachersRepository", () => {
  it("returns the mock repository when NEXT_PUBLIC_USE_MOCK=true", async () => {
    const repo = await makeWithEnv("true");
    // `vi.resetModules()` gives each import a fresh class identity, so compare
    // the constructor name rather than using `instanceof`.
    expect(repo.constructor.name).toBe("MockPrincipalTeachersRepository");
  });

  for (const value of [undefined, "false"] as const) {
    it(`returns the REAL repository when NEXT_PUBLIC_USE_MOCK=${String(value)}`, async () => {
      const { createServerHttpClient } = stubServerSeams();
      const repo = await makeWithEnv(value);
      expect(repo.constructor.name).toBe("PrincipalTeachersRepository");
      expect(createServerHttpClient).toHaveBeenCalledTimes(1);
    });
  }

  it("refreshes the session before building the real client (decision 0018)", async () => {
    const { ensureFreshSession } = stubServerSeams();
    await makeWithEnv("false");
    expect(ensureFreshSession).toHaveBeenCalledTimes(1);
  });

  it("never touches http / IAM / the token in mock mode", async () => {
    const { createServerHttpClient, getAccessToken } = stubServerSeams();
    await makeWithEnv("true");
    expect(createServerHttpClient).not.toHaveBeenCalled();
    expect(getAccessToken).not.toHaveBeenCalled();
  });

  it("pins role TEACHER + the token-derived tenant id on the directory port", async () => {
    const { execute } = stubServerSeams();
    const repo = await makeWithEnv("false");
    // The core reads reject, so only the directory call is observable here.
    await repo.listTeachers();
    expect(execute).toHaveBeenCalledExactlyOnceWith({
      tenantId: "tenant-42",
      role: "TEACHER",
    });
  });

  it("serves seed teachers with IAM-shaped statuses in mock mode", async () => {
    const repo = await makeWithEnv("true");
    const res = await repo.listTeachers();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.length).toBeGreaterThan(0);
    for (const teacher of res.value) {
      expect(["ACTIVE", "INACTIVE", "SUSPENDED"]).toContain(teacher.status);
      for (const assignment of teacher.subjectAssignments) {
        expect(Object.keys(assignment).sort()).toEqual([
          "classId",
          "className",
          "subjectId",
          "subjectName",
        ]);
      }
    }
  });
});
