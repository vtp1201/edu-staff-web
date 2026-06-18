---
name: pattern-server-action-as-prop-step-machine
description: Multi-step flow on a dynamic route — RSC page imports the Server Action and passes it as a prop to a client step-machine container
metadata:
  type: feedback
---

For a multi-step client flow living under a dynamic route segment
(`/student/exams/[examId]`), do NOT import the Server Action from inside the
client component (importing a `[examId]`-scoped `actions.ts` into a `'use client'`
container is fragile). Instead: the **RSC page** imports `submitExamAction` from
its sibling `./actions` and passes it **as a prop** into the client container
(`ExamDetailScreen`). Next 16 supports server-action-as-prop. The container types
the prop as the action's signature (mirror the action's return type locally) and
drives the step machine (`briefing → taking → result`) with `useState` +
`useTransition`. Action returns a stable `errorKey` (failure type), translated at
presentation via `t(\`errors.${errorKey}\`)`.

**Why:** keeps the client bundle free of `bootstrap/di`/infra, keeps the action's
DI server-side, and avoids brittle cross-segment imports into client code.

**How to apply:** any `[id]` route with an interactive client flow that needs a
mutation. RSC page = composition root (fetch via use-cases + wire the action prop);
client container = step state only. Pairs with
[[pattern-rsc-props-local-state-screen]] and [[pattern-throwing-repo-failure]].
Storybook: pass a noop async fn for the action prop; set
`parameters.nextjs.appDirectory = true` for any screen calling `useRouter`.
