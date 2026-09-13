---
name: fe-architecture
description: Dùng khi thêm hoặc di chuyển code trong dự án này — đặt file ở đâu, shared hay app, server hay client, được import gì từ đâu, và thứ nào kit đã có sẵn. Trigger khi "thêm feature", "thêm trang", "đặt file ở đâu", "gọi API", "use client", "Server Action", "sửa theme", "thêm màu", "import từ đâu", "shared hay app".
---

# Kiến trúc {{title}}

Dự án dựng trên **fe-kit** (pin theo tag). Luật một câu:
**kit giữ CƠ CHẾ · `shared/` giữ DỮ LIỆU của sản phẩm · `apps/` giữ MÀN HÌNH.**

Sửa được ở dự án thì không sửa kit. Phải sửa kit để sản phẩm chạy được nghĩa là ranh giới
đã rò rỉ — đọc `docs/extension-points.md` của kit trước khi fork.

## 1. Thêm gì → đặt đâu

| Thêm | Đặt ở | KHÔNG đặt ở |
|---|---|---|
| URL / endpoint của một service | `shared/src/env.ts` | `.env`, hằng số rải rác |
| Hàm gọi API + kiểu dữ liệu của nó | `shared/src/api.ts` | `fetch()` trong component |
| Màu · spacing · radius · font | `shared/src/tokens.ts` | inline style, CSS hardcode |
| Kiểu dữ liệu dùng ở ≥ 2 app | `shared/src/` | copy sang từng app |
| Trang web | `apps/web/src/app/**` | `shared/` |
| Component chỉ một app dùng | cạnh trang dùng nó | `shared/` |
| Cookie phiên, cấu hình OIDC | `apps/web/src/lib/session.ts` | rải ra từng route |
| Thứ **mọi dự án** đều cần | đề xuất lên kit (MR ở repo kit) | `shared/` của dự án này |

## 2. `shared/` hay `apps/`? — luật hai-người-dùng

Chỉ đưa vào `shared/` khi **đã có hai app thật sự dùng**, hoặc khi nó là *dữ liệu của sản
phẩm* (env, token, hợp đồng API) — ba thứ đó thuộc `shared/` ngay từ đầu vì chúng phải có
đúng một bản.

Đoán trước "sau này mobile sẽ cần" rồi đẩy lên `shared/` là cách nhanh nhất để có một API
dùng chung được thiết kế cho đúng một người dùng. Để ở app, chuyển lên khi người thứ hai
xuất hiện — lúc đó mới biết cái gì thật sự chung.

## 3. Luật import — một chiều

```
apps/web · apps/mobile · apps/desktop
        │ được import
        ▼
   @{{name}}/shared  ──►  fe-kit/*
```

`shared/` **không bao giờ** import từ `apps/`. Cần thế nghĩa là thứ đó thuộc về app.

Subpath của kit có ràng buộc nền tảng — import sai chỗ thì lỗi chỉ lộ lúc build hoặc lúc
chạy trên máy thật:

| Subpath | Next server | Next client | React Native | Electron renderer |
|---|:---:|:---:|:---:|:---:|
| `fe-kit`, `/http`, `/access`, `/auth`, `/logger`, `/config`, `/types`, `/tokens` | ✓ | ✓ | ✓ | ✓ |
| `fe-kit/server` | ✓ | ✗ | ✗ | ✗ |
| `fe-kit/ui` | ✓ | ✓ | ✗ | ✓ |

React Native dùng `fe-kit/tokens` (bảng token thuần), **không** dùng `fe-kit/ui`.

## 4. Ranh giới server/client của Next — chỗ sai nhiều nhất

Mọi thứ trong `app/` là **Server Component** cho tới khi có `'use client'`.

| Việc | Chạy ở | Viết ở |
|---|---|---|
| Đọc dữ liệu để render trang | server | thẳng trong `page.tsx` (async) |
| Người dùng bấm nút rồi mới gọi API | server, qua client | `'use server'` trong `actions.ts`, client gọi nó |
| Trạng thái UI, sự kiện, hook | client | file riêng có `'use client'` |
| OIDC callback, webhook | server | `app/api/**/route.ts` |
| Giữ token, đọc cookie phiên | **chỉ server** | `lib/session.ts` |

