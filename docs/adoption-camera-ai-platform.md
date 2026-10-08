# Kế hoạch triển khai: camera-ai-platform chuyển sang fe-kit

| | |
|---|---|
| Status | In progress — P0 xong phần kit làm được ngay; P1 đang thí điểm `@cap/logger` |
| Date | 2026-10-08 |
| Scope | camera-ai-platform (web, mobile, desktop) + fe-kit |
| Related | [gokit-source-of-truth.md](gokit-source-of-truth.md) · [architecture.md](architecture.md) · [extension-points.md](extension-points.md) · [platforms.md](platforms.md) |

## 1. Context

Chuỗi nguồn chân lý mà hai kế hoạch này dựng:

```
b2b-gokit  ──hợp đồng REST──►  fe-kit  ──cơ chế FE──►  camera-ai-platform, dự án sau
(gokit-source-of-truth.md)                            (tài liệu này)
```

fe-kit được tách từ camera-ai-platform ngày 2026-09-13, nhưng camera chưa dùng lại kit.
Đo ngày 2026-10-08:

| Mục | camera-ai-platform | fe-kit |
|---|---|---|
| Phụ thuộc fe-kit | không có | — |
| Package riêng | 12 package `@cap/*`, khoảng 20.500 dòng (không tính test) | 9 subpath |
| Next | `^15.3.4`, `middleware.ts` | peer `>=16` (optional), template dùng `proxy.ts` |
| Expo / React Native | `~53` / `0.79.6` | template `^57` / `0.87.1` |
| Electron | `^31`, `electron-vite ^2` | template `^44`, `vite ^8` |
| TypeScript / pnpm | `5.9.3` / `9.12.3` | `7.0.2` / `12.4.1` |
| Skill `api-contract`, `fe-architecture`, `git-flow` | bản riêng, đã khác bản kit phát hành | phát hành qua template |

Ba phép đo quyết định cách làm:

- **TypeScript không phải rào cản.** `tsc 5.9.3` của camera type-check toàn bộ `src/` của kit
  không lỗi.
- **Camera đang được phát triển dày.** 316 commit trong 14 ngày (2026-09-24 → 2026-10-08),
  khoảng 5 người. Một MR thay toàn bộ `@cap/*` sẽ xung đột với mọi nhánh đang mở.
- **Kit sau ngày tách đã tụt sau camera ở vài chỗ.** Camera vá logger, thêm phương ngữ,
  dựng nhánh native cho auth; kit không nhận được gì. Chuyển thẳng là lùi lại lỗi đã sửa.

## 2. Decision

- Source fe-kit là chuẩn triển khai. Cơ chế nào kit đã có (gọi API, đăng nhập, phiên,
  phân quyền, log, bảng môi trường) thì camera MUST dùng kit, MUST NOT giữ bản riêng.
- Khi hành vi của camera khác kit: mặc định theo kit. Nếu camera chứng minh được hành vi của
  mình là cần, thì đưa nó vào kit trước theo [extension-points.md](extension-points.md), cắt
  tag, rồi camera mới chuyển. Không fork kit trong camera.
- Thứ chỉ đúng cho camera ở lại camera. Bản copy có chủ đích MUST ghi lý do ngay tại chỗ
  copy (extension-points.md mục 4).
- Camera chỉ cần nằm trong **peer range** của kit, không phải theo
  [ADR 0005](adr/0005-ghim-ban-moi-nhat.md). ADR đó nói về version template kit sinh ra cho dự
  án mới; ép camera lên Expo 57 / Electron 44 để dùng một thư viện TypeScript là đổi một rủi
  ro nhỏ lấy rủi ro lớn hơn nhiều.

## 3. Gap map theo lớp

Ba lượt đối chiếu song song ngày 2026-10-08 (http/types · auth/config/server ·
access/logger/ui). Cột "Kit" ghi trạng thái **sau** các commit P0 trên nhánh
`feat/prepare-v0-2-0`.

### 3.1 Bảng tổng

