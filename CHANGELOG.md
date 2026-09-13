# Changelog

Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/).
Pre-1.0: **minor là phá vỡ**, patch là tương thích ngược.

## [0.1.0] — 2026-09-13

Bản đầu. Bóc từ `camera-ai-platform` phần dùng chung được; giữ lại phần dính sản phẩm ở đó.

### Thêm

- **`fe-kit/config`** — `defineEnvironments` (bảng môi trường của sản phẩm, chọn bằng một
  biến `APP_ENV`, đè được từng endpoint), `envVar`/`envFlag`/`envNumber`, `timeoutSignal`.
- **`fe-kit/http`** — `createHttpClient`: bóc envelope gokit `{data}` / `{data, page}`,
  lỗi RFC 9457 thành một kiểu `HttpError` duy nhất, `X-Request-Id`, hạn chờ bắt buộc, thử
  lại `GET` khi 502/503, interceptor 401 kèm "chờ ân hạn". `envelopeDialect` để khai
  phương ngữ cho service không theo chuẩn.
- **`fe-kit/auth`** — OIDC Authorization Code + PKCE, JWKS có cache theo realm,
  `refreshTokens` có khoá chống hai lời gọi song song cùng một refresh_token, RP-Initiated
  Logout, đọc JWT không verify cho Edge.
- **`fe-kit/access`** — `can` / `canOn` / `buildAccessProfile` / `indexFromTree`. Generic
  theo tập action code của sản phẩm.
- **`fe-kit/server`** — `createSessionCookies` (ghi/xoá theo BỘ), `createSessionProxy`
  (refresh trong `proxy.ts` của Next 16, bỏ qua request prefetch).
- **`fe-kit/logger`** — log có cấu trúc, tự che secret, block HTTP kèm `curl` replay được,
  sink thay được.
- **`fe-kit/types`** — `Envelope` · `Page` · `ProblemDetails` · 15 mã lỗi gokit.
- **`fe-kit/ui`** · **`fe-kit/tokens`** — hợp đồng design token, `createAntdTheme`,
  `cssVariables`. Kit không xuất component nào.
- **Generator** `fe-kit new <tên> --platforms web,mobile,desktop` — sinh monorepo
  pnpm + turbo, đủ vòng đăng nhập OIDC, và ba skill cho agent.
- **`example/`** sinh từ chính template, CI build cả ba nền tảng.

### Ghi chú nâng cấp

Chưa có gì để nâng cấp. Dự án đầu tiên pin `#v0.1.0`.