Ba luật rút ra:

- **Client component KHÔNG import `fe-kit/server`** — nó kéo `next/server` vào bundle
  trình duyệt. Cần dữ liệu phiên thì nhận qua prop từ server, hoặc gọi Server Action.
- **Không `fetch()` trong client component.** Token nằm ở cookie httpOnly, client không
  đọc được; và gọi thẳng là mất timeout, retry, log, xử lý 401 của kit.
- **Prop từ server sang client phải tuần tự hoá được.** Hàm, `Map`, `Set`, instance class
  không đi qua ranh giới đó — và lỗi chỉ hiện lúc **build**, không hiện lúc `type-check`.

## 5. Thứ tự dựng một tính năng web

1. Endpoint mới → thêm vào bảng ở `shared/src/env.ts`.
2. Hàm gọi API + kiểu dữ liệu → `shared/src/api.ts`. Danh sách dùng `api.list<T>()`,
   tài nguyên đơn dùng `api.get<T>()`.
3. Trang → `apps/web/src/app/<đường-dẫn>/page.tsx`, **Server Component**, gọi API ngay ở đó.
4. Phần tương tác → tách ra file riêng có `'use client'`, nhận dữ liệu qua prop.
5. Thao tác ghi do người dùng kích hoạt → `actions.ts` có `'use server'`.
6. Trang cần đăng nhập → **không tự kiểm cookie**; để `proxy.ts` lo, chỉ cần đặt đường dẫn
   ngoài danh sách `PUBLIC`.
7. Phân quyền → `can()` để gác menu/vào trang, `canOn()` cho thao tác trên một resource cụ
   thể. **Gác ở UI không phải bảo mật** — backend vẫn là trọng tài cuối.

## 6. Kit đã có — đừng dựng lại

Trước khi viết một helper, soi bảng này:

| Định viết | Đã có |
|---|---|
| wrapper `fetch`, retry, timeout | `createHttpClient` (`fe-kit/http`) |
| hàm bắt lỗi API, đọc message | `HttpError` · `hasErrorCode` · `e.fieldErrors` · `e.traceId` |
| parse envelope `{data}` / phân trang | client làm sẵn; `api.list()` trả `Page<T>` |
| adapter cho service trả envelope lạ | `envelopeDialect` |
| luồng đăng nhập OIDC, refresh token | `fe-kit/auth` + `lib/session.ts` đã dựng đủ vòng |
| đọc/ghi cookie phiên | `sessionCookies` — ghi/xoá **theo bộ**, đừng set lẻ |
| logger, che token trong log | `createLogger` (`fe-kit/logger`) |
| hàm chấm quyền | `can` · `canOn` · `buildAccessProfile` (`fe-kit/access`) |
| đọc biến môi trường an toàn | `envVar` · `envFlag` · `envNumber` (`fe-kit/config`) |
| bảng màu / thang spacing | `defineTokens` → `shared/src/tokens.ts` |

Đọc `node_modules/fe-kit/README.md` khi không chắc.

## 7. Không bao giờ

- `fetch()` thẳng trong component.
- Mã màu hoặc px cứng trong JSX — thiếu token thì **thêm vào `tokens.ts`**.
- Endpoint hardcode ngoài `shared/src/env.ts`.
- `console.*` — dùng `createLogger`.
- `shared/` import từ `apps/`.
- `fe-kit/server` trong client component.
- Đọc `process.env` trong component client.
- Sửa ba skill do kit phát hành (`fe-architecture`, `api-contract`, `git-flow`) — nâng cấp
  kit là mất. Cần khác thì thêm skill riêng của dự án.

## 8. Trước khi báo xong

```bash
pnpm lint && pnpm type-check && pnpm build
```

**`type-check` không thay được `build`.** Ranh giới server/client, typed routes và việc
tuần tự hoá prop server→client chỉ lộ ra lúc build.
