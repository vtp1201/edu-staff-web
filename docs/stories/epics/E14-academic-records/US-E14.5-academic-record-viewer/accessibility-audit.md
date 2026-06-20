# Accessibility Audit — US-E14.5 Academic Record Viewer

**Auditor:** fe-accessibility-auditor
**Date:** 2026-06-19
**Baseline:** WCAG 2.1 AA (`.claude/rules/accessibility.md`, decision `0013`)
**Worktree:** `edu-staff-web-trees/us-e14.5`
**Finding range:** A11Y-070 – A11Y-075

---

## 1. Audit Summary

| Item | Detail |
|---|---|
| Files audited | `year-timeline.tsx`, `seal-status-badge.tsx`, `academic-record-table.tsx`, `academic-record-screen.tsx`, `academic-record-container.tsx`, `academic-record-skeleton.tsx`, `derive-conduct-color-class.ts`, `score-color.ts`, 4 RSC pages |
| Criteria checked | 1.1.1, 1.3.1, 1.3.3, 1.4.1, 1.4.3, 2.1.1, 2.1.2, 2.4.3, 2.4.7, 4.1.2, 4.1.3 |
| Total findings | 6 |
| Blocking | 0 |
| Critical | 1 (A11Y-070) |
| Major | 2 (A11Y-071, A11Y-072) |
| Minor | 3 (A11Y-073, A11Y-074, A11Y-075) |
| Overall AA compliance | **Conditional pass** — Critical and Major issues must be resolved before merge |

The implementation is largely correct. Token usage is WCAG-safe throughout: score colors (`--edu-success-text` 5.4:1, `--edu-error-text` 5.1:1), conduct badge, warning-foreground, and `StatusBadge` all use verified AA tokens. The table structure (`<caption>`, `scope="col"`, `scope="row"`, null→"—"), error `role="alert"`, skeleton `aria-live="polite"`, `html[lang]`, and motion reset in `globals.css` are correct. The primary gaps are keyboard interaction patterns in the tablist and one missing `tabpanel` association.

---

## 2. WCAG 2.1 AA Coverage Table

| Criterion | Description | Result | Finding |
|---|---|---|---|
| 1.1.1 Non-text Content | Icons `aria-hidden`; badge aria-label present | PASS | — |
| 1.3.1 Info & Relationships | Table caption, scope=col/row, dl structure | PASS | — |
| 1.3.3 Sensory Characteristics | Status not color-only; icons + text in badges | PASS | — |
| 1.4.1 Use of Color | Score color paired with numeric value; conduct has text label | PASS | — |
| 1.4.3 Contrast (Text) | All text tokens verified AA-compliant via tokens.css | PASS | — |
| 1.4.4 Resize Text | No fixed px heights on text containers | PASS | — |
| 2.1.1 Keyboard | Tab buttons focusable; **Arrow-key navigation absent** | FAIL | A11Y-070 |
| 2.1.2 No Keyboard Trap | No traps observed | PASS | — |
| 2.4.3 Focus Order | Tab order follows reading order | PASS | — |
| 2.4.7 Focus Visible | `focus-visible:ring-2 ring-ring` on tab buttons | PASS | — |
| 4.1.2 Name, Role, Value | `role="tablist"` / `role="tab"` / `aria-selected`; **tabpanel role missing** | FAIL | A11Y-071 |
| 4.1.3 Status Messages | `aria-live="polite"` on skeleton; error `role="alert"`; **unsealed banner no live region** | FAIL | A11Y-072 |
| Motion (rule 0013) | `globals.css` universal `prefers-reduced-motion` reset covers `transition-colors` | PASS | — |
| Language | `html[lang={locale}]` via `getLocale()` | PASS | — |
| i18n strings | All copy from `messages/{vi,en}.json`; no hardcoded Vietnamese text | PASS | — |
| deriveConductColorClass | Unused in presentation layer (dead code) | NOTE | A11Y-075 |