| `@cap/*` | → fe-kit | Mức thay | Số phận package |
|---|---|---|---|
| `logger` | `fe-kit/logger` | 1:1 sau khi vá kit (đã vá). `HttpTarget` đổi khoá cố định → map `ids` | Adapter, giữ `trace.ts` riêng; xoá khi trace chuyển về `apps/web` |
| `core` (phần quyền) | `fe-kit/access` | 1:1, cần alias generic | Xoá; use-case (4 file web) chuyển vào `apps/web/features` |
| `config` | `fe-kit/config` | `timeout*` 1:1; `defineEnvironments` thiếu tầng `*_DOMAIN` và suy mount path | Co lại thành `shared/env.ts` dựng trên `defineEnvironments` + `readEnv` |
| `api-client` | `fe-kit/http` | Cơ chế thay được; 62 call site nội bộ + ~40 mapper phải dựng lại trên `HttpClient` | Co lại: 15 namespace + mapper + phương ngữ ở lại |
| `brm` | `fe-kit/http` + `envelopeDialect` | Transport thay được; `BrmError` khác `HttpError` (12 file web bắt) | Co lại: endpoint + types ở lại |
| `auth` (web) | `fe-kit/auth` + `fe-kit/server` | Cơ chế tương đương; thiếu chẩn đoán `invalid_id_token`, thu hồi refresh_token | Co lại: lớp bọc `loadOidcConfig`, route refresh 303 ở lại |
| `auth/native` | — | **Kit chưa có nhánh native** | Giữ nguyên tới khi kit có (mục 6, track riêng) |
| `types` | `fe-kit/types` | Phần hợp đồng dây (`ApiResponse`/`ApiError`/`Paginated`: 0 tham chiếu) | Co lại: giữ `ActionCode`, DTO |
| `ui` | `fe-kit/ui` | **Không thay được**: kit có 15 vai trò màu phẳng, camera 99 màu/mode, theme antd 39 component | Giữ; chỉ bỏ `blendOverlay` |
| `hooks` · `validators` · `playback` · `webrtc` | — | Của sản phẩm | Giữ; `hooks` chỉ còn `query-client` + `context` có người dùng, `validators` 0 app import |

Dependency khai thừa (0 import): `apps/web` → `hooks`, `validators`; `apps/mobile` →
`validators`; `apps/desktop` → `ui`, `core`; `packages/brm` và `packages/webrtc` → `logger`.

### 3.2 Khác biệt hành vi khi chuyển `api-client` → `fe-kit/http`

| # | Khác biệt | Xử lý |
|---|---|---|
| 1 | Kit gửi thêm `accept` và `x-request-id` | Đúng chuẩn gokit. Desktop renderer có thể dính CORS preflight — chưa đo, đo ở P2 |
| 2 | Kit thử lại `GET`/`HEAD` khi 502/503 và lỗi mạng | Hành vi mới, chủ ý. `/query/` của DVM là POST nên không ảnh hưởng |
| 3 | Lỗi mạng thành `HttpError` status 0 thay vì `TypeError` thô | Nhánh `else` của các chỗ `instanceof ApiError` đổi hành vi; rà 24 chỗ |
| 4 | Body camera đã là chuỗi (`body()`, `deviceIdsBody`); kit `JSON.stringify` thêm lần nữa | Chỗ gọi truyền object, không truyền chuỗi |
| 5 | `envelopeDialect` trả `data: undefined` im lặng khi thiếu dữ liệu | **Đã vá ở kit** — giờ là lỗi, như 4 hàm bóc vỏ cũ của camera |
| 6 | Timeout đọc `HTTP_TIMEOUT_MS` thay vì `API_TIMEOUT_MS` | Đổi tên biến trong config deploy |

### 3.3 Chín phương ngữ API → dialect của kit

Số "5 phương ngữ" ghi ở giai đoạn 1 đã cũ; code đo được 9.

