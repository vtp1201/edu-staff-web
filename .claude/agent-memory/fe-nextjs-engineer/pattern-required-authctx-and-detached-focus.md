---
name: pattern-required-authctx-and-detached-focus
description: E24.11 review — an OPTIONAL authCtx + an early-return guard is fail-open; delete the context-free DI factory instead of documenting the hole. Plus the detached-invoker focus fallback for a dialog that removes its own row.
metadata:
  type: feedback
---

Two fixes from the US-E24.11 tech-lead + a11y review.

**1. `authCtx?` + `if (ctx === undefined) return;` IS the vulnerability.**
Making the decision-0063 context optional "because the legacy dashboard has no
class scope" produced a real fail-open: two Server Actions called a
context-free `makeApproveLeaveUseCase()` and mutated core with zero FE
authorization. **Why:** a route gate is not a data boundary, and a comment
explaining why a caller may skip the check does not stop the caller.
**How to apply:** make `authCtx` REQUIRED on the input type, throw `forbidden`
on `undefined`/`null` anyway (untyped call sites exist), and DELETE the DI
factory that can build the mutation without a context — the bundle factory
(`make…UseCases() → { approve, reject, authCtx }`) then becomes the only door.
Check first whether the auth-context assembler really needs the per-screen
scope: `makeLeaveDecisionAuthContext()` derives the caller's WHOLE homeroom set
from their own class list, so the "this screen can't derive one" excuse was
false. A role that then legitimately gets `forbidden` (principal deciding) is
the correct outcome, not a regression. Put the forge tests in a findable
`<feature>.repository.security.test.ts`, parameterised over BOTH methods
(role sweep + forged scope + empty scope + missing ctx + forbidden-beats-
not-found), not scattered in the behaviour suite.

**2. A dialog whose confirm REMOVES its own invoking row loses focus.**
`useDialogReturnFocus` snapshots the invoker and calls `.focus()` on close — on
a detached node that is a silent no-op, so focus lands on `<body>`.
**Why:** the row unmounts before Radix's `onCloseAutoFocus` runs.
**How to apply:** `titleRef.current?.focus()` in the success branch covers the
NO-dialog path only; for the dialog path pass a fallback ref
(`useDialogReturnFocus(open, fallbackRef)` → `invoker?.isConnected ? invoker :
fallback`), surfaced as an optional `returnFocusRef` prop on the shared dialog.
Target a `tabIndex={-1}` heading. In the Storybook proof, the assertion must
retry the QUERY too (`waitFor(() => expect(getByRole("heading",…)).toHaveFocus())`):
during Radix's exit animation the rest of the page is still out of the a11y tree.
See also [[gotcha-primitive-focus-return]], [[gotcha-aria-label-on-span-and-tab-order]]
(same role=generic badge fix, third occurrence).
