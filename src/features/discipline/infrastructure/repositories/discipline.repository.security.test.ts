/**
 * Repository-boundary authorization proof — leave decisions (decision `0063`).
 *
 * A leave decision is IRREVERSIBLE for the student, so the only trustworthy
 * place to check "may this caller decide?" is the data boundary itself: these
 * tests call `approveLeave`/`rejectLeave` DIRECTLY on both repository
 * implementations, with a forged `authCtx`, bypassing every route guard, every
 * Server Action and every use-case. No UI is involved and no network mock is
 * needed — a denial must happen BEFORE `http.post` (real) and BEFORE any state
 * change (mock).
 *
 * The file is named `*.security.test.ts` on purpose: decision `0063`'s
 * testability contract asks for one findable home per feature, not forge-cases
 * scattered through the behaviour suite.
 *
 * The `authCtx === undefined` cases are the regression guard for the fail-OPEN
 * hole found reviewing US-E24.11: `assertCanDecideLeave` used to `return` early
 * when no context was supplied, and two Server Actions
 * (`/teacher/discipline`, `/principal/discipline`) supplied none — so in real
 * mode an irreversible core mutation ran with ZERO front-end authorization.
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";
import type { DecideLeaveInput } from "../../domain/entities/leave-request.entity";
import { DisciplineRepository } from "./discipline.repository";
import { MockDisciplineRepository } from "./mocks/discipline.mock.repository";

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

/** Every role that is NOT the class's homeroom teacher — BGH included: they
 *  have read-only oversight at MVP (ADR 0073 Follow-Up), so the check is an
 *  allow-list of ONE, not a deny-list. */
const FORGED_ROLES: UserRole[] = ["principal", "admin", "student", "parent"];

/* ── Real repository — nothing forged may reach the wire ─────────────────── */

describe("DisciplineRepository (real) — leave-decision authorization", () => {
  const REAL = {
    id: "req-1",
    studentMemberId: "stu-1",
    classId: "cls-10a1",
  };
  const REASON = "Đã nghỉ quá 5 ngày trong tháng";

  /** Each decision method as a uniform `(input) => Promise` so every case below
   *  runs against BOTH — a hole in one is a hole in the feature. */
  const methods = [
    {
      name: "approveLeave",
      call: (repo: DisciplineRepository, input: DecideLeaveInput) =>
        repo.approveLeave(input),
    },
    {
      name: "rejectLeave",
      call: (repo: DisciplineRepository, input: DecideLeaveInput) =>
        repo.rejectLeave({ ...input, reason: REASON }),
    },
  ];

  for (const { name, call } of methods) {
    it(`${name} refuses EVERY non-GVCN role, even with a matching class id, without calling http.post`, async () => {
      const http = makeHttp();
      const repo = new DisciplineRepository(http);

      for (const role of FORGED_ROLES) {
        await expect(
          call(repo, {
            ...REAL,
            authCtx: { role, homeroomClassIds: [REAL.classId] },
          }),
        ).rejects.toMatchObject({ type: "forbidden" });
      }
      expect(http.post).not.toHaveBeenCalled();
    });

    it(`${name} refuses a teacher who is NOT the GVCN of that class (forged scope) without calling http.post`, async () => {
      const http = makeHttp();
      const repo = new DisciplineRepository(http);

      await expect(
        call(repo, {
          ...REAL,
          authCtx: { role: "teacher", homeroomClassIds: ["cls-99z9"] },
        }),
      ).rejects.toMatchObject({ type: "forbidden" });
      // An empty scope (unreadable token / failed class read) denies too.
      await expect(
        call(repo, {
          ...REAL,
          authCtx: { role: "teacher", homeroomClassIds: [] },
        }),
      ).rejects.toMatchObject({ type: "forbidden" });
      expect(http.post).not.toHaveBeenCalled();
    });

    it(`${name} refuses a MISSING context — no context is "no proof", never "no opinion"`, async () => {
      const http = makeHttp();
      const repo = new DisciplineRepository(http);

      // The type now forbids this, but an untyped call site (a Server Action
      // reached with a hand-made payload) can still produce it at runtime.
      await expect(
        call(repo, {
          ...REAL,
          authCtx: undefined,
        } as unknown as DecideLeaveInput),
      ).rejects.toMatchObject({ type: "forbidden" });
      expect(http.post).not.toHaveBeenCalled();
    });

    it(`${name}: forbidden BEATS not-found — a forged caller learns nothing about which ids exist`, async () => {
      // The id does not exist, so a legitimate call would 404. The guard runs
      // first, so the answer is `forbidden` and no lookup ever happens: the
      // denial must not double as an existence oracle.
      const post = vi.fn();
      const http = makeHttp({ post });
      const repo = new DisciplineRepository(http);

      await expect(
        call(repo, {
          ...REAL,
          id: "req-does-not-exist",
          authCtx: { role: "principal", homeroomClassIds: [REAL.classId] },
        }),
      ).rejects.toMatchObject({ type: "forbidden" });
      expect(post).not.toHaveBeenCalled();
    });
  }
});