| # | Backend | Envelope | Dialect |
|---|---|---|---|
| 1 | customer-uac (`rd`) | `{code_status:200, result, data}`, lỗi kèm HTTP 200 | `envelopeDialect` + `isSuccess` đọc body |
| 2 | IAM/BRM (`rdi`) | `{code:1200, message, data}`, lỗi 200 hoặc 4xx `{code:1403xx}` | `envelopeDialect` |
| 3 | cloud-mngt (`rdc`) | như (1), mã OK là 1200 | `envelopeDialect` |
| 4 | DVM/RDM (`rdm`) | 6 khoá, lỗi dùng HTTP status thật, `errors[0].error_code` | `envelopeDialect`, `error()` map `error_code` → `code`, `trace_id` → `traceId` |
| 5 | CMI (`r`) | DTO trần, lỗi `{code, message, request_id}` | `envelopeDialect({ data: b => b, error })` — `passthroughDialect` làm mất `code` |
| 6 | media-manager | `{data}` | `gokitDialect` |
| 7 | perception | `{data, page}` + RFC 7807 | `gokitDialect` + `list()` |
| 8 | notification (fetch tay) | `{data, page}` + RFC 9457 | `gokitDialect`; camera suy `hasMore` từ `nextCursor`, kit đọc `hasMore` |
| 9 | audit (fetch tay) | `{items, paging}` | `envelopeDialect`; không dùng `list()` được |

### 3.4 Auth và phiên (web)

| Camera | Kit | Xử lý |
|---|---|---|
| `middleware.ts` tự viết: state machine chọn công ty, next-intl, bỏ qua Server Action, ghi token vào request, dọn cookie sót, origin sau ingress | `createSessionProxy` | **Đã thêm vào kit**: `origin`, `loginPath(req)`, `next(req)`, không redirect Server Action, ghi token vào request, dọn khi chỉ còn tenant/realm. State machine chọn công ty ở lại camera, chạy trong `next` |
| Cookie `company_id` | `names.tenant` mặc định `tenant_id` | MUST khai `names: { tenant: 'company_id' }`, nếu không lúc deploy mọi người mất công ty đã chọn |
| `oidc_tx` 1800s | template 600s | **Đã sửa template** về 1800s |
| `uiLocales: 'vi'` mặc định, `kcIdpHint` | `uiLocales` không mặc định, `idpHint` | Lớp bọc `loadOidcConfig` ở camera |
| Discovery lỗi dò message bằng regex | `OidcError('discovery_failed', { status })` | So `e.status === 404` |
| `OidcError.failure` + `?reason=&skew=` | không có | Thiếu chẩn đoán `invalid_id_token`; viết lại cho jose 6 rồi đưa vào kit |
| `startLogout` thu hồi refresh_token rồi end_session | chỉ `buildEndSessionUrl` | Đưa `revokeSession` vào kit cùng nhánh native |
| Route `/api/auth/refresh` 303 + chống vòng | không có | Copy có chủ đích ở camera tới khi dự án thứ hai cần |

## 4. Blockers

| # | Blocker | Trạng thái |
|---|---|---|
| B1 | ~~Next 15 → 16~~ | **Không chặn.** `fe-kit/server` chỉ dùng `NextResponse`/`NextRequest`, có từ Next 15; peer `next` là optional nên pnpm chỉ cảnh báo. Dùng trong `middleware.ts`. Bẫy: template sinh `src/proxy.ts`, Next 15 không nhận tên này và proxy im lặng không chạy |
| B2 | Luồng đăng nhập trên Hermes | **Chặn mobile auth.** Polyfill không đủ: `expo-crypto` không có `subtle` trên native; `completeLogin` gọi cứng jose; `URLSearchParams` làm body sai. Cần nhánh native trong kit (mục 6) |
| B3 | Kit ship source TS | **Đã xử lý ở thí điểm**: `transpilePackages: ['fe-kit']` (web), thêm `fe-kit` vào `transformIgnorePatterns` của Jest mobile |
| B4 | Kit chỉ có lệnh `new` | Chưa làm. Chặn P4 (đồng bộ skill) |
| B5 | Phát triển song song dày | Chuyển theo adapter, mục 5 |
| B6 | Metro của camera bật `disableHierarchicalLookup` | **Đã xử lý ở thí điểm**: khai `fe-kit` thẳng trong `apps/mobile/package.json`, cùng lý do với `mqtt` |
| B7 | Kit chưa tag `v0.2.0`, chưa push | Chặn cài từ GitHub. Việc của dev (mục 9) |

## 5. Strategy — adapter trước, đổi import sau

