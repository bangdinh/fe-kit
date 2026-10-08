# Nền tảng — cái gì chạy ở đâu

Kit phục vụ ba nền tảng trên một lõi. Bảng này là hợp đồng; `scripts/check-layers.sh` là
thứ giữ cho nó đúng.

## Bảng

| Subpath | Next server | Next client | Expo / React Native | Electron renderer |
|---|:---:|:---:|:---:|:---:|
| `fe-kit` (barrel), `/types`, `/config`, `/logger`, `/http`, `/access`, `/tokens` | ✓ | ✓ | ✓ | ✓ |
| `fe-kit/auth` — `decodeJwtPayload`, `isJwtExpired`, `refreshTokens` | ✓ | ✓ | chưa đo | ✓ |
| `fe-kit/auth` — luồng đăng nhập (`startLogin`, `completeLogin`) | ✓ | — | ✗ (xem dưới) | chưa đo |
| `fe-kit/server` | ✓ | ✗ | ✗ | ✗ |
| `fe-kit/ui` | ✓ | ✓ | ✗ | ✓ |

"—" là không dùng ở đó: luồng đăng nhập web chạy trong route handler (giữ `verifier` trong
cookie httpOnly), không chạy ở client component. Ô "chưa đo" nghĩa là đúng như vậy: `example/apps/mobile` không import `fe-kit/auth`, nên
chưa có gì chứng minh nó chạy trên Hermes.

`/config` ở trình duyệt, bản release mobile và renderer Electron: đọc động `process.env`
ra `undefined` (bundler chỉ nhúng `process.env.X` viết thẳng; renderer Electron không có
`process`). Khai `readEnv` cho `defineEnvironments` ở các nơi đó.

## Ba luật để lõi giữ được cột "React Native"

Kit ship **source** (xem [ADR 0002](adr/0002-ship-source-khong-ship-dist.md)), nên nó được
type-check bằng tsconfig của dự án tiêu thụ. Trong mọi module lõi:

1. **Không viết chữ `process`.** Đọc qua `globalThis`:
   ```ts
   import { rawEnv, nodeEnv } from 'fe-kit/config';
   ```
   App RN không khai `types: ["node"]`; viết thẳng `process` là lỗi biên dịch nằm trong
   `node_modules` — chỗ người dùng kit không sửa được.

2. **Không dùng kiểu của `lib: ["DOM"]`.** `RequestCache`, `Crypto`, `HeadersInit`… đều
   không có khi tsconfig không nạp DOM. Khai theo hình dạng (xem `CryptoLike` ở
   `src/auth/pkce.ts`) hoặc bằng union chuỗi.

3. **Không import `react`, `antd`, `next/*`.**

Cả ba đều do `example/apps/mobile` bắt được **sau khi** kit đã tự type-check xanh. Đó là
lý do example phải có đủ ba nền tảng chứ không chỉ web.

## Luồng đăng nhập trên React Native: chưa có

Ba chỗ chặn, đo ở camera-ai-platform ngày 2026-10-08. Polyfill không gỡ được chỗ nào:

1. `generatePkce` cần `crypto.subtle`. `expo-crypto` chỉ có `subtle` ở bản web
   (`ExpoCrypto.web.js`), `react-native-get-random-values` chỉ có `getRandomValues`.
2. `completeLogin` gọi cứng `verifyToken` của jose, không có chỗ tiêm verifier khác; jose
   không chạy trên Hermes.
3. Body token dựng bằng `URLSearchParams`; camera ghi nhận Hermes gửi sai body này
   (Keycloak trả `invalid_request`) và tự encode form thành chuỗi.

Camera chạy luồng native bằng bản riêng trong `@cap/auth/native` (port crypto, verifier,
token store, browser tiêm vào). Đưa nhánh đó vào kit là việc có kế hoạch riêng — xem
[adoption-camera-ai-platform.md](adoption-camera-ai-platform.md).

## Electron

Tiến trình main là CommonJS; tiến trình renderer là web bình thường và dùng được
`fe-kit/ui`. Template dựng sẵn `contextIsolation: true`, `nodeIntegration: false` và một
preload có bề mặt hẹp — mỗi thứ thêm vào preload là một quyền renderer có thật.

## Nền tảng mới

Thêm một nền tảng KHÔNG có nghĩa là thêm một subpath. Trước hết hỏi: thứ cần thêm là *cơ
chế* (vào lõi) hay *cách nối cơ chế vào một nền tảng* (vào một subpath có ràng buộc, như
`server`/`ui`)? Đa số rơi vào vế sau.
