---
name: fe-architecture
description: Dùng khi thêm code vào dự án này — đặt file ở đâu, luật import giữa shared/apps, cái gì thuộc kit và cái gì thuộc sản phẩm. Trigger khi "thêm feature", "thêm trang", "đặt file ở đâu", "gọi API", "sửa theme", "thêm màu", "import từ đâu".
---

# Đặt code ở đâu

Dự án này dựng trên **fe-kit**. Luật một câu: **kit giữ CƠ CHẾ, dự án giữ DỮ LIỆU
và MÀN HÌNH.** Sửa được ở dự án thì không sửa kit.

## Thêm gì → đặt đâu

| Thêm | Đặt ở | Không đặt ở |
|---|---|---|
| URL/endpoint mới | `shared/src/env.ts` (bảng môi trường) | rải rác trong code, `.env` |
| Lời gọi API mới | `shared/src/api.ts` | `fetch()` trong component |
| Màu / spacing / font | `shared/src/tokens.ts` | inline style, CSS hardcode |
| Màn hình web | `apps/web/src/app/**` | `shared/` |
| Logic dùng chung 2+ nền tảng | `shared/src/` | copy sang từng app |
| Thứ mọi DỰ ÁN đều cần | đề xuất vào kit (xem `docs/` của kit) | `shared/` của một dự án |

## Luật import — một chiều

```
apps/web · apps/mobile · apps/desktop
        │ (được import)
        ▼
   @example/shared  ──►  fe-kit/*
```

`shared/` KHÔNG BAO GIỜ import từ `apps/`. Thấy mình cần làm thế nghĩa là thứ đó
thuộc về app, không phải shared.

Ba subpath của kit có ràng buộc nền tảng:

| Subpath | Chạy ở |
|---|---|
| `fe-kit`, `fe-kit/http`, `/access`, `/auth`, `/logger`, `/config`, `/types`, `/tokens` | mọi nơi |
| `fe-kit/server` | CHỈ phía server của Next (route handler, middleware, Server Action) |
| `fe-kit/ui` | CHỈ web (React DOM + antd). React Native dùng `fe-kit/tokens`. |

## Thứ tự dựng một trang web mới

1. Endpoint vào `shared/src/env.ts` nếu là service mới.
2. Hàm gọi API + kiểu dữ liệu vào `shared/src/api.ts`.
3. Trang ở `apps/web/src/app/<đường-dẫn>/page.tsx` — Server Component, gọi API ở đây.
4. Phần tương tác tách ra file riêng có `'use client'`.
5. Cần phiên thì để middleware lo — đừng tự kiểm tra cookie trong trang.

## Không bao giờ

- `fetch()` thẳng trong component. Đi qua client của `shared/src/api.ts` —
  nếu không sẽ mất timeout, mất retry, mất log, mất xử lý 401.
- Mã màu hoặc px cứng trong JSX. Thiếu token thì thêm vào `tokens.ts`.
- Đọc `process.env` trong component client. Biến môi trường đọc ở `env.ts`.
- Import `fe-kit/server` từ client component — nó kéo `next/server` vào bundle trình duyệt.

## Trước khi báo xong

```bash
pnpm lint && pnpm type-check && pnpm build
```

`type-check` KHÔNG thay được `build`: ranh giới server/client, typed routes và
việc tuần tự hoá prop server→client chỉ lộ ra lúc build.
