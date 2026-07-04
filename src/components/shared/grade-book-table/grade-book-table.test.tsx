import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  GradeBook,
  GradeBookRow,
} from "@/features/grades/domain/entities/grade-book.entity";
import { GradeBookTable } from "./grade-book-table";
import type { GradeBookTableVM } from "./grade-book-table.i-vm";

/**
 * DOM-attribute proof for US-E17.2 (mobile scroll + sticky column a11y).
 *
 * The repo's vitest env is `node` (no jsdom / @testing-library) — UI flows are
 * proven in Storybook browser mode. Here we render the component to static
 * markup via react-dom/server, which runs in node and lets us assert the exact
 * attributes/classes/styles the story mandates (role/aria-label, iOS momentum
 * style, min-width, sticky-cell right border + z-index).
 */

const SCHEME = {
  subjectId: "subj-toan-10",
  yearLabel: "2024-2025",
  columns: [
    {
      id: "tx",
      type: "TX" as const,
      label: "Thường xuyên",
      count: 2,
      weight: 20,
    },
    { id: "gk", type: "GK" as const, label: "Giữa kỳ", count: 1, weight: 30 },
    { id: "ck", type: "CK" as const, label: "Cuối kỳ", count: 1, weight: 50 },
  ],
};

const ROWS: GradeBookRow[] = [
  {
    studentId: "hs-001",
    studentName: "Nguyễn Văn An",
    studentCode: "HS001",
    scores: { tx: 8, gk: 8, ck: 9 },
    average: 8.5,
    conductGrade: "Tot",
    publishStatus: "PUBLISHED",
  },
];

function book(rows: GradeBookRow[]): GradeBook {
  return {
    classSubjectId: "cs-001",
    term: "HK1",
    className: "10A1",
    subjectName: "Toán",
    scheme: SCHEME,
    rows,
    publishMode: "SELF_PUBLISH",
  };
}

function renderTable(): string {
  // Spread props so Biome's useValidAriaRole doesn't read the VM's `role`
  // (viewer role) as a JSX ARIA role attribute.
  const props: GradeBookTableVM = {
    gradeBook: book(ROWS),
    role: "student",
    isPublished: true,
  };
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="vi" messages={messages}>
      <GradeBookTable {...props} />
    </NextIntlClientProvider>,
  );
}

// The scroll wrapper is the div carrying overflow-x-auto.
function scrollWrapper(html: string): string {
  const match = html.match(/<div[^>]*overflow-x-auto[^>]*>/);
  if (!match) throw new Error("scroll wrapper not found");
  return match[0];
}

describe("GradeBookTable — mobile scroll + sticky column a11y (US-E17.2)", () => {
  it("FR-1/FR-4: scroll wrapper is a labelled region reusing gradeBook.tableCaption", () => {
    const wrapper = scrollWrapper(renderTable());
    expect(wrapper).toContain('role="region"');
    // aria-label reuses the existing key — no new i18n key added.
    expect(wrapper).toContain(
      `aria-label="${messages.gradeBook.tableCaption}"`,
    );
    expect(messages.gradeBook.tableCaption.length).toBeGreaterThan(0);
  });

  it("FR-1/AC-10: iOS momentum scroll style sits on the overflow wrapper", () => {
    const wrapper = scrollWrapper(renderTable());
    // React serializes WebkitOverflowScrolling → -webkit-overflow-scrolling.
    expect(wrapper).toContain("-webkit-overflow-scrolling:touch");
  });

  it("FR-2/AC-11: the <table> carries min-w-[640px]", () => {
    const table = renderTable().match(/<table[^>]*>/);
    expect(table?.[0]).toContain("min-w-[640px]");
  });

  it("FR-3/AC-07/AC-08: every sticky first-column cell has right border + z-[1]", () => {
    const html = renderTable();
    const stickyCells = html.match(/<th[^>]*sticky left-0[^>]*>/g) ?? [];
    // One sticky <th scope=col> header + one sticky <th scope=row> per data row.
    expect(stickyCells.length).toBeGreaterThanOrEqual(2);
    for (const cell of stickyCells) {
      expect(cell).toContain("border-r");
      expect(cell).toContain("border-border");
      expect(cell).toContain("z-[1]");
    }
  });
});
