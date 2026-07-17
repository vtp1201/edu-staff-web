---
name: gotcha-openapi-drifts-from-go-source
description: E18 core service — openapi.yaml can drift from the running Go server; the Go handler/use-case is the truth for BE-wiring, not openapi
metadata:
  type: feedback
---

For edu-api `core` BE-wiring, when the openapi.yaml and the Go source disagree, the **Go handler + use-case + entity is the source of truth** (that's what actually runs), not openapi.yaml.

**Why:** US-E18.15 (exam-papers) found openapi.yaml documented `POST /exam-papers/{id}/questions` as "atomically replace the complete question list" (`SetExamQuestionsRequest{questions:[...]}`), but the running server's handler binds `AddQuestionRequest` (a SINGLE question `{questionType,body,answerKey?,marks}`) and the use-case `AddQuestionInput` appends ONE question (position=len+1). Openapi also said the grade filter param is `grade`; the handler reads `c.Query("gradeLevel")`. Openapi said add-question allowed on DRAFT|PUBLISHED; the entity `AddQuestion` rejects anything `!= DRAFT`. Three separate openapi drifts in one endpoint family.

**How to apply:** In every E18 wiring US, after reading openapi, ALSO read `internal/<ctx>/adapter/http/*_handler.go` (request binding + query keys), `.../application/usecase/*.go` (guards/orchestration), and `.../domain/entity/*.go` (state-machine invariants). Ground-truth the request DTO field names and the status guards against Go, not prose. The epic overview's per-US notes repeatedly confirm "the table's label held at path level only" — the same skepticism applies to openapi request/response bodies.

Also: `core` service transforms domain i18n keys → wire code via `codeFromKey = strings.ToUpper(key)` (`pkg/kit/response/error.go`), so `exam_paper_not_found` → wire `EXAM_PAPER_NOT_FOUND` (UPPER_SNAKE holds for core — unlike IAM in US-E18.6 which ships the raw lowercase key). Confirm the service's response builder before assuming case.
