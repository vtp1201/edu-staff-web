# 0022 Admin Role Separation — `admin` tách riêng khỏi `principal`

Date: 2026-06-12

## Status

Accepted

## Context

Ban đầu, các màn hình admin core (school-setup, calendar, subjects, roster,
timetable) được gán vào role `principal` trong `app.jsx` design prototype
(vì prototype dùng một role duy nhất để demo). Câu hỏi đặt ra: có tạo
role `admin` riêng không?

Lý do cần tách:

- **Boundary rõ ràng**: `principal` = vai trò sư phạm (giám sát lớp học, báo cáo,
  phê duyệt sổ đầu bài, quản lý kỷ luật). `admin` = vai trò hành chính hệ thống
  (cấu hình trường, năm học, danh mục môn học, xếp lớp, thời khoá biểu).
- **Phân quyền tốt hơn**: một trường có thể có nhiều giáo viên kiêm chức phó
  hiệu trưởng (principal) nhưng chỉ một người quản trị hệ thống (admin).
- **Tránh route namespace collision**: `/admin/*` và `/principal/*` tách nhau
  rõ ràng, không cần điều kiện role trong cùng route group.
- **Align với BE team**: BE đã phân biệt `ADMIN` và `PRINCIPAL` trong claim/role
  ở IAM service (các US BE đã reference role `ADMIN` cho US-049, US-042, etc.).

## Decision

1. **Tạo role `admin` riêng biệt** trong `nav-config.ts` (FE). Role này tách hoàn
   toàn khỏi role `principal`.

2. **Route namespace**:
   - `admin` sở hữu: `/admin/school-setup`, `/admin/calendar`, `/admin/subjects`,
     `/admin/subjects/[id]`, `/admin/subject-departments`, `/admin/roster`,
     `/admin/timetable`, `/admin/assessment`.
   - `principal` giữ: `/principal`, `/principal/teachers`, `/principal/classes`,
     `/principal/class-log`, `/principal/discipline`, `/principal/reports`.
   - Shared (all roles): `/messages`, `/notifications`, `/profile`.

3. **Nav items cho role `admin`**:
   ```ts
   admin: [
     { href: "/admin/school-setup",         labelKey: "schoolSetup",        icon: Settings2 },
     { href: "/admin/calendar",              labelKey: "academicCalendar",   icon: CalendarRange },
     { href: "/admin/subject-departments",   labelKey: "subjectDepartments", icon: Layers },
     { href: "/admin/subjects",              labelKey: "subjects",           icon: BookOpen },
     { href: "/admin/roster",                labelKey: "studentRoster",      icon: ClipboardList },
     { href: "/admin/timetable",             labelKey: "timetable",          icon: Grid3x3 },
     { href: "/admin/assessment",            labelKey: "assessmentScheme",   icon: BarChart2 },
   ]
   ```

4. **nav-config.ts**: thêm `"admin"` vào union type `Role`, thêm mảng nav items
   và default route mapping cho admin.

5. **Story packets E12**: tất cả route trong US-E12.1 → E12.6 dùng
   `app/[locale]/t/[tenant]/(app)/admin/*` (đã đúng từ đầu — không cần sửa route).
   Chỉ cần xác nhận role guard là `admin` (không phải `principal`).

## Dependencies (BE team)

**BE phải phát hành claim `role: "admin"` trong JWT token** khi user có role admin
trong tenant. FE sẽ đọc claim này để:
- Quyết định nav items hiển thị (nav-config.ts lookup theo role).
- Route guard: chỉ role `admin` được truy cập `/admin/*`.

Dependency rõ ràng:
- IAM service phải support `ADMIN` as a valid role claim value (kiểm tra US-049
  backend spec — nếu chưa có, BE team cần bổ sung).
- `auth.repository.ts` FE phải map claim `role: "admin"` vào FE Role type.

## Consequences

- `nav-config.ts` type `Role = "teacher" | "principal" | "student" | "parent" | "admin"`.
- `nav-config.ts` thêm `admin: [...]` array.
- `nav-config.ts` thêm `defaultRoute.admin = "/admin/school-setup"`.
- `nav-config.test.ts`: thêm test cases cho role admin trả đúng 7 items.
- `auth` layer: `UserRole` enum / union type bổ sung `"admin"`.
- Story packets US-E12.1 → US-E12.6: route path `/admin/*` đã đúng; chú thích
  role guard là `admin` (không phải `principal`).
- Nếu một người có cả role `admin` và `principal`, FE phải handle role-switch
  giữa hai dashboard (cùng cơ chế role-switcher hiện tại trong E05/E08).

## Related

- decision `0007` — multi-tenancy (role scoped per tenant)
- decision `0019` — auth endpoint alignment (role claim từ IAM)
- US-E12.1 → US-E12.6 — Admin Core stories
- US-E08.1 — App Shell (nav-config.ts, role-switcher)
- BE IAM US-049 (school config), US-042, US-043, US-045, US-048