---

## 3. Findings Catalogue

---

### A11Y-070
**Severity:** Critical (WCAG 2.1.1 — Keyboard)
**Component:** `src/features/academic-records/presentation/academic-record-screen/year-timeline.tsx`

**Issue:** The `role="tablist"` / `role="tab"` pattern requires roving-tabindex keyboard navigation per ARIA APG. Currently each `<button>` has no `tabIndex` management: all tabs are in the natural tab sequence (tabIndex 0 for all), and there are no `onKeyDown` handlers for Arrow-Left / Arrow-Right / Home / End. Keyboard-only users must Tab through every year button individually rather than entering the tablist once and arrowing between years. This fails the ARIA Tabs pattern and, for long year lists, creates an accessibility barrier.

**Evidence (lines 30–62):**
```tsx
<button
  type="button"
  role="tab"
  aria-selected={active}
  onClick={() => onChange(year.yearId)}
  // ← no tabIndex={active ? 0 : -1}
  // ← no onKeyDown handler
  className={cn(...)}
>
```
No `tabIndex` prop; no `onKeyDown`. All tab buttons remain in the document tab order simultaneously.

**Fix:** Implement roving tabindex. Active tab gets `tabIndex={0}`; all others get `tabIndex={-1}`. Add `onKeyDown` for Arrow navigation:

```tsx
"use client";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils";
import type { AcademicYear } from "../../domain/entities/academic-record.entity";

export function YearTimeline({ years, activeYearId, onChange }: YearTimelineProps) {
  const t = useTranslations("academicRecord");
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: React.KeyboardEvent, currentIndex: number) {
    let next = currentIndex;
    if (e.key === "ArrowRight") next = (currentIndex + 1) % years.length;
    else if (e.key === "ArrowLeft") next = (currentIndex - 1 + years.length) % years.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = years.length - 1;
    else return;

    e.preventDefault();
    buttonRefs.current[next]?.focus();
    onChange(years[next].yearId);
  }

  return (
    <div role="tablist" aria-label={t("yearTimeline.ariaLabel")} className="flex flex-wrap gap-2">
      {years.map((year, index) => {
        const active = year.yearId === activeYearId;
        return (
          <button
            key={year.yearId}
            ref={(el) => { buttonRefs.current[index] = el; }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(year.yearId)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-lg border px-4 py-2 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              active ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent",
            )}
          >
            {/* existing content unchanged */}
          </button>
        );
      })}
    </div>
  );
}
```

**Reference:** [ARIA APG — Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/), WCAG 2.1.1

---

### A11Y-071
**Severity:** Major (WCAG 4.1.2 — Name, Role, Value)
**Component:** `src/features/academic-records/presentation/academic-record-screen/academic-record-screen.tsx` — `TermSection` + `AcademicRecordScreen`

**Issue:** The `role="tablist"` / `role="tab"` pattern requires that the content panel controlled by each tab carry `role="tabpanel"` and be linked to its tab via `aria-controls` (on the tab) and `aria-labelledby` (on the panel). Currently the year content area (the `<div className="space-y-8">` wrapping `TermSection` items) has no `role="tabpanel"`, no `id`, and the tab buttons have no `aria-controls`. Screen readers therefore cannot announce how many tab panels exist or which panel is currently active.

**Evidence (`academic-record-screen.tsx` lines 216–221):**
```tsx
<div className="space-y-8">
  {activeYear.terms.map((term) => (
    <TermSection key={term.termId} term={term} />
  ))}
</div>
// ← no role="tabpanel", no id, no aria-labelledby
```

**Evidence (`year-timeline.tsx` line 33):**
```tsx
role="tab"
aria-selected={active}
// ← no aria-controls
```

**Fix:**

