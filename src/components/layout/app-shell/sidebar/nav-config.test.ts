import { describe, expect, it } from "vitest";
import {
  activeNavHref,
  DEFAULT_ROUTE,
  NAV_BY_ROLE,
  ROLE_LABEL_KEY,
  type Role,
} from "./nav-config";

const ROLES: Role[] = ["teacher", "principal", "student", "parent", "admin"];

describe("NAV_BY_ROLE", () => {
  it("defines nav items for all roles", () => {
    expect(Object.keys(NAV_BY_ROLE).sort()).toEqual([...ROLES].sort());
  });

  it("gives each role a non-empty list with unique hrefs", () => {
    for (const role of ROLES) {
      const items = NAV_BY_ROLE[role];
      expect(items.length).toBeGreaterThan(0);
      const hrefs = items.map((i) => i.href);
      expect(new Set(hrefs).size).toBe(hrefs.length);
    }
  });

  it("scopes every non-shared href under its role segment", () => {
    // Routes living under the (shared) group — accessible to all roles (US-E10.1).
    const SHARED_HREFS = new Set(["/profile", "/messages"]);
    for (const role of ROLES) {
      for (const item of NAV_BY_ROLE[role]) {
        if (SHARED_HREFS.has(item.href)) continue;
        expect(item.href.startsWith(`/${role}`)).toBe(true);
      }
    }
  });

  it("always exposes the shared profile entry last", () => {
    // Admin intentionally has no /profile nav item (profile via header) — exclude it.
    for (const role of ROLES.filter((r) => r !== "admin")) {
      const items = NAV_BY_ROLE[role];
      expect(items.at(-1)?.href).toBe("/profile");
    }
  });

  /**
   * US-E18.44: the per-cell grade reject capability is mounted ONLY on the
   * approver routes (`/teacher/grades` is guarded by a strict `role === "teacher"`
   * layout, so the roles allowed to reject can never render it). Both approver
   * routes existed as nav-less orphans; without an entry a principal/admin
   * session cannot reach the reject flow without typing a URL.
   */
  it("exposes the approver grade book to principal and admin", () => {
    expect(
      NAV_BY_ROLE.principal.some((i) => i.href === "/principal/grade-book"),
    ).toBe(true);
    expect(NAV_BY_ROLE.admin.some((i) => i.href === "/admin/grade-book")).toBe(
      true,
    );
  });

  it("reuses the existing `grades` label key for the approver grade book", () => {
    // No new i18n key: `shell.nav.grades` already labels /teacher/grades.
    const teacherGrades = NAV_BY_ROLE.teacher.find(
      (i) => i.href === "/teacher/grades",
    );
    expect(teacherGrades?.labelKey).toBe("grades");
    expect(
      NAV_BY_ROLE.principal.find((i) => i.href === "/principal/grade-book")
        ?.labelKey,
    ).toBe("grades");
    expect(
      NAV_BY_ROLE.admin.find((i) => i.href === "/admin/grade-book")?.labelKey,
    ).toBe("grades");
  });

  /**
   * US-E24.4: the student sidebar drops "Bài tập" and "Bài kiểm tra" — both
   * are now views of the courses screen (`?view=`), and the old routes are
   * permanent redirects. Asserting the WHOLE list (not just the two absences)
   * so a re-added entry cannot slip back in unnoticed.
   */
  it("gives a student exactly seven nav items, without assignments/exams", () => {
    expect(NAV_BY_ROLE.student.map((i) => i.href)).toEqual([
      "/student",
      "/student/courses",
      "/student/grades",
      "/student/conduct",
      "/student/schedule",
      "/messages",
      "/profile",
    ]);
    expect(DEFAULT_ROUTE.student).toBe("/student");
  });

  it("includes the role's home dashboard as the first item", () => {
    expect(NAV_BY_ROLE.teacher[0].href).toBe("/teacher");
    expect(NAV_BY_ROLE.principal[0].href).toBe("/principal");
    expect(NAV_BY_ROLE.student[0].href).toBe("/student");
    expect(NAV_BY_ROLE.parent[0].href).toBe("/parent");
  });

  /**
   * US-E08.7: student/parent view their own (or their child's) class
   * timetable, not a "teaching schedule" — reuse the existing `timetable`
   * key (already used by admin's `/admin/timetable`), no new i18n key.
   * Teacher/principal keep `schedule` — for them the label is correct as-is.
   */
  it("labels the student and parent schedule nav item as `timetable`, not `schedule`", () => {
    expect(
      NAV_BY_ROLE.student.find((i) => i.href === "/student/schedule")?.labelKey,
    ).toBe("timetable");
    expect(
      NAV_BY_ROLE.parent.find((i) => i.href === "/parent/schedule")?.labelKey,
    ).toBe("timetable");
  });

  it("keeps the teacher and principal schedule nav item labelled `schedule`", () => {
    expect(
      NAV_BY_ROLE.teacher.find((i) => i.href === "/teacher/schedule")?.labelKey,
    ).toBe("schedule");
    expect(
      NAV_BY_ROLE.principal.find((i) => i.href === "/principal/schedule")
        ?.labelKey,
    ).toBe("schedule");
  });
});

