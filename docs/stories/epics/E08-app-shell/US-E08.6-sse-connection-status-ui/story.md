# US-E08.6 SSE Connection Status UI (Disconnect Banner + Pending-Message Pill)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E06.2 (SSE realtime foundation — hook + route handler must exist); US-E10.1 (messaging — pendingMsgCount counter lives in messaging context)
- Blocks: none
- Feature module(s) cham: `src/components/shared/sse-status/` (new shared component); `src/components/layout/` (DashboardLayout or root layout shell integration)
- Shared contract/file: `useRealtimeEvents()` hook from US-E06.2 (SSE hook — exposes connection state); no new endpoint

## Product Contract

Them hai UI element vao shell de phan anh trang thai ket noi SSE theo thiet ke `app.jsx` (edustaff_5, 2026-06):

**1. SSE Disconnect Banner (full-width, ben tren content area):**
- Hien khi `sseStatus === 'disconnected'`.
- Animate vao (slide-down), animate ra khi reconnect thanh cong.
- Mau: `bg-edu-warning` (vang), text `text-edu-warning-foreground`.
- Icon: `wifiOff` hoac equivalent, ben trai.
- Text: "Mat ket noi tuyen thong. Dang ket noi lai..." + spinner (connecting) hoac "Ket noi lai" button (disconnected + reconnect manual trigger).
- Auto-reconnect sau 4 giay (theo `app.jsx` mock).
- `role="status"` (ARIA live region, `aria-live="polite"`).
- Khong hien khi `sseStatus === 'connecting'` lan dau (chi hien khi mat ket noi sau khi da connected).

**2. Pending-Message Floating Pill:**
- Hien khi `pendingMsgCount > 0` VA nguoi dung dang o ngoai section messaging.
- Vi tri: floating bottom-right hoac theo handoff (app.jsx: floating pill voi badge so luong).
- Click -> navigate toi `/messages`.
- Badge so luong: toi da hien "99+" neu count > 99.
- An khi user di vao section `/messages`.
- `aria-label`: "Ban co N tin nhan moi. Bam de xem."

**RBAC:** Hien thi cho tat ca role co access messaging (teacher, student, parent, principal). Admin tuy chon (messaging co the bi disable).

**SSE status integration:**
- `useRealtimeEvents()` hook (US-E06.2) exposes connection state.
- Web gia su ket noi mat khi `EventSource` close unexpectedly -> `onclose`/`onerror` handler -> set `sseStatus = 'disconnected'`.
- Reconnect: setTimeout(4000) -> re-instantiate `EventSource`.
- `pendingMsgCount`: tang khi nhan SSE event `message.new` va user chua o section messaging; reset khi navigate vao `/messages`.

Mock-first: SSE upstream chua ship; `TweaksPanelUI` trong `app.jsx` demo toggle `sseStatus` cho dev.

## Relevant Product Docs

- `design_src/edu/app.jsx` — `sseStatus` state (lines ~10-25), SSE disconnect banner (lines ~50-90), floating pill (lines ~95-120), `TweaksPanelUI` SSE demo toggle
- `docs/product/screens.md` — Shell / App Shell section
- `docs/decisions/0041-sse-client-in-presentation-layer.md` — SSE hook placement rule (presentation layer); ADR confirms approach
- US-E06.2 — SSE foundation (hook + route handler)
- US-E10.1 — Messaging (pendingMsgCount source)

## Acceptance Criteria

- AC-1 (hidden when connected): Khi `sseStatus === 'connected'`, khong co banner, khong co pill (neu pendingMsgCount = 0).
- AC-2 (disconnect banner visible): Khi `sseStatus === 'disconnected'`, banner hien du voi: icon wifi-off, text thong bao mat ket noi, nut "Ket noi lai" (manual trigger).
- AC-3 (reconnecting state): Khi `sseStatus === 'connecting'`, banner thay doi text thanh "Dang ket noi lai..." va hien spinner; nut "Ket noi lai" bi disabled hoac an.
- AC-4 (auto-reconnect): Sau 4 giay mat ket noi (mock timer), trang thai tu chuyen ve `connecting` -> `connected`; banner an di.
- AC-5 (ARIA): Banner co `role="status"` va `aria-live="polite"`; text du ngu nghia (khong chi biet boi mau).
- AC-6 (motion-safe): Slide-in/out animation cua banner gate sau `@media (prefers-reduced-motion: reduce)`.
- AC-7 (pending pill — visible): Khi `pendingMsgCount > 0` va user khong o `/messages`, floating pill hien voi so luong (hien "99+" neu > 99).
- AC-8 (pending pill — navigate): Click pill -> chuyen den `/messages`; pill an sau khi navigate.
- AC-9 (pending pill — hidden in messaging): Khi user o section `/messages`, pill khong hien du cho `pendingMsgCount > 0`.
- AC-10 (pending pill — aria): Pill co `aria-label` ro rang bao gom so tin nhan moi.
- AC-11 (token-only): Mau banner dung `bg-edu-warning`/`text-edu-warning-foreground`; khong raw color.
- AC-12 (i18n): Tat ca strings qua namespace `shell`.

## Design Notes

- Commands: none (UI state only — no mutation)
- Queries: none (UI state from SSE hook)
- API: extends `useRealtimeEvents()` hook (US-E06.2) to expose `sseStatus` + `pendingMsgCount`
- Tables: none
- Domain rules: `pendingMsgCount` reset on navigate to /messages; auto-reconnect timer = 4s
- UI surfaces: `src/components/shared/sse-status/SseDisconnectBanner.tsx` + `SsePendingPill.tsx`; integrated into `src/components/layout/DashboardLayout` (or equivalent shell wrapper)
- Routes: shell-level — appears across all dashboard routes

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `SseDisconnectBanner` render logic (hidden/connecting/disconnected states); `pendingMsgCount` reset logic |
| Integration | `useRealtimeEvents()` hook integration — sseStatus transitions; pendingMsgCount increment on SSE event |
| E2E | Storybook: Banner_Hidden / Banner_Disconnected / Banner_Reconnecting / Pill_Visible / Pill_HiddenInMessages; play() assertions |
| Platform | bun build green; tsc --noEmit 0 errors |
| Release | design-review gate PASS |

## Harness Delta

- `docs/product/screens.md`: add row "SSE Disconnect Banner" to Shell section
- `docs/TEST_MATRIX.md`: add row US-E08.6 as `planned`

## Evidence

(to be filled after implementation)
