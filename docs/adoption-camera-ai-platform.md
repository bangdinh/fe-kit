# Kế hoạch triển khai: camera-ai-platform chuyển sang fe-kit

| | |
|---|---|
| Status | Draft |
| Date | 2026-10-08 |
| Scope | camera-ai-platform (web, mobile, desktop) + fe-kit |
| Related | [gokit-source-of-truth.md](gokit-source-of-truth.md) · [architecture.md](architecture.md) · [extension-points.md](extension-points.md) · [history/](history/) |

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
| Next | `^15.3.4`, dùng `middleware.ts` | peer `>=16`, dùng `proxy.ts` (D-014) |
| Expo / React Native | `~53` / `0.79.6` | template `^57` / `0.87.1` |
| Electron | `^31`, `electron-vite ^2` | template `^44`, `vite ^8` |
| antd | `^6.5.1` | peer `>=6` |
| TypeScript | `5.9.3` | `7.0.2` |
| pnpm | `9.12.3` | `12.4.1` |
| Skill `api-contract`, `fe-architecture`, `git-flow` | bản riêng, đã khác bản kit phát hành | phát hành qua template |
| `docs/fe-kit/` | vẫn còn (D-009 ghi cần xoá) | đã sao sang `docs/history/` |

Hai phép đo quyết định cách làm:

- **TypeScript không phải rào cản.** `tsc 5.9.3` của camera type-check toàn bộ `src/` của
  kit không lỗi.
- **Camera đang được phát triển dày.** 316 commit trong 14 ngày (2026-09-24 → 2026-10-08),
  khoảng 5 người. Một MR thay toàn bộ `@cap/*` sẽ xung đột với mọi nhánh đang mở.

## 2. Decision

- Source fe-kit là chuẩn triển khai. Cơ chế nào kit đã có (gọi API, đăng nhập, phiên,
  phân quyền, log, bảng môi trường, design token) thì camera MUST dùng kit, MUST NOT giữ
  bản riêng.
- Khi hành vi của camera khác kit: mặc định theo kit. Nếu camera chứng minh được hành vi
  của mình là cần, thì đưa nó vào kit trước theo [extension-points.md](extension-points.md),
  cắt tag, rồi camera mới chuyển. Không fork kit trong camera.
- Thứ chỉ đúng cho camera ở lại camera. Bản copy có chủ đích MUST ghi lý do ngay tại chỗ
  copy (extension-points.md mục 4).
- Danh sách "cố ý không có" ở [architecture.md](architecture.md) vẫn giữ nguyên. Camera
  dùng React Query, zod, next-intl là lựa chọn của sản phẩm, không phải lý do đưa chúng vào kit.

## 3. Gap map theo lớp

> Đang đối chiếu. Mục này sẽ có: bảng `@cap/*` → subpath fe-kit, khác biệt hành vi khi
> chuyển, phần camera có mà kit không có (phân loại sản phẩm / chung), số call site theo app.

## 4. Blockers

| # | Blocker | Chặn phần nào | Hướng xử lý |
|---|---|---|---|
| B1 | Next 15 → 16 | chỉ `fe-kit/server` (`src/server/proxy.ts` import `next/server`, quy ước `proxy.ts`) | Lõi và lá không cần chờ. `server` chuyển sau khi camera web lên Next 16 |
| B2 | Hermes thiếu `crypto.subtle` | `fe-kit/auth` trên mobile | Polyfill theo [platforms.md](platforms.md) |
| B3 | Version template của kit ≠ version camera | không chặn trực tiếp | Hợp đồng tương thích là **peer range** trong `package.json` của kit, không phải version của `example/`. Xem Q2 |
| B4 | Kit chỉ có lệnh `new` | đồng bộ skill/cấu hình vào repo đã có | Thêm lệnh cho repo có sẵn ở fe-kit (P0) |
| B5 | Phát triển song song dày | mọi phase | Chuyển theo adapter, mục 5 |

## 5. Strategy — adapter trước, đổi import sau

Không đổi tên import hàng loạt. Mỗi package `@cap/x` đi qua ba bước:

1. **Adapter.** Ruột `@cap/x` thay bằng re-export hoặc lớp mỏng bọc fe-kit. Call site không
   đổi, nhánh đang mở không xung đột. Khác biệt hành vi lộ ra ở bước này và được xử lý
   một lần, ở một chỗ.
2. **Đổi import dần.** Code mới MUST import thẳng `fe-kit/*`. Code cũ đổi khi có người
   chạm vào feature đó. Luật này ghi vào skill `fe-architecture` của camera.
3. **Xoá.** Khi `@cap/x` không còn ai import thì xoá package.

Thứ tự theo ba lớp của kit, từ lá lên: lá không phụ thuộc gì nên rủi ro thấp nhất, lớp có
ràng buộc nền tảng đi cuối vì vướng B1.

## 6. Phases

### P0 — Chuẩn bị ở fe-kit

1. Đưa vào kit những phần mục 3 xếp loại "chung", mỗi phần một MR kèm dòng trong
   [decisions.md](decisions.md).