Không đổi tên import hàng loạt. Mỗi package `@cap/x` đi qua ba bước:

1. **Adapter.** Ruột `@cap/x` thay bằng re-export hoặc lớp mỏng bọc fe-kit. Call site không
   đổi, nhánh đang mở không xung đột. Khác biệt hành vi lộ ra ở bước này và được xử lý một
   lần, ở một chỗ.
2. **Đổi import dần.** Code mới MUST import thẳng `fe-kit/*`. Code cũ đổi khi có người chạm
   vào feature đó. Luật này ghi vào skill `fe-architecture` của camera.
3. **Xoá.** Khi `@cap/x` không còn ai import thì xoá package.

Thứ tự đi từ thứ thay 1:1 tới thứ phải dựng lại: logger → access → config → http → auth web.

## 6. Phases

### P0 — Chuẩn bị ở fe-kit

Đã làm trên nhánh `feat/prepare-v0-2-0` (fe-kit), `make verify` xanh, 151 test:

- [x] Hợp đồng REST sinh từ gokit ([gokit-source-of-truth.md](gokit-source-of-truth.md)).
- [x] logger: sink hỏng không ném ra chỗ gọi; `safeDecode` (hai bản vá camera sau ngày tách).
- [x] auth: `decodeJwtPayload` giữ đúng UTF-8.
- [x] http: `envelopeDialect` báo lỗi khi thành công mà thiếu dữ liệu.
- [x] config: `defineEnvironments({ readEnv })`.
- [x] server: điểm nối `origin`, `loginPath(req)`, `next(req)`; Server Action; ghi token vào
  request; dọn cookie sót; `safeInternalPath`.
- [x] template: `oidc_tx` 1800s; route login chặn `/\evil.com`.
- [x] platforms.md ghi đúng hiện trạng React Native.

Còn lại, có lý do để chưa làm:

- [ ] **Nhánh native cho auth** (port crypto/verifier/token store/browser, `encodeForm`,
  `revokeSession`, base64url). Lớn, đụng bảo mật (`createUnsignedIdTokenVerifier`), cần
  security review và đo trên thiết bị — làm thành kế hoạch riêng.
- [ ] **Lệnh cho repo có sẵn** (`fe-kit sync`). Skill `git-flow` của camera (202 dòng, có
  Jira/RPA) khác hẳn bản kit (68 dòng); ghi đè là mất nội dung. Cần chốt cách gộp trước.
- [ ] `printHttpTrace` / `printMqttTrace`: ở lại camera; kit cấm `console.*` ngoài sink nên
  nếu muốn đưa lên kit thì phải là một sink/formatter, không phải hàm in.
- [ ] antd dark mode (`cssVar.key` theo mode, chặn darkAlgorithm đè `colorPrimary`): kit chưa
  hỗ trợ dark; camera không dùng theme của kit nên không chặn.
- [ ] Template desktop/mobile gọi `env.current()` ở client mà không khai `readEnv` → luôn ra
  môi trường mặc định. Sửa template ở MR riêng.

### P1 — `@cap/logger` (thí điểm)

Nhánh camera `refactor/RPA-0000-fe-kit-logger-adapter` (worktree
`../camera-ai-platform-fekit-pilot`, nền `origin/development`). Kết quả ở mục 7.

1. `@cap/logger/src/index.ts` re-export `fe-kit/logger`, giữ `trace.ts`. Xoá 5 file trùng.
2. Khai `fe-kit` ở `packages/logger` và `apps/mobile` (B6).
3. `transpilePackages: ['fe-kit']` (web); `fe-kit` vào `transformIgnorePatterns` (Jest mobile).
4. Test của camera đổi `target.enterpriseId` → `target.ids.enterpriseId`.

### P2 — `access`, `config`, `http`

1. `@cap/core` → `fe-kit/access`: `AccessProfile<ActionCode>`; `buildAccessProfile(wire,
   { knownActions: ACTION_CODES, onWarn })` nối `onWarn` vào logger. Kiểm hiển thị tên vai trò
   (kit lấy `name ?? id`, camera luôn lấy id). Giữ bước dẹt cây của camera (UI cần label).
