---
name: pattern-throwing-repo-failure
description: When a packet specifies repo methods that throw (Promise<Entity>) instead of Result<T>, how to wire failures end-to-end
metadata:
  type: feedback
---

Two valid repo error idioms coexist in this repo. Follow the **packet's declared
interface**, do not impose the other.

- **Result idiom** (staffing, principal-teachers, teacher-class): repo methods
  return `Result<T, Failure>` (`{ok,value}/{ok,failure}` from a feature-local
  `result.ts`). Use-cases pass it through; actions read `.ok`. See
  [[pattern-usecase-result]].
- **Throwing idiom** (class-log US-E13.3): repo methods return `Promise<Entity>`
  and THROW the `Failure` union object on error (`toFailure(err)` maps ApiError
  code → failure, then `throw failure`). Use-cases re-throw (and may throw their
  own validation failure, e.g. empty summary → `{type:"unknown"}`). The Server
  Action is the catch boundary: `try { ... } catch(err) { return {ok:false,
  errorKey: (err as Failure).type } }`. Presentation gets stable `errorKey` and
  translates `t(\`errors.${key}\`)`.

**Why:** packet is authoritative per-US; mixing idioms breaks the declared VM
contract. **How to apply:** read the `i-<name>.repository.ts` signature the
packet gives — `Promise<Entity>` ⇒ throwing idiom; `Promise<Result<…>>` ⇒
Result idiom.

Role-boundary guard actions: when a screen VM requires actions a role can't
perform (teacher approve/reject; principal create/submit), export thin server
actions returning `{ok:false, errorKey:"unauthorized"}` — satisfies the union
type AND enforces the boundary. `{ok:false}`-only is assignable to a
`{ok:true;entry}|{ok:false;errorKey}` union.