/* ── Mock repository — the durable boundary while the feature is mock-first ─ */

describe("MockDisciplineRepository — leave-decision authorization", () => {
  /** `l-1` (class `11A2`) and `l-4` (class `11B2`) are pending in the fixtures. */
  const APPROVE = { id: "l-1", studentMemberId: "s-30", classId: "11A2" };
  const REJECT = { id: "l-4", studentMemberId: "s-21", classId: "11B2" };
  const REASON = "Lý do từ chối hợp lệ";

  const methods = [
    {
      name: "approveLeave",
      base: APPROVE,
      call: (repo: MockDisciplineRepository, input: DecideLeaveInput) =>
        repo.approveLeave(input),
    },
    {
      name: "rejectLeave",
      base: REJECT,
      call: (repo: MockDisciplineRepository, input: DecideLeaveInput) =>
        repo.rejectLeave({ ...input, reason: REASON }),
    },
  ];

  for (const { name, base, call } of methods) {
    it(`${name} refuses EVERY non-GVCN role even when the class id matches`, async () => {
      const repo = new MockDisciplineRepository();

      for (const role of FORGED_ROLES) {
        await expect(
          call(repo, {
            ...base,
            authCtx: { role, homeroomClassIds: [base.classId] },
          }),
        ).rejects.toMatchObject({ type: "forbidden" });
      }
    });

    it(`${name} refuses a forged scope WITHOUT mutating the record`, async () => {
      const repo = new MockDisciplineRepository();

      await expect(
        call(repo, {
          ...base,
          authCtx: { role: "teacher", homeroomClassIds: ["some-other-class"] },
        }),
      ).rejects.toMatchObject({ type: "forbidden" });

      // Still pending — the denial happened before the fixture was touched.
      const after = await repo.getLeaveRequests({ classId: base.classId });
      expect(after.find((l) => l.id === base.id)?.status).toBe("pending");
    });

    it(`${name} refuses a MISSING context WITHOUT mutating the record`, async () => {
      const repo = new MockDisciplineRepository();

      await expect(
        call(repo, {
          ...base,
          authCtx: undefined,
        } as unknown as DecideLeaveInput),
      ).rejects.toMatchObject({ type: "forbidden" });

      const after = await repo.getLeaveRequests({ classId: base.classId });
      expect(after.find((l) => l.id === base.id)?.status).toBe("pending");
    });

    it(`${name}: forbidden BEATS the record lookup for an id that does not exist`, async () => {
      const repo = new MockDisciplineRepository();

      await expect(
        call(repo, {
          ...base,
          id: "l-does-not-exist",
          authCtx: { role: "principal", homeroomClassIds: [base.classId] },
        }),
      ).rejects.toMatchObject({ type: "forbidden" });
    });

    it(`${name} accepts the class's real GVCN`, async () => {
      const repo = new MockDisciplineRepository();

      const updated = await call(repo, {
        ...base,
        authCtx: {
          role: "teacher",
          homeroomClassIds: [base.classId, "other"],
        },
      });

      expect(updated.status).toBe(
        name === "approveLeave" ? "approved" : "rejected",
      );
    });
  }
});
