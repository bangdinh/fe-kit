# Kiến trúc kit — quyết định code thuộc về đâu

[STRUCTURE.md](../STRUCTURE.md) nói về hình dạng của kit. Tài liệu này là thứ bạn mở ra
khi đang cầm một đoạn code và không biết đặt nó ở đâu.

## Một câu

**Kit giữ cơ chế. Sản phẩm giữ dữ liệu và màn hình.**

## Bảng quyết định

| Đoạn code trả lời câu hỏi | Thuộc về | Ví dụ |
|---|---|---|
| "gọi backend như thế nào" | kit `src/http` | bóc envelope, map lỗi, thử lại, timeout |
| "gọi backend NÀO" | dự án `shared/env.ts` | bảng URL theo môi trường |
| "đăng nhập theo giao thức nào" | kit `src/auth` | PKCE, JWKS, rotation refresh |
| "IdP nào, client id nào" | dự án `shared/` | discovery URL, client id |
| "công thức chấm quyền" | kit `src/access` | `∧` nằm trong `∃`, kế thừa theo cây |
| "có những action code nào" | dự án | union sinh từ OpenAPI |
| "phiên gồm những cookie nào" | kit `src/server` | bộ cookie, hạn, luật ghi theo bộ |
| "màu primary là gì" | dự án `shared/tokens.ts` | bảng màu thương hiệu |
| "vai trò màu nào có tồn tại" | kit `src/ui/tokens.ts` | `ColorTokens` |
| "một màn hình trông thế nào" | dự án `apps/*` | luôn luôn |

## Ba lớp của kit

```
types · config · logger        không phụ thuộc gì (ngoài nhau)
        ▲
http · access · auth           lõi — chạy mọi nền tảng
        ▲
server · ui                    có ràng buộc nền tảng
```

`server` và `ui` được import lõi. Lõi **không bao giờ** import ngược lên —
`scripts/check-layers.sh` fail nếu có.

## Thứ cố ý KHÔNG có trong kit

| Không có | Vì sao |
|---|---|
| Component UI | Xem [ADR 0003](adr/0003-ba-nen-tang-mot-loi.md) |
| `Result<T,E>` / Either | `camera-ai-platform` đã gỡ `@cap/domain` vì YAGNI cho FE. Ở FE, `throw` + một kiểu `HttpError` là đủ và ít nghi thức hơn. |
| Lớp state management | React Query / Zustand là lựa chọn của sản phẩm, và nó khác nhau giữa web (RSC) và mobile. Đo được ở camera: React Query **0 dòng** trong `apps/web`. |
| Lớp validate (zod…) | Lựa chọn của sản phẩm. Kit không ép, và cũng không khai peer để khỏi ghim version cho người khác. |
| Repository / use-case / port | Đo được ở camera: chỉ **2/13** feature đi qua use-case, phần còn lại là passthrough. Tầng đó ở FE thường là nghi thức chứ không phải cấu trúc. |
| i18n | next-intl (web) và i18n của RN khác nhau về cơ chế nạp; gói lại chỉ thành mẫu số chung vô dụng. Template có sẵn chỗ để cắm. |

Danh sách này quan trọng ngang danh sách những thứ CÓ. Thêm bất cứ mục nào vào kit cần
một ADR nói vì sao lần này khác.

## Một sự thật một chỗ

| Sự thật | Chỗ duy nhất |
|---|---|
| Endpoint | `shared/src/env.ts` của dự án |
| Bộ cookie phiên | `createSessionCookies` của kit, cấu hình một lần ở dự án |
| Luật bóc envelope | `dialect` gắn vào client |
| Mã màu | `shared/src/tokens.ts` |
| `console.*` | `src/logger/sinks.ts` — không nơi nào khác |