2. Thêm lệnh cho repo có sẵn (đề xuất `fe-kit sync`): ghi đè các skill kit phát hành, báo
   khác biệt chứ không ghi đè file sản phẩm. Viết ADR vì đây là bề mặt CLI mới.
3. Hoàn tất P1–P2 của [gokit-source-of-truth.md](gokit-source-of-truth.md), cắt `v0.2.0`.
   Camera bắt đầu từ bản đã theo hợp đồng gokit, không bắt đầu từ `v0.1.0` rồi chuyển lần hai.

Done khi: tag `v0.2.0` có đủ những gì camera cần cho P1–P3.

### P1 — Lớp lá: `types`, `config`, `logger`

1. Thêm `"fe-kit": "github:bangdinh/fe-kit#v0.2.0"` vào các package/app cần dùng.
2. Adapter cho `@cap/types` (phần hợp đồng dây), `@cap/config`, `@cap/logger`.
3. Chạy `pnpm type-check`, `pnpm test`, build cả ba app.

Done khi: ba app build xanh, CI của camera cài được kit từ GitHub.

### P2 — Lớp lõi: `http`, `access`, `auth`

1. `@cap/api-client` → `fe-kit/http`. Khai các phương ngữ API cũ của camera bằng
   `envelopeDialect`, không rải `if` theo body.
2. `@cap/brm`, phần phân quyền của `@cap/core` → `fe-kit/access`.
3. `@cap/auth` (lõi) → `fe-kit/auth`. Mobile cần polyfill B2 trước.
4. Mỗi package một MR, kiểm thử lại luồng đăng nhập, gọi API lỗi, màn hình bị chặn quyền
   trên cả ba app.

Done khi: không còn logic gọi API, chấm quyền, refresh token nào ngoài kit.

### P3 — Lớp có ràng buộc nền tảng: `server`, `ui`

1. Nâng camera web lên Next 16, đổi `middleware.ts` → `proxy.ts`. Đây là việc riêng, có
   rủi ro riêng, nên tách task.
2. Phiên/cookie → `fe-kit/server` (`createSessionProxy`, `createSessionCookies`).
3. Token màu/kích thước của `@cap/ui` → `fe-kit/ui` + `shared/tokens.ts` của camera.
   Component UI ở lại camera (kit không xuất component, ADR 0003).

Done khi: `@cap/auth` phía server, `@cap/config`, `@cap/logger`, `@cap/api-client`,
`@cap/brm` đã xoá.

### P4 — Skill và tài liệu

1. Chạy `fe-kit sync` để thay ba skill bản riêng bằng bản kit phát hành. Nội dung riêng của
   camera (ví dụ phương ngữ cũ, luật livestream) chuyển sang skill riêng của camera, không
   sửa vào skill kit.
2. Xoá `docs/fe-kit/` trong camera (D-009).
3. Cập nhật `AGENTS.md` của camera: bảng "kit đã có, đừng dựng lại".

### P5 — Chặn quay lại

1. Thêm kiểm tra vào CI camera: fail khi thêm file mới vào package `@cap/*` đã chuyển sang
   adapter.
2. Mục "đã dùng fe-kit version nào" đưa vào README camera, nâng theo
   [versioning.md](versioning.md).

## 7. Out of scope

- Nâng Expo 53 → 57 / React Native 0.79 → 0.87. Đây là việc lớn, vướng patch
  `react-native-webrtc@124.0.8`, và lõi kit không đòi hỏi nó. Làm khi có lý do riêng.
- Nâng Electron 31 → 44, pnpm 9 → 12. Cùng lý do.
- `@cap/playback`, `@cap/webrtc`, `@cap/validators`, `@cap/hooks` và component UI: nghiệp vụ
  hoặc lựa chọn của sản phẩm, ở lại camera.

## 8. Risks

| Rủi ro | Xử lý |
|---|---|
| Khác biệt hành vi lộ ra ở môi trường thật (mã lỗi, retry, refresh token) | Adapter gom khác biệt về một chỗ; P2 kiểm thử theo luồng trên cả ba app |
| Kit đổi minor trong lúc camera đang chuyển | Pin tag chính xác; chỉ nâng giữa hai phase |
| Kit public trên GitHub, camera build trong CI FPT | Kiểm runner FPT ra được GitHub ở P1 bước 3 |
| Người làm camera không biết luật mới | Luật nằm trong skill `fe-architecture`, kích hoạt đúng lúc; P4 |

## 9. Open questions

- **Q1.** Ai làm phía camera, ghi vào Jira/Plane nào?
- **Q2.** Camera có phải theo [ADR 0005](adr/0005-ghim-ban-moi-nhat.md) (ghim bản mới nhất)
  không, hay chỉ cần nằm trong peer range của kit? Kế hoạch này giả định peer range là đủ.
- **Q3.** Lệnh cho repo có sẵn đặt tên `sync`, `adopt` hay gộp vào `new --existing`?
