# Bắt đầu

## Yêu cầu

Node ≥ 22.12 · pnpm 12 (`npx pnpm@12.4.1` cũng được, không cần cài toàn cục).

## Dựng dự án

```bash
npx fe-kit new kho-hang --platforms web,mobile
cd kho-hang
pnpm install
cp .env.example .env.local
pnpm dev
```

Mở http://localhost:3000. Trang chủ công khai nên chạy được ngay — chưa cần IdP nào.

## Ba file sửa đầu tiên

### 1. `shared/src/env.ts` — bảng môi trường

```ts
import { defineEnvironments } from 'fe-kit/config';

export const env = defineEnvironments(
  {
    uat:  { gateway: 'https://uat-gw.example.com',  ssoIssuer: '…', webOrigin: '…' },
    beta: { gateway: 'https://beta-gw.example.com', ssoIssuer: '…', webOrigin: '…' },
    prod: { gateway: 'https://gw.example.com',      ssoIssuer: '…', webOrigin: '…' },
  },
  { default: 'uat', overrides: { gateway: 'API_GATEWAY_URI' } },
);
```

Đổi môi trường bằng **một** biến `APP_ENV`. Mọi endpoint đi theo, nên không thể có chuyện
gateway trỏ beta còn SSO trỏ prod. Mặc định `uat` để không bao giờ vô tình chạy prod.

Endpoint là DNS công khai, không phải secret → nằm trong code, review cùng MR. Chỉ
`OIDC_CLIENT_SECRET` mới đi qua env.

`overrides` cho phép đè từng endpoint bằng biến môi trường — dùng khi một service chạy ở
local hoặc devtunnel. Khai tường minh; không có quy ước ngầm, vì biến gõ sai theo quy ước
ngầm thì im lặng không có tác dụng.

### 2. `shared/src/api.ts` — client

```ts
import { createHttpClient } from 'fe-kit/http';
import { env } from './env';

export function createApi(getToken?: () => string | null) {
  return createHttpClient({
    baseUrl: env.endpoint('gateway'),
    service: 'gateway',
    getToken,
  });
}
```

Client đã có sẵn: hạn chờ, bóc envelope `{data}` / `{data, page}`, lỗi RFC 9457 thành một
kiểu `HttpError` duy nhất, `X-Request-Id`, thử lại `GET` khi 502/503, và interceptor 401.
Đừng bọc thêm vòng thử lại của riêng bạn.

### 3. `shared/src/tokens.ts` — màu và thang

```ts
import { defineTokens } from 'fe-kit/ui';

export const tokens = defineTokens('light', { color: { primary: '#2563eb' } });
```

Trong code màn hình **không có mã màu, không có px cứng**. Thiếu token thì thêm vào đây.

## Nối đăng nhập SSO

Template đã dựng sẵn đủ vòng: `/api/auth/login` → IdP → `/api/auth/callback` →
`/api/auth/logout`, cộng `proxy.ts` tự refresh. Việc còn lại là điền
`ssoIssuer` trong bảng môi trường và `OIDC_CLIENT_SECRET` trong `.env.local`.

Đọc [api-contract.md](api-contract.md) trước khi thêm endpoint đầu tiên.

## Lệnh

```bash
pnpm dev · pnpm build · pnpm lint · pnpm type-check · pnpm verify
```

`type-check` **không** thay được `build`.