In `YearTimeline`, pass a panel id per tab and add `aria-controls`:
```tsx
// in year-timeline.tsx — add to props interface:
panelId: string; // computed by caller: `tabpanel-${year.yearId}`

// on the <button>:
aria-controls={panelId}
```

In `AcademicRecordScreen`, give the panel a matching id and role:
```tsx
// Pass panelId to each tab in YearTimeline:
<YearTimeline
  years={record.years}
  activeYearId={activeYear.yearId}
  onChange={(id) => onYearChange?.(id)}
/>

// Wrap year content:
<div
  id={`tabpanel-${activeYear.yearId}`}
  role="tabpanel"
  aria-labelledby={`tab-${activeYear.yearId}`}
  tabIndex={0}
  className="space-y-8"
>
  {activeYear.terms.map((term) => (
    <TermSection key={term.termId} term={term} />
  ))}
</div>
```
Each tab button also needs `id={`tab-${year.yearId}`}`.

**Reference:** [ARIA APG — Tabs Pattern §Required Owned Elements](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/), WCAG 4.1.2

---

### A11Y-072
**Severity:** Major (WCAG 4.1.3 — Status Messages)
**Component:** `src/features/academic-records/presentation/academic-record-screen/academic-record-screen.tsx` — `TermSection` (lines 113–128)

**Issue:** The unsealed warning banner (shown when `term.status === "UNSEALED"`) appears dynamically when the user navigates to a year/term, but has no `role="status"` or `aria-live` region. Screen-reader users will not hear the warning announced on dynamic appearance. The error state (lines 155–177) correctly uses `role="alert"`, but the less-severe warning banner is silent to AT.

**Evidence (lines 113–128):**
```tsx
{term.status === "UNSEALED" && (
  <div className="flex items-start gap-2 rounded-lg border border-edu-warning/40 bg-edu-warning/10 p-3 text-sm">
    <Unlock aria-hidden className="mt-0.5 size-4 shrink-0 text-edu-warning-foreground" />
    <div className="text-edu-warning-foreground">
      <p className="font-semibold">{t("termSection.unsealedBanner")}</p>
      {term.unsealReason && <p className="mt-0.5">{term.unsealReason}</p>}
    </div>
  </div>
  // ← no role="status" or aria-live
)}
```

**Fix:** Add `role="status"` (polite) so AT announces the warning without interrupting the user:
```tsx
{term.status === "UNSEALED" && (
  <div
    role="status"
    className="flex items-start gap-2 rounded-lg border border-edu-warning/40 bg-edu-warning/10 p-3 text-sm"
  >
    <Unlock aria-hidden className="mt-0.5 size-4 shrink-0 text-edu-warning-foreground" />
    <div className="text-edu-warning-foreground">
      <p className="font-semibold">{t("termSection.unsealedBanner")}</p>
      {term.unsealReason && <p className="mt-0.5">{term.unsealReason}</p>}
    </div>
  </div>
)}
```

**Reference:** WCAG 4.1.3 (Status Messages), [MDN — ARIA live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions)

---

### A11Y-073
**Severity:** Minor (WCAG 4.1.2 — Name, Role, Value)
**Component:** `src/features/academic-records/presentation/academic-record-screen/academic-record-screen.tsx` — `AcademicRecordScreen` (line 202)

**Issue:** The Print button (`<Button variant="outline" disabled>`) contains an icon (`<Printer aria-hidden>`) and text `{t("printButton")}`. The button is permanently `disabled` (the print action is deferred). A disabled button is removed from the accessibility tree in some AT implementations, and users receive no explanation of why it is unavailable. Per WCAG 4.1.2 and AAG best practice, a disabled UI control that represents a real feature should either (a) be visible with a tooltip/description of when it will be available, or (b) use `aria-disabled="true"` instead of `disabled` so AT can still read it and the user understands the control exists.

**Evidence (line 202):**
```tsx
<Button type="button" variant="outline" disabled>
  <Printer aria-hidden className="size-4" />
  {t("printButton")}
</Button>
```

