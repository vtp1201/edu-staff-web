---
description: Scaffold một feature mới đúng theo Clean Architecture per-feature pattern
argument-hint: <feature-name>
---

# Add Feature: $ARGUMENTS

Tạo đầy đủ bộ folder cho feature `$ARGUMENTS` theo cấu trúc trong CLAUDE.md.

## Pre-check
1. Đọc `@CLAUDE.md` mục "Architecture" và "Quy tắc đặt tên file"
2. Kiểm tra `src/features/` xem đã có feature trùng tên chưa
3. Hỏi user: feature này có những entity nào, action chính nào (login, list, detail, create…)

## Files cần tạo

```
src/features/$ARGUMENTS/
├── domain/
│   ├── entities/$ARGUMENTS.entity.ts
│   ├── failures/$ARGUMENTS.failure.ts
│   ├── repositories/i-$ARGUMENTS.repository.ts
│   └── use-cases/<action>.use-case.ts          # 1 file per action
├── infrastructure/
│   ├── dtos/<action>-response.dto.ts
│   ├── mappers/$ARGUMENTS.mapper.ts
│   └── repositories/$ARGUMENTS.repository.ts   # implements i-$ARGUMENTS, 'server-only'
└── presentation/
    └── <component>/
        ├── <component>.i-vm.ts
        └── <component>.tsx                     # 'use client'

src/bootstrap/
├── di/$ARGUMENTS.di.ts                          # 'server-only', factory makeXxxUseCase()
└── endpoint/$ARGUMENTS.endpoint.ts              # const $ARGUMENTS_EP = { … } as const
```

## Bắt buộc nhớ
- `infrastructure/` và `bootstrap/di/`: dòng đầu file phải là `import 'server-only'`
- Repository implementation cast: `(await this.http.post(EP.x, body)) as unknown as XDto`
- DI factory return instance MỚI mỗi lần gọi (per-request)
- `bootstrap/di/index.ts` re-export factory mới
- `bootstrap/endpoint/index.ts` re-export endpoint constants mới
- I18n keys cho feature này → thêm vào `bootstrap/i18n/messages/{vi,en}.json` cùng lúc

## Sau khi tạo xong
1. Chạy `bun lint:fix`
2. Chạy `bunx tsc --noEmit` để check types
3. Output summary: files đã tạo, layer ảnh hưởng, todo còn lại