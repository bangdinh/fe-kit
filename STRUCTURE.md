# Kiến trúc — fe-kit

[README.md](README.md) nói **cách dùng**. Tài liệu này nói **vì sao code có hình dạng
như vậy**: các tầng, luật phụ thuộc duy nhất giữ chúng tách nhau, và những điểm nối mà
một dự án mới cắm vào.

Tài liệu này cố ý không liệt kê file. Danh sách file lạc hậu ngay sau lần refactor đầu
tiên và từ đó trở đi nó gây hiểu sai — bảng subpath ở [README §3](README.md#3-kit-gồm-gì)
mới là bản đồ, còn code mới là nguồn sự thật.

---

## 1. Hai loại tri thức

Mọi dòng trong `src/` thuộc về một trong hai loại, và toàn bộ thiết kế đi ra từ việc
giữ chúng tách bạch:

| | **Tri thức framework** | **Tri thức sản phẩm** |
|---|---|---|
| Trả lời câu hỏi | *Chúng ta gọi backend như thế nào?* | *Chúng ta đang gọi backend nào?* |
| Ví dụ | envelope được bóc ra sao, 401 xử lý thế nào, cookie phiên gồm những gì, quyền chấm theo công thức nào | `beta` trỏ vào URL nào, màu thương hiệu là gì, action code có những mã nào |
| Thay đổi khi | cả nhóm đổi cách làm frontend | sản phẩm thay đổi |
| Nằm ở | **toàn bộ `src/` của repo này** | **dự án tiêu thụ** — kit chỉ giữ bản mẫu ở `cmd/fe-kit/templates/` |

Nếu một thay đổi của sản phẩm buộc bạn phải sửa code trong `src/` thì ranh giới đã rò
rỉ. Đó là tín hiệu hữu ích nhất mà kiến trúc này cho bạn.

Bài học lấy từ `camera-ai-platform`: đo được ở đó là `packages/core` có **88 dòng** nhắc
tên miền camera, `packages/types` **81**, `packages/config` **53** — tức ba package
"dùng chung" đã dính chặt vào một sản phẩm. Kit này tách ra đúng phần còn lại dùng chung
được, và `make check-layers` là thứ giữ cho nó không dính lại.

## 2. Luật phụ thuộc

```
apps của DỰ ÁN TIÊU THỤ  (web · mobile · desktop)
      │ chỉ import
      ▼
shared/ của dự án ─────────────── bảng môi trường · token · client API
      │
      ├──► fe-kit/server ──┐           (chỉ Next server)
      ├──► fe-kit/ui ──────┤           (chỉ web)
      └──► fe-kit ─────────┴──► http ──► config · logger · types
                                access ──► types
                                auth   ──► config
```

**Phụ thuộc chỉ chảy một chiều. `config`/`logger`/`types` không import gì của kit ngoài
nhau; `server` và `ui` không ai import ngược lại.**

Luật này kiểm chứng được, và `make verify` chạy nó trước mỗi lần commit:

```bash
./scripts/check-layers.sh
```

Nó kiểm năm thứ: không URL tuyệt đối trong `src/` · không `next/*` ngoài `src/server` ·
không `antd`/`react` ngoài `src/ui` · lõi không import ngược · `console.*` chỉ ở sink của
logger. In ra dòng nào là vi phạm dòng đó.

## 3. Ba hệ quả

### 3.1 Kit không biết endpoint nào

`defineEnvironments` là **cơ chế**; bảng URL là **dữ liệu của sản phẩm**. Kit không thể
ship một `environments.ts` có sẵn URL, vì làm vậy thì mọi dự án cài nó về đều thừa kế
môi trường của người khác — và sẽ sửa bằng cách ghi đè rải rác.

Hệ quả đo được: `grep -rE "['\"]https?://" src/` phải rỗng.

### 3.2 Kit không xuất component

Một bộ component dùng chung chỉ đứng vững khi hai sản phẩm thật sự cần y hệt nhau, mà
điều đó gần như không xảy ra với màn hình nghiệp vụ. Thứ dùng chung được là **bảng token**
và **cách nối nó vào thư viện UI** — đúng phần `fe-kit/ui` làm. Xem
[ADR 0003](docs/adr/0003-ba-nen-tang-mot-loi.md).

### 3.3 Lõi phải chạy được ở nơi không có DOM

`fe-kit/http`, `/auth`, `/access`, `/logger`, `/config`, `/types`, `/tokens` chạy trên
React Native và trong Edge runtime. Nghĩa là trong những module đó:

- không đọc `process` bằng tên — đọc qua `globalThis` (xem `src/config/env.ts`);
- không dùng kiểu của `lib: ["DOM"]` (`RequestCache`, `Crypto`) — khai theo hình dạng;
- không import `react`, `antd`, `next/*`.

Ba luật này không phải lý thuyết: cả ba đều do `example/apps/mobile` bắt được lúc
type-check, sau khi bản đầu đã "xanh" trên tsconfig của kit.

## 4. Điểm nối — dự án cắm vào ở đâu

| Kit hỏi | Dự án trả lời bằng |
|---|---|
| Gọi backend nào? | bảng của `defineEnvironments` |
| Token lấy ở đâu? | `getToken` / `onUnauthorized` truyền vào `createHttpClient` |
| Backend nói phương ngữ gì? | `dialect` (mặc định `gokitDialect`) |
| Màu thương hiệu? | `defineTokens(mode, { color: … })` |
| Action code nào có thật? | `buildAccessProfile(data, tenant, { knownActions })` |
| Cây resource hình gì? | `indexFromTree(roots, { idOf, childrenOf })` |
| Refresh token bằng cách nào? | `refresh` truyền vào `createSessionProxy` |
| Log đi đâu? | `configureLogger({ sink })` |

Mỗi dòng ở đây là một chỗ kit **cố ý không quyết định**. Cần thêm một điểm nối mới thì
đọc [docs/extension-points.md](docs/extension-points.md) trước khi fork.

## 5. `example/` là bằng chứng, không phải tài liệu

`example/` được **sinh ra** từ `cmd/fe-kit/templates/` bằng chính generator mà người dùng
chạy. CI build cả ba app mỗi commit.

Vì sao không viết tay một app mẫu: app mẫu viết tay sẽ được sửa cho chạy, còn template
thì không ai chạy cho tới khi có người dựng dự án mới — và lúc đó mới phát hiện nó hỏng.
Sinh ra từ cùng một nguồn thì không có khe hở đó. `make verify-example` fail ngay khi
`example/` lệch khỏi template. Xem [ADR 0004](docs/adr/0004-example-sinh-tu-template.md).