**Fix:** Replace HTML `disabled` with `aria-disabled="true"` and add a `title` (or `aria-description`) explaining the feature is coming:
```tsx
<Button
  type="button"
  variant="outline"
  aria-disabled="true"
  title={t("printButton.comingSoon")}
  onClick={(e) => e.preventDefault()}
>
  <Printer aria-hidden className="size-4" />
  {t("printButton")}
</Button>
```
Also add the `printButton.comingSoon` key to both `vi.json` and `en.json`:
```json
// vi: "printButton.comingSoon": "Tính năng in sẽ sớm ra mắt"
// en: "printButton.comingSoon": "Print feature coming soon"
```

**Reference:** WCAG 4.1.2, [WCAG Technique ARIA14](https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA14)

---

### A11Y-074
**Severity:** Minor (WCAG 1.3.1 — Info & Relationships)
**Component:** `src/features/academic-records/presentation/academic-record-screen/academic-record-table.tsx` (lines 101–131)

**Issue:** The `<tfoot>` summary row has a `<th scope="row">` for "Tổng kết kỳ" but the adjacent conduct cell (`<td colSpan={4}>`) and the GPA label cell (`<td>`) are plain `<td>` elements. Screen readers reading the tfoot row will announce the row header then read four cells as data cells without an explicit label relationship. The GPA value cell in particular (last column) has no programmatic label tying it to the "GPA" text in the preceding cell. For a complex table summary row, the GPA label and value should be associated explicitly.

**Evidence (lines 119–129):**
```tsx
<td className="px-3 py-2 text-center text-muted-foreground">
  {t("table.gpa")}
</td>
<td className={cn("px-3 py-2 text-center font-bold tabular-nums", getScoreColorClass(gpa, 10))}>
  {gpa === null ? "—" : gpa}
</td>
```
The "GPA" label is in a `<td>`, not a `<th>`, so it has no `scope` and is not programmatically associated with the value cell.

**Fix:** Change the GPA label cell to a `<th scope="col">` (or add a unique `id` and `headers` attribute to the value cell):
```tsx
// Option A — th with id/headers:
<th id="tfoot-gpa-label" scope="col" className="px-3 py-2 text-center text-muted-foreground font-normal">
  {t("table.gpa")}
</th>
<td
  headers="tfoot-gpa-label"
  className={cn("px-3 py-2 text-center font-bold tabular-nums", getScoreColorClass(gpa, 10))}
>
  {gpa === null ? "—" : gpa}
</td>
```

