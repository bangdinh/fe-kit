# Nền tảng — cái gì chạy ở đâu

Kit phục vụ ba nền tảng trên một lõi. Bảng này là hợp đồng; `scripts/check-layers.sh` là
thứ giữ cho nó đúng.

## Bảng

| Subpath | Next server | Next client | Expo / React Native | Electron renderer |
|---|:---:|:---:|:---:|:---:|
| `fe-kit` (barrel), `/types`, `/config`, `/logger`, `/http`, `/access`, `/auth`, `/tokens` | ✓ | ✓ | ✓ | ✓ |
| `fe-kit/server` | ✓ | ✗ | ✗ | ✗ |
| `fe-kit/ui` | ✓ | ✓ | ✗ | ✓ |

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

## React Native cần polyfill gì

`fe-kit/auth` dùng Web Crypto cho PKCE. Hermes không có sẵn `crypto.subtle` — cài polyfill
(`expo-crypto`, `react-native-get-random-values`) trước khi dùng luồng đăng nhập trên
mobile. Thiếu thì kit ném lỗi nói thẳng điều đó, thay vì để nó nổ thành
`undefined is not an object`.

## Electron

Tiến trình main là CommonJS; tiến trình renderer là web bình thường và dùng được
`fe-kit/ui`. Template dựng sẵn `contextIsolation: true`, `nodeIntegration: false` và một
preload có bề mặt hẹp — mỗi thứ thêm vào preload là một quyền renderer có thật.

## Nền tảng mới

Thêm một nền tảng KHÔNG có nghĩa là thêm một subpath. Trước hết hỏi: thứ cần thêm là *cơ
chế* (vào lõi) hay *cách nối cơ chế vào một nền tảng* (vào một subpath có ràng buộc, như
`server`/`ui`)? Đa số rơi vào vế sau.
