# EduPortal — Design Overview

Source: `design_handoff_eduportal` (Claude Design handoff). Open `design_src/EduPortal.html` in a browser for the live interactive reference.

---

## Product

EduPortal is a **multi-tenant education management portal + LMS** for Vietnamese high schools.

### Roles

| Role | Vietnamese | Key capabilities |
|------|-----------|-----------------|
| Teacher | Giáo viên | Classes, attendance, grades, schedule, class log |
| Principal | Hiệu trưởng | School-wide overview, teacher management, reports |
| Student | Học sinh | LMS (courses, assignments, exams, grades, resources) |
| Parent | Phụ huynh | Monitor children's grades, attendance, conduct |

**Multi-tenancy:** Each school is an isolated tenant. A user can hold multiple roles across multiple schools — role selection happens after login via `/select-role`.

---

## Fidelity

**High-fidelity pixel-accurate designs.** Recreate colors, spacing, typography, border-radii, shadows, hover states, and animations exactly as shown in the prototype.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 App Router |
| UI | shadcn/ui (Radix UI) |
| Styling | Tailwind CSS v4 |
| Icons | lucide-react |
| Font | Plus Jakarta Sans (Google Fonts) |
| State | React useState / Zustand (global auth) |
| Auth | NextAuth.js (Google, Facebook, VneID, Credentials) |
| i18n | next-intl (`vi` / `en`) |
| Data | TanStack Query v5 + Axios (`src/lib/http.ts`) |

---

## App Router Layout

```
app/
├── (auth)/
│   ├── login/page.tsx
│   ├── forgot-password/page.tsx
│   └── select-role/page.tsx
└── (app)/
    ├── layout.tsx              ← Sidebar + Header shell
    ├── teacher/
    │   ├── page.tsx            ← Dashboard
    │   ├── attendance/page.tsx
    │   ├── class-log/page.tsx
    │   ├── grades/page.tsx
    │   ├── schedule/page.tsx
    │   ├── students/page.tsx
    │   └── discipline/page.tsx
    ├── principal/
    │   ├── page.tsx
    │   ├── teachers/page.tsx
    │   ├── classes/page.tsx
    │   ├── class-log/page.tsx
    │   ├── discipline/page.tsx
    │   └── reports/page.tsx
    ├── student/
    │   ├── page.tsx
    │   ├── courses/page.tsx
    │   ├── courses/[id]/page.tsx
    │   ├── assignments/page.tsx
    │   ├── exams/page.tsx
    │   ├── exams/[id]/page.tsx
    │   ├── grades/page.tsx
    │   ├── conduct/page.tsx
    │   ├── schedule/page.tsx
    │   └── resources/page.tsx
    ├── parent/
    │   ├── page.tsx
    │   ├── grades/page.tsx
    │   └── schedule/page.tsx
    ├── messages/page.tsx
    ├── notifications/page.tsx
    └── profile/page.tsx
```

---

## Screen Inventory

### Auth

| Screen | Route |
|--------|-------|
| Login (email + Google / Facebook / VneID SSO) | `/login` |
| Forgot password (email → OTP → new password → success) | `/forgot-password` |
| Role / tenant picker | `/select-role` |

### All Roles

| Screen | Route |
|--------|-------|
| Profile (info / security / sessions) | `/profile` |
| Messaging (inbox + 1:1 + group) | `/messages` |
| Notifications | `/notifications` |

### Teacher

| Screen | Route |
|--------|-------|
| Dashboard | `/teacher` |
| Classes | `/teacher/classes` |
| Attendance | `/teacher/attendance` |
| Class Log (Sổ đầu bài) | `/teacher/class-log` |
| Grade Book | `/teacher/grades` |
| Schedule | `/teacher/schedule` |
| Students | `/teacher/students` |
| Discipline | `/teacher/discipline` |

### Principal

| Screen | Route |
|--------|-------|
| School Overview Dashboard | `/principal` |
| Teachers | `/principal/teachers` |
| Classes | `/principal/classes` |
| Class Log (approve flow) | `/principal/class-log` |
| Discipline (school-wide) | `/principal/discipline` |
| Reports | `/principal/reports` |

### Student

| Screen | Route |
|--------|-------|
| Overview | `/student` |
| Courses + Lesson Player | `/student/courses` |
| Course Detail | `/student/courses/[id]` |
| Assignments | `/student/assignments` |
| Exams (list / briefing / taking / result) | `/student/exams` |
| Grades | `/student/grades` |
| Conduct + Leave Request | `/student/conduct` |
| Schedule | `/student/schedule` |
| Resources | `/student/resources` |

### Parent

| Screen | Route |
|--------|-------|
| Children Overview | `/parent` |
| Grades | `/parent/grades` |
| Schedule | `/parent/schedule` |

---

## Auth Flow (NextAuth)

```ts
// Session shape:
session.user.roles = [
  { role: 'teacher', tenantId: 'nd-hs', tenantName: 'THPT Nguyễn Du' },
  { role: 'parent',  tenantId: 'nd-hs', tenantName: 'THPT Nguyễn Du' },
]

// Post-login redirect:
// roles.length === 1 → /{role}
// roles.length  > 1  → /select-role
```

Role-based route protection via Next.js middleware checking `session.user.roles`.

---

## Multi-tenancy

- URL strategy: subdomain (`truong-a.eduportal.vn`) resolved in middleware.
- Every DB table has `tenant_id`; Prisma middleware auto-scopes queries.
- Per-tenant theming: `primary_color`, `logo_url`, `school_name` stored in `tenants` table and injected as CSS variables: `--color-primary`.

---

## i18n

All user-facing strings in `src/i18n/messages/{vi,en}.json`. Key pattern: `"teacher.dashboard.title"`. Switch via `<LocaleToggle>` in header.

---

## Design Source Files

| File | Contains |
|------|---------|
| `design_src/edu/tokens.js` | Color + spacing constants |
| `design_src/edu/ui.jsx` | Sidebar, Header, StatCard, Badge, ProgressBar |
| `design_src/edu/login.jsx` | Login, SSO, role-select, forgot password |
| `design_src/edu/teacher.jsx` | Teacher + Principal dashboard, grade book, schedule |
| `design_src/edu/student.jsx` | Student LMS — home, courses, assignments, grades, parent view |
| `design_src/edu/classops.jsx` | Attendance, Class Log |
| `design_src/edu/exam.jsx` | Exam list, briefing, taking, result |
| `design_src/edu/discipline.jsx` | Violations, conduct, leave management |
| `design_src/edu/messaging.jsx` | Messaging UI |
| `design_src/edu/profile.jsx` | Profile, change password, sessions |
| `design_src/EduPortal.html` | **Live interactive reference — open in browser** |
