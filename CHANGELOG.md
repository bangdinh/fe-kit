# Changelog

Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/).
Pre-1.0: **minor là phá vỡ**, patch là tương thích ngược.

## [Unreleased]

## [0.1.1] — 2026-10-09

Hợp đồng gokit: **v0.8.7** (`contract/gokit-source.json`).

### Phá vỡ

- **`codeFromStatus(502)`** trả `SERVICE_UNAVAILABLE` thay vì `INTERNAL_ERROR`, theo luật
  của gokit. Chỉ ảnh hưởng backend không trả `code`. Cách sửa: chỗ nào bắt
  `INTERNAL_ERROR` để hiện "thử lại sau" thì bắt thêm `SERVICE_UNAVAILABLE`.
- **`FieldError`**: `code` thành optional, `reason` thành bắt buộc — đúng như gokit gửi
  (bản cũ khai ngược). Cách sửa: chỗ đọc `fieldError.code` phải xử lý `undefined`.
- **`envelopeDialect`**: thành công mà `data()` trả `undefined` (body thiếu khoá, hoặc
  không phải object) giờ là lỗi `INTERNAL_ERROR`, như `gokitDialect`. Bản cũ trả
  `data: undefined` im lặng. Cách sửa: endpoint thành công thật sự không có dữ liệu thì
  khai `data: (b) => (b as { data?: unknown })?.data ?? null` cho phương ngữ đó; `null` là
  dữ liệu.

### Thêm

- `src/types/contract.gen.ts` sinh từ hợp đồng gokit (`make contract-sync GOKIT_REF=<tag>`);
  `make verify` fail khi file sinh ra lệch khỏi JSON đã vendor.
- `fe-kit/types` xuất thêm `GOKIT_DEFAULT_LIMIT`, `GOKIT_MAX_LIMIT`, `GOKIT_HEADERS`,
  `GOKIT_PROBLEM_CONTENT_TYPE`, `GOKIT_CONTRACT_SOURCE`.
- `createSessionProxy`: `origin(req)` cho build standalone sau ingress (`req.url` là
  `0.0.0.0:8080`), `loginPath` nhận hàm (tiền tố locale), `next(req)` để nối next-intl
  hoặc chặn thêm theo nghiệp vụ. `safeInternalPath` cho `returnTo`.
- `make release` theo khuôn gokit: in trước mục CHANGELOG (`DRY=1`), sinh mục từ commit khi
  `[Unreleased]` rỗng, sinh lại `example/` sau khi bump, annotated tag mang release notes.
  `make verify-tag` nghiệm thu tag đã push bằng CLI của chính tag và cài kit từ GitHub.
- `defineEnvironments({ readEnv })` — nguồn đọc biến do sản phẩm cấp, cho nơi đọc động
  `process.env` không với tới (client bundle của Next/Expo, renderer Electron).

### Sửa

- **logger**: sink ném lỗi không còn ném ra chỗ gọi (request 200 từng thành lỗi status 0),
  và `prettySink` không còn ném `URIError` khi path bị cắt giữa escape `%xx`. Hai bản vá
  camera-ai-platform làm sau ngày tách kit.
- **server**: `createSessionProxy` không còn redirect Server Action (React ném
  "unexpected response"); ghi token vừa refresh vào cả request để Server Component cùng
  lượt thấy token mới; dọn cookie phiên khi chỉ còn tenant/realm sót lại.
- **template web**: cookie `oidc_tx` sống 1800s thay vì 600s, khớp "Login timeout" của
  Keycloak; 600s làm hỏng bước cài 2FA lần đầu.
- **template web**: route login chặn được `returnTo=/\evil.com` (bản cũ chỉ chặn `//`).
- **auth**: `decodeJwtPayload` giữ đúng claim UTF-8 (tên tiếng Việt). Bản cũ dùng `atob`
  nên mỗi byte thành một ký tự.

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