2. `@cap/config` → `shared/env.ts` trên `defineEnvironments` + `readEnv` (giữ chính sách nhúng
   endpoint lúc build) + tầng tính `*_DOMAIN`/mount path của camera.
3. `@cap/api-client`, `@cap/brm` → `fe-kit/http`: mỗi phương ngữ ở 3.3 một dialect, mỗi
   base URL một client. Rà 6 khác biệt ở 3.2.

### P3 — Auth và phiên (web)

1. `middleware.ts` dùng `createSessionProxy` của kit, state machine chọn công ty đặt trong
   `next`, `origin` lấy từ `requestOrigin` hiện có của camera. Không cần Next 16.
2. `createSessionCookies({ names: { tenant: 'company_id' } })`.
3. Lớp bọc `loadOidcConfig` (`uiLocales: 'vi'`, đọc env của camera).

### P4 — Skill và tài liệu

1. Sau khi có lệnh cho repo có sẵn: thay skill kit phát hành, nội dung riêng của camera
   chuyển sang skill riêng.
2. Xoá `docs/fe-kit/` trong camera (D-009).
3. `AGENTS.md` camera: bảng "kit đã có, đừng dựng lại".

### P5 — Chặn quay lại

CI camera fail khi thêm file vào package `@cap/*` đã thành adapter.

## 7. Kết quả thí điểm P1

Cài fe-kit bằng tarball `npm pack` từ nhánh `feat/prepare-v0-2-0` (giống cài từ GitHub: tôn
trọng `files`/`exports`), trên nền `origin/development` của camera:

| Bước | Kết quả |
|---|---|
| `pnpm install` (pnpm 9.12.3) | Xanh. Cảnh báo peer đều có từ trước, không liên quan fe-kit |
| Test `@cap/logger` (28 test cũ của camera, giờ chạy qua adapter vào kit) | Xanh sau khi đổi `target.enterpriseId` → `ids` |
| `turbo type-check` (12 package) | Xanh |
| `turbo test` | Xanh sau khi thêm `fe-kit` vào `transformIgnorePatterns` của Jest mobile |
| `next build` (web) | Xanh, cần `transpilePackages: ['fe-kit']` |
| `expo export --platform android` (Metro → Hermes) | Xanh; bundle có `reportSinkFailure` (hàm chỉ có ở kit) nên code kit đã thật sự đi qua Metro |
| `oxlint apps packages` | Xanh |

Desktop không dùng `@cap/logger` nên không build lại.

Diff thí điểm: 6 file sửa, 5 file xoá (`logger.ts`, `sinks.ts`, `redact.ts`, `http.ts`,
`types.ts` của `@cap/logger`). Spec trong worktree đã để sẵn
`github:bangdinh/fe-kit#v0.2.0` và lockfile trả về bản gốc — chưa commit vì tag chưa có.

## 8. Risks

| Rủi ro | Xử lý |
|---|---|
| Khác biệt hành vi lộ ra ở môi trường thật (mã lỗi, retry, refresh token) | Adapter gom khác biệt về một chỗ; P2 rà 3.2 theo từng mục |
| Kit đổi minor trong lúc camera đang chuyển | Pin tag chính xác; chỉ nâng giữa hai phase |
| Kit public trên GitHub, camera build trong CI FPT | Kiểm runner FPT ra được GitHub ở lần cài đầu |
| Người làm camera không biết luật mới | Luật nằm trong skill `fe-architecture`, kích hoạt đúng lúc; P4 |

## 9. Việc của dev để đi tiếp

1. Review và push nhánh fe-kit `feat/prepare-v0-2-0`, merge, `make release VERSION=v0.2.0`,
   push tag.
2. Ở worktree camera: đổi hai dòng `file:…tgz` thành `github:bangdinh/fe-kit#v0.2.0`,
   `pnpm install`, chạy lại các bước ở mục 7, commit.
3. Đặt Jira key thật cho nhánh camera (`git branch -m`).

## 10. Open questions

- **Q1.** Ai làm phía camera, ghi vào Jira/Plane nào?
- **Q3.** Lệnh cho repo có sẵn: tên (`sync`/`adopt`) và luật gộp skill khi sản phẩm đã có
  bản riêng dài hơn bản kit.
