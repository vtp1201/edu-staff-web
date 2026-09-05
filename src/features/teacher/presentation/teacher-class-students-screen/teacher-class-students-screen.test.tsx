import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { TeacherClassStudentsScreen } from "./teacher-class-students-screen";
import type { TeacherClassStudentsScreenVM } from "./teacher-class-students-screen.i-vm";

/**
 * A11Y-002 — the roster doubles as a standalone page AND as the class-hub's
 * "Học sinh" tab body. Embedded, the shell already renders the class name as the
 * page `<h1>`, so this screen must NOT emit a second one (WCAG 1.3.1).
 */
const vm: TeacherClassStudentsScreenVM = {
  status: "ready",
  className: "10A1",
  classesHref: "/vi/t/t1/teacher/classes",
  students: [
    {
      enrollmentId: "enr-1",
      displayName: "Nguyễn Minh Khoa",
      studentCode: "HS2501",
      status: "active",
    },
  ],
};

function render(node: ReactElement): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="vi" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe("TeacherClassStudentsScreen — heading level", () => {
  it("standalone: the class name is the page <h1>, with its own breadcrumb", () => {
    const html = render(<TeacherClassStudentsScreen vm={vm} />);
    expect(html).toContain("<h1");
    expect(html).toMatch(/<h1[^>]*>10A1<\/h1>/);
    expect(html).toContain(
      `aria-label="${messages.teacherClasses.breadcrumbLabel}"`,
    );
  });

  it("embedded: demotes the class name to <h2> and drops the breadcrumb (shell owns both)", () => {
    const html = render(<TeacherClassStudentsScreen vm={vm} embedded />);
    expect(html).not.toContain("<h1");
    expect(html).toMatch(/<h2[^>]*>10A1<\/h2>/);
    expect(html).not.toContain(
      `aria-label="${messages.teacherClasses.breadcrumbLabel}"`,
    );
    // Same visual treatment — only the semantic level changed.
    expect(html).toMatch(
      /<h2[^>]*class="[^"]*font-extrabold[^"]*"[^>]*>10A1<\/h2>/,
    );
  });
});
