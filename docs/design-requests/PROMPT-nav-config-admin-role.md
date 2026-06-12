# Prompt: Cập nhật nav-config.ts — Thêm role `admin` riêng (decision 0022)

**Target file**: `src/components/layout/app-shell/sidebar/nav-config.ts`
**Target test file**: `src/components/layout/app-shell/sidebar/nav-config.test.ts`
**Related auth types**: `src/bootstrap/auth/types.ts` (hoặc nơi định nghĩa `UserRole`)
**Decision**: `docs/decisions/0022-admin-role-separation.md`
**Stories**: US-E12.1 → US-E12.6, US-E08.1 (update)

---

## Thay đổi cần thực hiện

### 1. Thêm `"admin"` vào union type `Role`

```ts
// Trước:
export type Role = "teacher" | "principal" | "student" | "parent";

// Sau:
export type Role = "teacher" | "principal" | "student" | "parent" | "admin";
```

Cập nhật tương ứng trong `src/bootstrap/auth/types.ts` (hoặc file chứa
`UserRole` / `AppRole` enum/union):
```ts
export type UserRole = "teacher" | "principal" | "student" | "parent" | "admin";
```

### 2. Thêm nav items cho role `admin`

```ts
// Trong NAV_ITEMS object, thêm key "admin":
admin: [
  { href: "/admin/school-setup",       labelKey: "shell.nav.schoolSetup",        icon: Settings2 },
  { href: "/admin/calendar",           labelKey: "shell.nav.academicCalendar",   icon: CalendarRange },
  { href: "/admin/subject-departments",labelKey: "shell.nav.subjectDepartments", icon: Layers },
  { href: "/admin/subjects",           labelKey: "shell.nav.subjects",           icon: BookOpen },
  { href: "/admin/roster",             labelKey: "shell.nav.studentRoster",      icon: ClipboardList },
  { href: "/admin/timetable",          labelKey: "shell.nav.timetable",          icon: Grid3x3 },
  { href: "/admin/assessment",         labelKey: "shell.nav.assessmentScheme",   icon: BarChart2 },
  { href: "/admin/announcements",      labelKey: "shell.nav.announcements",      icon: Megaphone },
],
```

Import icons từ `lucide-react`:
```ts
import {
  // ...existing...
  Settings2, CalendarRange, Layers, BookOpen,
  ClipboardList, Grid3x3, BarChart2, Megaphone,
} from "lucide-react";
```

### 3. Thêm default route cho role `admin`

```ts
// Trong DEFAULT_ROUTE object:
export const DEFAULT_ROUTE: Record<Role, string> = {
  teacher:   "/teacher",
  principal: "/principal",
  student:   "/student",
  parent:    "/parent",
  admin:     "/admin/school-setup",  // ← thêm
};
```

### 4. Xóa admin items khỏi role `principal` (nếu có)

Role `principal` KHÔNG có nav items `/admin/*`. Giữ nguyên:
```ts
principal: [
  { href: "/principal",           labelKey: "shell.nav.dashboard",  icon: BarChart3 },
  { href: "/principal/teachers",  labelKey: "shell.nav.teachers",   icon: UserCog },
  { href: "/principal/students",  labelKey: "shell.nav.students",   icon: Users },
  { href: "/principal/classes",   labelKey: "shell.nav.classes",    icon: School },
  { href: "/principal/schedule",  labelKey: "shell.nav.schedule",   icon: CalendarDays },
  { href: "/principal/reports",   labelKey: "shell.nav.reports",    icon: FileText },
  { href: "/principal/messages",  labelKey: "shell.nav.messages",   icon: MessageSquare },
],
```

### 5. Thêm i18n keys — vi.json + en.json

**`src/i18n/messages/vi.json`** (thêm vào namespace `shell.nav`):
```json
{
  "shell": {
    "nav": {
      "schoolSetup":        "Thiết lập trường",
      "academicCalendar":   "Năm học",
      "subjectDepartments": "Bộ môn",
      "subjects":           "Danh mục môn học",
      "studentRoster":      "Danh sách lớp",
      "timetable":          "Thời khoá biểu",
      "assessmentScheme":   "Thang điểm & Khung ĐG",
      "announcements":      "Thông báo trường"
    }
  }
}
```

**`src/i18n/messages/en.json`** (parity):
```json
{
  "shell": {
    "nav": {
      "schoolSetup":        "School Setup",
      "academicCalendar":   "Academic Year",
      "subjectDepartments": "Departments",
      "subjects":           "Subject Catalogue",
      "studentRoster":      "Student Roster",
      "timetable":          "Timetable",
      "assessmentScheme":   "Assessment Scheme",
      "announcements":      "Announcements"
    }
  }
}
```

### 6. Cập nhật nav-config.test.ts

```ts
describe("nav-config admin role", () => {
  it("returns 8 items for admin", () => {
    const items = getNavItems("admin");
    expect(items).toHaveLength(8);
  });

  it("includes school-setup as first item", () => {
    const items = getNavItems("admin");
    expect(items[0].href).toBe("/admin/school-setup");
  });

  it("admin items do not appear in principal nav", () => {
    const principalItems = getNavItems("principal");
    const adminHrefs = getNavItems("admin").map(i => i.href);
    adminHrefs.forEach(href => {
      expect(principalItems.map(i => i.href)).not.toContain(href);
    });
  });

  it("default route for admin is /admin/school-setup", () => {
    expect(DEFAULT_ROUTE["admin"]).toBe("/admin/school-setup");
  });
});
```

---

## Validation

```bash
bun run test --reporter=verbose src/components/layout/app-shell/sidebar/nav-config.test.ts
tsc --noEmit
bun run build
```

Tất cả phải pass. Số vitest pass tăng thêm ít nhất 4 test mới (cho role admin).

---

## Ghi chú quan trọng

- **Không implement route guard** trong story này — route guard `/admin/*` là
  dependency riêng (cần BE IAM phát hành claim `role: "admin"`, xem decision
  `0022`). Story này chỉ thêm nav items.
- **Không thêm admin items vào principal** — tách hoàn toàn per decision `0022`.
- Nếu `auth.repository.ts` map roles từ BE response, cần thêm `"admin"` vào
  allowed role values. Kiểm tra `parseRole()` / `mapRole()` function.
