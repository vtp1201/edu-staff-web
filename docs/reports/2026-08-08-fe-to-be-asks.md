# FE → BE (2026-08-08): batch 5 tiêu thụ xong (US-186..193) + 4 asks mới

> FE đã tiêu thụ xong toàn bộ batch BE 2026-08-07 (`docs/reports/2026-08-07-be-to-fe-response.md`,
> edu-api main HEAD `e2a3a445`) qua **10 US wiring US-E18.46→55, tất cả merged
> `main` 2026-08-07** (suite 518 files / 4081 unit tests + 1276 Storybook
> interaction xanh, `bunx tsc --noEmit` sạch, `bun run build` xanh cả mock lẫn
> real mode). Deploy-order checklist (core 047→050, social 038, IAM binary-only)
> đã hợp nhất vào `EPIC-OVERVIEW.md` §"Deploy notes (go-live real mode)".

## Phần 1 — Batch 5 đã đóng (đối chiếu report 2026-08-07 §1)

| Ask | BE US | FE US | Ghi chú tiêu thụ |
| --- | --- | --- | --- |
| #18 | US-186 | US-E18.46 | Rollup pending-approval + wire `approveEntry`. Batch dashboard cũ (`IGradeApprovalRepository`) vẫn force-mock — gap riêng, không đổi. |
| #28 | US-187 | US-E18.47 | 1 call range thay fan-out ≤31 call/ngày; zero UI diff. |
| #16 | US-188 | US-E18.48 | Whole-tenant conflicts scan + UI admin; ROOM chỉ phát hiện khi đọc (ADR 0128) — copy FE nói rõ "xử lý thủ công". |
| #10/#11 | US-189 | US-E18.49 | `bands` + `requiredCount` persisted; FE bỏ preset-fallback vô điều kiện + bỏ hardcode `count: 1`. |
| #32(b) | US-192 | US-E18.51 | Pin/unpin/pin-board real; `GroupEntity.pinnedMessages` xoá (board là resource riêng). |
| #32(a) | US-193 | US-E18.50 | `createGroup` (`{name}` only) + archive real; 5 method group còn lại vẫn mock (lý do per-method trong packet — không phải bug). |
| #32(c) | US-190 | US-E18.52 | Contact picker qua narrowed tier; filter chốt `role=TEACHER`; staff-tier byte-identical có regression test. |
| #31 | US-191 | US-E18.53 | Public redeem flow live (`/invitations/redeem`), high-risk gates đủ (security review + a11y + ADR 0071 amends 0059 phía FE). Token chỉ trong POST body — có test assert. |
| §2 viewer học bạ | US-064 (có sẵn) | US-E18.54 | Viewer remodel lên member-read, year-grouping client-side qua `classId`+`termId`, un-force-mock DI. Sinh ra ask #47/#48 dưới đây. |

## Phần 2 — Asks MỚI

17. **#47 — denormalize `academicYear` lên academic-record row (BE đã pre-offer
    ở report 2026-08-07 §2 — đây là ask chính thức).** FE hiện resolve năm học
    bằng enrollment point-read `GET /classes/{classId}/students/{studentMemberId}`
    (dedupe theo classId, cap 24 call, fail-soft). Hệ quả không sửa được phía FE:
    (a) **PARENT không resolve được năm** — không tồn tại read class-context nào
    RBAC cho PARENT, nên record của con rơi vào bucket "Chưa xác định năm học";
    (b) N+1 point-read cho STUDENT/ADMIN. Một cột `academicYear` denorm +
    backfill trên `academic_records_by_student` xoá cả hai vấn đề. Ưu tiên: cao
    (màn phụ huynh degrade rõ rệt).

18. **#48 — TEACHER đọc học bạ học sinh: cấp quyền hoặc FE bỏ route.**
    `GET /core/api/v1/members/{memberId}/academic-records` allow-list là
    ADMIN/MANAGER any + STUDENT self + PARENT linked-child — **TEACHER vắng mặt**
    (verify trực tiếp Go source: `default: forbidden`). FE đang có route
    `teacher/students/{studentId}/academic-record` (từ mock-era) — ở real mode
    trả `forbidden` vĩnh viễn (degrade trung thực, không bịa). Cần BE quyết:
    (a) grant TEACHER scoped (homeroom / lớp đang dạy) — FE giữ route; hoặc
    (b) xác nhận không cấp — FE sẽ có US riêng gỡ route + nav. Đề nghị trả lời
    dạng quyết định để FE không giữ mãi một màn chết.

19. **#32(b′) — `senderName` trong pin board (nhắc lại từ report 2026-08-06 mục
    17, chưa được trả lời trong batch 5).** `toMessageDTO(msg, "")` làm mọi row
    pin board có `senderName` rỗng → UI hiển thị "Không rõ người gửi" cho mọi
    tin đã ghim. Đề nghị denormalize sender name vào `pinned_messages` hoặc cho
    FE một lookup theo `senderUserId`. Kèm drift cần sync: Go handler CÓ emit
    `senderName` trên `MessageResponse` nhưng `openapi.yaml` schema `Message`
    KHÔNG khai báo field này.

20. **#49 — rate-limit per-IP của invitation redeem/lookup bucket sai (liên
    quan debt US-197 BE tự ghi).** Mọi request tới `POST /invitations/redeem`
    + `/lookup` đi qua Next server (Server Action) và FE **không** forward
    `X-Forwarded-For` (không tự ý thêm — spoofing surface, cần quyết
    platform-wide). Hệ quả: quota "10/phút per client IP" thực tế đếm chung
    trên MỘT IP của Next server → một abuser 429 mọi invitee đang đăng ký.
    US-197 (ProxyHeader sau Kong) có cover 2 route này không? Vì redeem là
    route public duy nhất tạo account, đề nghị ưu tiên xác nhận trước khi
    go-live invitation flow.

## Phần 3 — Còn treo (không đổi)

- **#21 (còn lại)** — audit-trail seal/unseal đa cycle: vị trí BE không đổi
  (chỉ giữ cycle mới nhất). FE chưa có nhu cầu cụ thể hơn — giữ treo, không ask lại.

## Observation (không chặn)

- BE debt tự ghi US-194 (cursor member LIST lộ member id) + US-199 (room-create
  chưa rate-limit): FE không cần hành động, đã ghi nhận để không report trùng.
- US-185 (year-heal): FE đã sweep xong mọi note staleness cũ (US-E18.55) —
  không còn caveat sống nào phía FE.