describe("admin role", () => {
  it("returns exactly 13 nav items for admin", () => {
    // 12 + the approver grade book added by US-E18.44.
    expect(NAV_BY_ROLE.admin.length).toBe(13);
  });

  it("includes the audit-log nav item", () => {
    expect(
      NAV_BY_ROLE.admin.some((item) => item.href === "/admin/audit-log"),
    ).toBe(true);
  });

  it("includes the staff-leave nav item", () => {
    expect(
      NAV_BY_ROLE.admin.some((item) => item.href === "/admin/staff-leave"),
    ).toBe(true);
  });

  it("includes the announcements nav item", () => {
    expect(
      NAV_BY_ROLE.admin.some((item) => item.href === "/admin/announcements"),
    ).toBe(true);
  });

  it("all admin hrefs start with /admin", () => {
    for (const item of NAV_BY_ROLE.admin) {
      expect(item.href.startsWith("/admin")).toBe(true);
    }
  });

  it("includes the class management nav item", () => {
    expect(
      NAV_BY_ROLE.admin.some((item) => item.href === "/admin/classes"),
    ).toBe(true);
  });

  it("includes the staffing nav item", () => {
    expect(
      NAV_BY_ROLE.admin.some((item) => item.href === "/admin/staffing"),
    ).toBe(true);
  });

  it("DEFAULT_ROUTE.admin is /admin/school-setup", () => {
    expect(DEFAULT_ROUTE.admin).toBe("/admin/school-setup");
  });

  it("ROLE_LABEL_KEY.admin is 'admin'", () => {
    expect(ROLE_LABEL_KEY.admin).toBe("admin");
  });
});

describe("ROLE_LABEL_KEY", () => {
  it("maps each role to its own label key", () => {
    for (const role of ROLES) {
      expect(ROLE_LABEL_KEY[role]).toBe(role);
    }
  });
});

describe("activeNavHref", () => {
  const HREFS = [
    "/t/acme/teacher",
    "/t/acme/teacher/classes",
    "/t/acme/teacher/class-log",
    "/t/acme/messages",
  ];

  it("marks only the dashboard on the dashboard route", () => {
    expect(activeNavHref("/t/acme/teacher", HREFS)).toBe("/t/acme/teacher");
  });

  it("prefers the longest match so the dashboard does not stay lit", () => {
    expect(activeNavHref("/t/acme/teacher/classes", HREFS)).toBe(
      "/t/acme/teacher/classes",
    );
  });

  it("keeps the parent item active on a nested child route", () => {
    expect(activeNavHref("/t/acme/teacher/classes/10a1", HREFS)).toBe(
      "/t/acme/teacher/classes",
    );
  });

  it("does not match on a partial segment", () => {
    expect(activeNavHref("/t/acme/teacher/class-log", HREFS)).toBe(
      "/t/acme/teacher/class-log",
    );
  });

  it("returns null for a route outside the nav and for no pathname", () => {
    expect(activeNavHref("/t/acme/other", HREFS)).toBeNull();
    expect(activeNavHref(null, HREFS)).toBeNull();
  });
});
