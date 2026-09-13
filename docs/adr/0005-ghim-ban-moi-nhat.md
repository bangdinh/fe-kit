# ADR 0005 — Ghim bản mới nhất của toàn bộ stack (2026-09-13)

**Ngày:** 2026-09-13 · **Trạng thái:** chấp nhận

## Quyết định

| | camera-ai-platform | fe-kit v0.1.0 |
|---|---|---|
| next | 15.3.4 | **16.3.5** |
| react | 19.1 | **19.3.0** |
| antd | 6.5.1 | **6.6.3** |
| typescript | 5.8.3 | **7.0.2** |
| pnpm | 9.12.3 | **12.4.1** |
| vitest | 2.0 | **5.0.0** |
| expo | 53 | **57.0.22** |
| electron | 31 | **44.3.0** |
| turbo | 2.5.4 | 2.10.12 |
| oxlint | 1.77 | 1.82 |

## Ba thứ đã phát sinh thật khi làm

1. **TypeScript 7 bỏ `moduleResolution: node10`.** Cấu hình biên dịch tiến trình main của
   Electron phải đổi sang `module: node18` / `moduleResolution: node16`. Đã sửa trong
   template; không ảnh hưởng `src/` của kit.
2. **Next 16 đổi tên quy ước `middleware.ts` → `proxy.ts`.** Kit đặt tên hàm theo tên mới
   (`createSessionProxy`), template sinh ra `apps/web/src/proxy.ts`. Build không còn cảnh
   báo deprecation.
3. **pnpm 12 có chính sách supply-chain `minimumReleaseAge`.** `zod@4.6.4` publish trước
   đó 15 giờ bị CHẶN cài. Cách xử: **không nới chính sách** — kit chưa dùng zod nên gỡ
   hẳn khỏi dependency. Bài học đi kèm: "mới nhất" đôi khi mới hơn cả cửa an toàn của
   trình quản lý gói; dự án tiêu thụ gặp cảnh này thì hạ đúng một patch, đừng tắt chính sách.

## Vì sao chọn mới nhất dù có rủi ro

Kit là nền của nhiều dự án chưa ra đời. Ghim stack cũ nghĩa là mọi dự án mới sinh ra đã
nợ sẵn một đợt nâng cấp. Đợt nâng đó chỉ càng đắt theo thời gian.

## Điều kiện để hạ version

`make verify` đỏ ở đúng một gói. Khi đó: hạ **một** major của **riêng** gói đó, ghi vào
đây, và không đụng tới hợp đồng của kit — hợp đồng không phụ thuộc số version.

## Điểm rủi ro còn mở

TypeScript 7 là bản viết lại bằng Go. Hôm nay toàn bộ `src/` + 3 app mẫu type-check sạch
với nó. Nếu sau này gặp lệch kiểu ở generic nặng của antd hoặc ở thư viện validate, hạ về
6.x là đường lùi — `tsconfig` không dùng tính năng nào riêng của 7.
