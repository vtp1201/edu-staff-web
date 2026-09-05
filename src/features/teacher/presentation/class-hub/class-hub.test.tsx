import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { visibleTabs } from "@/features/teacher/domain/class-hub-tabs";
import { classHubHref } from "@/shared/class-hub-href";
import type { ClassHubHeaderVm, ClassHubTabsVm } from "./class-hub.i-vm";
import { ClassHubHeader } from "./class-hub-header";
import { ClassHubTabs } from "./class-hub-tabs";
import { TabPlaceholder } from "./tab-placeholder";

/**
 * US-E24.8 shell — node env, so assertions run on static markup. Covers the AC
 * bits that live in the presentation layer: tab count per role, `aria-selected`
 * on exactly the active tab, real anchors (native Tab/Enter navigation), the
 * homeroom-vs-subject identity tone, and per-tab placeholder copy.
 */
const BASE = "/vi/t/t1/teacher/classes";

function tabsVm(
  roles: ClassHubHeaderVm["roles"],
  activeTab: ClassHubTabsVm["activeTab"],
): ClassHubTabsVm {
  return {
    activeTab,
    tabs: visibleTabs(roles).map((id) => ({
      id,
      href: classHubHref(BASE, "cls-10a1", id),
    })),
  };
}

function headerVm(overrides: Partial<ClassHubHeaderVm> = {}): ClassHubHeaderVm {
  return {
    classId: "cls-10a1",
    className: "10A1",
    roles: ["homeroom", "subject"],
    subjects: [{ id: "sub-math", name: "Toán" }],
    studentCount: 36,
    academicYearLabel: "2025–2026",
    classesHref: BASE,
    ...overrides,
  };
}

function render(node: ReactElement): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="vi" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe("ClassHubTabs (US-E24.8)", () => {
  it("AC: GVCN + GVBM renders 4 tabs, subject-only renders 3 (no 'Chủ nhiệm')", () => {
    const dual = render(
      <ClassHubTabs vm={tabsVm(["homeroom", "subject"], "students")} />,
    );
    const subjectOnly = render(
      <ClassHubTabs vm={tabsVm(["subject"], "students")} />,
    );
    expect((dual.match(/role="tab"/g) ?? []).length).toBe(4);
    expect((subjectOnly.match(/role="tab"/g) ?? []).length).toBe(3);
    expect(dual).toContain(messages.teacherClasses.hub.tabs.homeroom);
    expect(subjectOnly).not.toContain(
      messages.teacherClasses.hub.tabs.homeroom,
    );
  });

  it("AC: the current tab is the ONLY one with aria-selected=true", () => {
    const html = render(
      <ClassHubTabs vm={tabsVm(["homeroom", "subject"], "timetable")} />,
    );
    expect((html.match(/aria-selected="true"/g) ?? []).length).toBe(1);
    expect((html.match(/aria-selected="false"/g) ?? []).length).toBe(3);
    // …and it is the timetable tab that owns it.
    expect(html).toMatch(
      /href="[^"]*\?tab=timetable"[^>]*aria-selected="true"|aria-selected="true"[^>]*href="[^"]*\?tab=timetable"/,
    );
  });

  it("tabs are real anchors inside a labelled tablist (Tab/Enter works natively)", () => {
    const html = render(<ClassHubTabs vm={tabsVm(["subject"], "students")} />);
    expect(html).toContain('role="tablist"');
    expect(html).toContain(
      `aria-label="${messages.teacherClasses.hub.tabs.navLabel}"`,
    );
    expect((html.match(/<a /g) ?? []).length).toBe(3);
    expect(html).toContain(`href="${BASE}/cls-10a1?tab=course"`);
    // A11Y-001: only the ACTIVE tab may claim `aria-controls` — its panel is the
    // only one in the DOM (multi-page tabs, not an SPA toggle), so an inactive
    // tab would point at a panel that is not its own.
    expect((html.match(/aria-controls=/g) ?? []).length).toBe(1);
    expect(html).toContain('aria-controls="classhub-panel-students"');
    const withControls = (html.match(/<a [^>]*aria-controls=[^>]*>/g) ?? [])[0];
    expect(withControls).toContain('aria-selected="true"');
  });

  it("A11Y-001: an inactive tab carries NO aria-controls (its panel is not rendered)", () => {
    const html = render(
      <ClassHubTabs vm={tabsVm(["homeroom", "subject"], "timetable")} />,
    );
    expect((html.match(/aria-controls=/g) ?? []).length).toBe(1);
    expect(html).toContain('aria-controls="classhub-panel-timetable"');
    expect(html).not.toContain('aria-controls="classhub-panel-students"');
  });

  it("AC (mobile 320px): the strip wraps instead of overflowing", () => {
    const html = render(
      <ClassHubTabs vm={tabsVm(["homeroom", "subject"], "students")} />,
    );
    expect(html).toMatch(/role="tablist"[^>]*class="[^"]*flex-wrap/);
  });

  it("renders the renamed label 'Thời khoá biểu' (never the old 'Tiết học')", () => {
    const html = render(<ClassHubTabs vm={tabsVm(["subject"], "students")} />);
    expect(html).toContain("Thời khoá biểu");
    expect(html).not.toContain("Tiết học");
  });
});

describe("ClassHubHeader (US-E24.8)", () => {
  it("renders the breadcrumb link back to the class list plus the current class as aria-current", () => {
    const html = render(<ClassHubHeader vm={headerVm()} />);
    expect(html).toContain(`href="${BASE}"`);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Lớp 10A1");
  });

  it("shows the student count + academic year meta line and both role badges", () => {
    const html = render(<ClassHubHeader vm={headerVm()} />);
    expect(html).toContain("36 học sinh · Năm học 2025–2026");
    expect(html).toContain(messages.teacherClasses.homeroomBadge);
    expect(html).toContain("GVBM · Toán");
  });

  it("identity icon box follows the ClassCard tone branch (homeroom purple vs subject primary) and stays decorative", () => {
    const homeroom = render(<ClassHubHeader vm={headerVm()} />);
    const subject = render(
      <ClassHubHeader vm={headerVm({ roles: ["subject"] })} />,
    );
    expect(homeroom).toContain("bg-edu-role-parent/18");
    expect(subject).toContain("bg-primary/18");
    expect(homeroom).toMatch(/aria-hidden="true"[\s\S]{0,200}svg/);
  });
});

describe("TabPlaceholder (US-E24.8, narrowed by US-E24.9 then US-E24.11)", () => {
  it("names the tab it stands in for, so E24.10 replaces a distinct body", () => {
    const course = render(<TabPlaceholder tab="course" />);
    const body = messages.teacherClasses.hub.placeholder.body;
    expect(course).toContain(body.course);
    expect(course).toContain(messages.teacherClasses.hub.placeholder.title);
    // Copy is user-facing — it must never leak an internal story id.
    expect(course).not.toMatch(/US-E\d/);
  });

  it("stands in for `course` ONLY — `timetable` (US-E24.9) and `homeroom` (US-E24.11) shipped real bodies", () => {
    expect(Object.keys(messages.teacherClasses.hub.placeholder.body)).toEqual([
      "course",
    ]);
  });
});