**Reference:** WCAG 1.3.1, [H63 — Using the scope attribute](https://www.w3.org/WAI/WCAG21/Techniques/html/H63)

---

### A11Y-075
**Severity:** Minor (Code hygiene — not a WCAG violation)
**Component:** `src/features/academic-records/domain/use-cases/derive-conduct-color-class.ts`

**Issue:** `deriveConductColorClass()` is defined but is **never imported or used** anywhere in the presentation layer. The `AcademicRecordTable` uses `CONDUCT_TONE` + `StatusBadge` (the correct shared component) rather than this function. A dead export creates confusion about which pattern is canonical for conduct color, and risks a future developer using the raw text-color class directly instead of the badge. This is not a WCAG violation but is a maintenance risk for the a11y-safe `StatusBadge` pattern.

**Evidence:**
```bash
# grep finds zero imports:
grep -rn "deriveConductColorClass" src/features/academic-records/presentation/
# → no output
```

**Fix:** Either (a) delete `derive-conduct-color-class.ts` if it has no other consumers, or (b) add a comment documenting that conduct display must go through `StatusBadge` with `CONDUCT_TONE` and that this utility is intentionally kept for non-badge text contexts (e.g. a future print stylesheet). If deleted, remove its unit tests to avoid orphaned test files.

**Reference:** `.claude/rules/component-organization.md` (one canonical home per pattern)

---

## 4. Keyboard Navigation Map

### YearTimeline (`role="tablist"`)
| Key | Expected Behavior | Implemented? |
|---|---|---|
| Tab | Enter tablist; focus active tab | Yes (naturally) |
| Arrow Right / Arrow Down | Move focus to next tab; activate it | **No** (A11Y-070) |
| Arrow Left / Arrow Up | Move focus to previous tab; activate it | **No** (A11Y-070) |
| Home | Focus first tab | **No** (A11Y-070) |
| End | Focus last tab | **No** (A11Y-070) |
| Tab (inside tablist) | Move focus out of tablist to tabpanel | **No** — tabpanel not declared (A11Y-071) |
| Space / Enter | Activate focused tab | Yes (via click, natively) |

### AcademicRecordTable
| Key | Expected Behavior | Implemented? |
|---|---|---|
| Tab | Focus moves past the table (no interactive cells) | Yes |
| Screen reader table navigation | Row/col headers announced via `scope` | Mostly yes; GPA label weak (A11Y-074) |

### Error State / Retry Button
| Key | Expected Behavior | Implemented? |
|---|---|---|
| Tab | Focus retry button | Yes |
| Enter / Space | Trigger retry | Yes |
| Screen reader | `role="alert"` announces error on mount | Yes |

### Print Button
| Key | Expected Behavior | Implemented? |
|---|---|---|
| Tab | Skipped (HTML `disabled` removes from tab order) | Problematic (A11Y-073) |

---

## 5. Screen Reader Script

### Before fixes — Year Timeline
```
Screen reader (on page load):
  "Học bạ học sinh, heading level 1"
  [student card read normally as a definition list]
  "Chọn năm học, tablist"
  "2023-2024, Đã ký đủ, tab, 1 of 3, selected"  ← Tab key lands here
  "2024-2025, Ký một phần, tab, 2 of 3"           ← must Tab again (broken: should Arrow)
  "2025-2026, Chưa có học bạ, tab, 3 of 3"        ← must Tab again
  [no tabpanel announcement when year activates]
```

### After fixes — Year Timeline
```
Screen reader (on page load):
  "Chọn năm học, tablist"
  "2023-2024, Đã ký đủ, tab, 1 of 3, selected"   ← Tab lands here
  [ArrowRight] "2024-2025, Ký một phần, tab, 2 of 3, selected"
  [ArrowRight] "2025-2026, Chưa có học bạ, tab, 3 of 3, selected"
  [Tab]        "Học kỳ 1, 2 của năm 2025-2026, tabpanel"  ← correct panel handoff
```

### Unsealed banner — Before fix
```
User navigates to an UNSEALED term:
  [banner appears silently — no announcement]
```

### Unsealed banner — After fix
```
  "Học bạ đã được mở, status"  ← announced politely by role="status"
```

---

## 6. Quick Wins (< 30 min each, sorted by severity)

| Priority | Finding | Fix Time | What to do |
|---|---|---|---|
| 1 | A11Y-072 | 5 min | Add `role="status"` to unsealed warning `<div>` |
| 2 | A11Y-073 | 10 min | Replace `disabled` with `aria-disabled="true"` on Print button; add i18n key |
| 3 | A11Y-074 | 5 min | Change GPA label `<td>` to `<th>` with `id`; add `headers` on value cell |
| 4 | A11Y-075 | 5 min | Delete unused `derive-conduct-color-class.ts` (or add clear comment) |
| 5 | A11Y-070 | 30 min | Add roving tabindex + `onKeyDown` Arrow navigation to `YearTimeline` |
| 6 | A11Y-071 | 20 min | Add `role="tabpanel"` + `id` to year content div; `aria-controls` + `id` on tab buttons |

**Total blocking/critical/major issues: 3**
Path to full AA compliance: fix A11Y-070, A11Y-071, A11Y-072 before merge.
