# Example — Engineering Guide

> Nạp vào MỌI prompt → giữ mỏng. Chi tiết theo chủ đề để ở `docs/`;
> luật để hành động ở `.claude/skills/` (tự kích hoạt, body chỉ nạp khi dùng).

## Fact chống-đoán-sai

1. **Dự án này dựng trên `fe-kit`, pin theo tag.** Cơ chế (HTTP, auth, phân
   quyền, log, token) nằm ở kit. Đừng dựng lại thứ kit đã có; kiểm bằng cách đọc
   `node_modules/fe-kit/README.md` trước khi viết một helper mới.
2. **Backend KHÔNG nằm trong repo này.** Tầng Node của web (route handler,
   Server Action, middleware) là BFF: giữ `client_secret`, quản cookie phiên,
   map payload → view-model. **Phán quyết cuối, kể cả phân quyền, là của backend.**
3. **Endpoint không đi qua `.env`.** Chúng nằm ở `shared/src/env.ts` và được
   chọn bằng một biến `APP_ENV`. Chỉ secret mới qua env.
4. **`fe-kit/server` và `fe-kit/ui` có ràng buộc nền tảng** — xem skill
   `fe-architecture`. Import sai chỗ thì lỗi chỉ hiện lúc build hoặc lúc chạy trên máy thật.

## Cấm

```
✗ fetch() trong React component        ✗ mã màu / px cứng trong JSX
✗ shared/ import từ apps/              ✗ endpoint hardcode ngoài env.ts
✗ console.* (dùng createLogger)        ✗ fe-kit/server trong client component
```

## Lệnh

```bash
pnpm lint && pnpm type-check && pnpm build && pnpm test
```

`type-check` không thay được `build`.

## Ba luật không được quên

1. **Đo trước khi khẳng định — và kiểm lại chính phép đo.** Nghi ngờ thì `grep`,
   đừng trích tài liệu. Bug thật thì tái lập được VÀ giải thích được bằng source.
2. **Một sự thật một chỗ.** Endpoint → `shared/src/env.ts`; token giao diện →
   `shared/src/tokens.ts`; cookie phiên → `apps/web/src/lib/session.ts`.
3. **Agent commit được, push thì không.** Sửa file, tạo nhánh, `git commit` theo
   quy ước repo. `git push` là việc của dev — đưa lệnh hoàn chỉnh để dev chạy.
