# US-E11.1 — Component Architecture

## Tree

```
/student/exams (RSC page)
└─ ExamListScreen (client)          props: { exams }
   ├─ StatCard ×3                   (shared) available / completed / avgScore
   ├─ filter tabs (role=tablist)    all | available | completed | expired
   └─ ExamCard ×n                   StatusBadge + duration/questions/teacher + CTA
      └─ (loading) ExamListSkeleton

/student/exams/[examId] (RSC page → passes submitExamAction prop)
└─ ExamDetailScreen (client step machine: briefing → taking → result)
   ├─ ExamBriefingScreen            props: { exam, onStart }
   │  ├─ InfoChip ×3
   │  ├─ numbered rules list
   │  └─ agree Checkbox + gated CTA
   ├─ ExamTakingScreen              props: { exam, questions, startedAt, onSubmit }
   │  ├─ ExamTakingTimer            role=status aria-live=polite; injectable now()
   │  ├─ option buttons (aria-pressed)
   │  ├─ QuestionNavigator          grid + legend
   │  ├─ Progress (ui)
   │  └─ SubmitModal (Dialog)
   └─ ExamResultScreen              props: { result, onBackToList }
      ├─ score hero (scoreColorClass) + StatusBadge pass/fail
      ├─ StatCard ×3 (correct/incorrect/skipped)
      └─ review filter + QuestionReviewCard ×n
```

## ViewModel / prop contracts

- `ExamListVm = { exams: ExamSummary[] }`
- `ExamBriefingVm = { exam: ExamSummary; onStart: () => void }`
- `ExamTakingVm = { exam; questions; startedAt: number; onSubmit(answers, startedAt) }`
- `ExamResultVm = { result: ExamResult; onBackToList: () => void }`
- `ExamDetailScreenProps = { exam; questions; initialResult?; submitExamAction }`

All VMs hold **domain entities + callbacks only** — no infrastructure types.
`startedAt` is captured at the briefing→taking transition and threaded through so
the timer is deterministic (testable with a fixed value / injected `now`).

## Placement decisions (component-organization rule)

- Reused primitives `StatCard`, `StatusBadge`, `Progress`, `Button`, `Checkbox`,
  `Dialog` consumed as-is — no forks.
- Exam-specific composed pieces (timer, navigator, submit-modal, screens) live in
  `features/exam/presentation/` (single-screen scope). Promote to
  `components/shared/` only if a second screen needs them.
- No new design-system token required (score colors reuse existing
  `text-edu-success-text` / `text-primary` / `text-edu-error-text`).
