---
name: gotcha-rsc-closure-prop-500
description: A locally-defined function passed as a prop from an RSC to a Client Component is a runtime HTTP 500 that tsc, bun build and Storybook all pass — bind the real Server Action to a placeholder key instead
metadata:
  type: feedback
---

Never hand a **locally-defined function** from an RSC to a Client Component, not
even as a "nothing selected yet" stub. Next.js throws at render time: *"Functions
cannot be passed directly to Client Components unless you explicitly expose it by
marking it with 'use server'"* → HTTP 500. Instead bind the REAL Server Action to
a placeholder key:

```ts
const boundKey: XKey = key ?? { classId: "", subjectId: "", termId: "", yearLabel };
saveScoreAction: saveScoreAction.bind(null, boundKey),   // never: async () => ({ ok: false })
```

Safe because in the no-selection state nothing renders that could invoke it (no
sheet ⇒ no input, no submit control), and server-side key validation is the
backstop. If a state genuinely must have NO capability, make the VM field
`optional` and omit it — absence is serializable, a stub function is not.

**Why:** US-E18.44 review round 2. `/teacher/grades` had shipped (in US-E18.12)
with `key ? action.bind(null, key) : async () => ({ ok:false, errorKey:"unknown" })`.
The DEFAULT load has no query params ⇒ `key === null` ⇒ every visit 500'd. It sat
directly on the story's own AC ("teacher reopens the gradebook to read the
rejection reason" — reopening IS the no-selection default). I had spotted it the
round before and *deferred it as out of scope*; the reviewer reproduced it as a
real 500 and pulled it in. Lesson: a serialization defect on the AC's own path is
never "pre-existing, not mine".

**How to apply:**
- Grep RSC pages for `: async () =>` / `: () =>` in a VM literal — that shape is
  the smell. Ternaries around action props are where it hides.
- **The regression lock must be a unit test.** `bunx tsc --noEmit` accepts it (the
  closure satisfies the prop type), `bun run build` compiles it, and Storybook
  never crosses an RSC boundary — all three gates are blind. Test it the way
  [[pattern-rsc-routing-gate-e23-2]] does: `await Page({searchParams})`, read
  `el.props.vm`, then INVOKE `vm.someAction(...)` and assert the mocked action
  MODULE export received the placeholder key. A closure fails that with
  "Number of calls: 0" — the actual observed red.
- Test the no-selection branch of every RSC page that binds actions, not just the
  happy path; the happy path is the one that works.
- Also beware stale `.next/dev/types/validator.ts` entries pointing at deleted
  probe routes — they surface as phantom TS2307. `rm -rf .next` before trusting a
  tsc failure.
