# ADR 0002 — Ship source TypeScript, không ship `dist`

**Ngày:** 2026-09-13 · **Trạng thái:** chấp nhận

## Bối cảnh

`qc-kit` build sang `dist/` rồi ship. Kit này thì không — và đó là khác biệt có chủ đích,
không phải quên.

Kit chứa code chạy trong React Server Components. Ranh giới RSC được đánh dấu bằng
**directive chuỗi ở đầu file** (`'use client'`, `'use server'`). Cho một bước biên dịch
đứng giữa kit và bundler là thêm một chỗ những directive đó có thể bị dời, bị gộp hoặc bị
nuốt — và khi hỏng, lỗi hiện ra ở dự án tiêu thụ dưới dạng khó truy nhất: component chạy
sai phía.

## Quyết định

`exports` trỏ thẳng vào `src/*.ts`. Dự án tiêu thụ khai:

```ts
// next.config.ts
transpilePackages: ['fe-kit']
```

## Vì sao

- Không có bước build nào để hỏng. Đây cũng đúng cách `camera-ai-platform` đang chạy
  (`"main": "./src/index.ts"` ở cả 10 package) — một cách làm đã chạy thật cả năm.
- Người dùng kit nhảy thẳng vào source kèm chú thích khi debug, không qua source map.
- Không phải nuôi hai cấu hình build (ESM/CJS, `.d.ts`).

## Cái giá — và nó đã phát sinh thật

Kit được **type-check bằng tsconfig của dự án tiêu thụ**. Nên kit không được phép phụ
thuộc vào cấu hình mà dự án có thể không có:

- không `@types/node` (app React Native không khai `types: ["node"]`) → đọc `process` qua
  `globalThis`;
- không `lib: ["DOM"]` → không dùng `RequestCache`, `Crypto` mà khai kiểu theo hình dạng.

Cả hai lỗi này do `example/apps/mobile` bắt được, sau khi kit đã tự type-check xanh.
Đó chính là lý do `example/` phải có đủ ba nền tảng.

## Đổi ý khi nào

Có consumer không dùng bundler (thư viện Node thuần dùng kit), hoặc thời gian build của
consumer tăng đáng kể đo được.
