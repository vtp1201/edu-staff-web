# Rule: Component Organization — canonical home, no duplication

Một component giao diện chỉ được tồn tại **một nơi chân lý**. Mọi version đã
custom (custom là **đúng yêu cầu design**, không phải tùy hứng) phải đặt theo
**bản chất** của nó, không được copy/đẻ lại trong nhiều feature (decision `0026`).

> Vì sao: trước rule này đã có 3 biến thể "stat card" lệch nhau (`StatCard` shared,
> `Stat` trong attendance, `ChildStat` trong parent) + status-badge styling lặp
> inline ở nhiều màn. Mỗi lần sửa design phải sửa nhiều chỗ, dễ drift, dễ lỗi.

## Cây quyết định nơi đặt (CỨNG)

Trước khi viết một component, hỏi theo thứ tự:

1. **Đây là customize/variant của MỘT primitive** (đổi style, thêm variant cho
   `Button`, `Badge`, `Input`… đúng design)?
   → Sửa **thẳng** trong `src/components/ui/<name>/` (shadcn "you own the code").
   Thêm `variant`/`size` vào chính file primitive — **KHÔNG** tạo file wrapper
   riêng trong feature, **KHÔNG** copy primitive ra chỗ khác. Cập nhật `.stories.tsx`
   của primitive đó với state mới.

2. **Đây là composed component** (ghép ≥2 primitive / có layout-pattern riêng,
   vd StatCard, Field = Input+Label, OTP input, DateField = Button+Popover+Calendar)
   **và đã/sắp dùng ở ≥2 screen**?
   → Đặt ở `src/components/shared/<name>/` (folder + `index.ts` + `.stories.tsx`),
   nhận data qua **props**. Đây là nhà chân lý dùng chung.

3. **Composed component nhưng hiện chỉ 1 screen dùng** và chưa chắc tái dùng?
   → Tạm để `src/features/<x>/presentation/<screen>/`. Nhưng **promote ngay** sang
   `components/shared/` khi screen thứ 2 cần — KHÔNG copy sang feature thứ 2.

| Bản chất | Nhà chân lý |
| --- | --- |
| Variant/style của 1 primitive (đúng design) | `components/ui/<name>/` (sửa tại chỗ) |
| Composed, dùng ≥2 screen | `components/shared/<name>/` |
| Composed, chỉ 1 screen (tạm) | `features/<x>/presentation/<screen>/` → promote khi share |
| Shell app (Sidebar/Header/Layout) | `components/layout/` |

`components/ui/` = primitive + variant của nó; **không** chứa business logic
cross-feature. Composed có logic dùng chung → `components/shared/`, không nhét vào `ui/`.

## Quy tắc cứng (cấm trùng lặp)

- **Một component = một nơi.** KHÔNG có hai bản cùng pattern (stat card, badge
  tone, field wrapper, toggle…) ở hai feature folder hoặc vừa `shared/` vừa feature.
- **Search trước khi viết.** Grep `components/ui`, `components/shared`,
  `features/*/presentation` tìm component/pattern đã có TRƯỚC khi tạo mới. Nếu đã
  có bản gần giống → tái dùng hoặc mở rộng API bản đó, không đẻ bản song song.
- **Cần khác design thật sự?** Nếu một screen cần bản "khác" có chủ đích (khác
  đúng theo design-spec) → mở rộng component dùng chung bằng **prop/variant**
  (vd `variant="compact"`), KHÔNG fork một component mới trùng tên/ý.
- **Promote, đừng copy.** Component feature-local cần ở screen thứ 2 → **di chuyển**
  về `components/shared/` rồi cả hai screen import từ đó. Không copy-paste.
- **Status chỉ-bằng-class lặp lại** (vd `bg-primary/12 text-primary`, map
  `STATUS_TONE`) là dấu hiệu thiếu component dùng chung → trích về `shared/` (vd
  `StatusBadge`) thay vì lặp inline mỗi màn.
- Mọi component mới ở `ui/`/`shared/` phải có `.stories.tsx` (state thường +
  error/empty/disabled khi áp dụng) và qua design-review gate (`docs/DESIGN_REVIEW.md`).

## Kiểm chứng (reviewer + architect)

- `fe-component-architect` grep tồn tại trước khi đề xuất component mới; chỉ rõ nhà
  chân lý theo cây quyết định trên.
- `fe-tech-lead-reviewer` chặn nếu thấy: (a) wrapper primitive đẻ trong feature thay
  vì variant trong `ui/`; (b) cùng pattern xuất hiện ≥2 nơi; (c) status styling lặp
  inline đáng lẽ là component `shared/`. Verdict = Revision Required.

## Liên quan

- Decision `0026` (component placement canonical).
- `.claude/rules/design-system.md` §Component patterns (tái dùng StatCard/Badge/…).
- `.claude/rules/tailwind-v4.md` (shadcn flow, customize variant tại `ui/<name>/`).
- `.claude/CLAUDE.md` §UI Components, §Hard Rules.
