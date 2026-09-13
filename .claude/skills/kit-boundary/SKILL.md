---
name: kit-boundary
description: Dùng khi thêm hoặc sửa code trong src/ của kit — thứ này thuộc kit hay thuộc sản phẩm, đặt ở subpath nào, có được import react/next/antd không. Trigger khi "thêm vào kit", "đặt ở subpath nào", "kit có nên", "sản phẩm cần", "import next", "chạy trên React Native".
---

# Ranh giới của kit

## Câu hỏi lọc, hỏi trước mọi thứ khác

**Thay đổi này đến từ SẢN PHẨM, hay đến từ cách cả nhóm làm frontend?**

- Từ sản phẩm → **không thuộc repo này**. Viết ở `shared/` của dự án tiêu thụ.
- Từ cách làm việc → thuộc kit, đi tiếp.

Dấu hiệu rò rỉ mạnh nhất: phải sửa `src/` của kit để một sản phẩm chạy được.

## Đặt ở subpath nào

| Thứ bạn thêm | Subpath |
|---|---|
| Kiểu mô tả dây của gokit | `types` |
| Đọc cấu hình, hạn chờ | `config` |
| Liên quan tới ghi log | `logger` |
| Gọi HTTP, bóc vỏ, map lỗi | `http` |
| Chấm quyền | `access` |
| OIDC, token, phiên ở mức giao thức | `auth` |
| Cookie/proxy của Next | `server` ← chỉ ở đây mới được import `next/*` |
| Theme, CSS variable | `ui` ← chỉ ở đây mới được import `antd`/`react` |
| Bảng token thuần | `tokens` |

## Ba luật cho mọi file ngoài `src/server` và `src/ui`

Kit ship SOURCE nên nó được type-check bằng tsconfig của dự án tiêu thụ — trong đó có app
React Native. Nên trong lõi:

1. **Không viết chữ `process`.** Dùng `rawEnv` / `nodeEnv` / `processEnv` của `src/config/env.ts`.
2. **Không dùng kiểu của `lib: ["DOM"]`** (`RequestCache`, `Crypto`, `HeadersInit`…).
   Khai theo hình dạng — xem `CryptoLike` trong `src/auth/pkce.ts`.
3. **Không import `react`, `antd`, `next/*`.**

Cả ba do `example/apps/mobile` bắt được sau khi kit đã tự type-check xanh. Đó là lý do
`make verify` phải chạy `example-check`, không chỉ `typecheck`.

## Thêm điểm nối, KHÔNG thêm nhánh `if`

Kit không bao giờ rẽ theo tên sản phẩm hay cờ môi trường. Khuôn có sẵn, bắt chước nó:

1. khai một **hợp đồng** (`Dialect`, `LogSink`, `TreeReader`, `SessionCookieNames`);
2. ship một **mặc định** hợp lý (`gokitDialect`, `prettySink`, `defaultTokens`);
3. cho **ghi đè** qua options.

## Trước khi báo xong

```bash
make verify
```

Đụng `files` / `exports` / `bin` của package.json thì chạy thêm `make smoke` — workspace
che mất lớp lỗi đó.
