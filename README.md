# fe-kit

[![version](https://img.shields.io/badge/release-v0.1.0-blue)](CHANGELOG.md)
[![node](https://img.shields.io/badge/node-22.12%2B-339933)](package.json)
[![stack](https://img.shields.io/badge/next%2016%20·%20expo%2057%20·%20electron%2044-informational)](docs/platforms.md)

Bộ kit **frontend dùng chung** cho web · mobile · desktop, nói đúng hợp đồng REST của
[`b2b-gokit`](../../b2b-gokit). Mỗi dự án **kế thừa** thay vì copy khung.

Kit **không chứa màn hình của sản phẩm nào**. Nó chứa cơ chế: cấu hình môi trường,
client HTTP, OIDC, phiên, chấm quyền, log, token giao diện, và một generator dựng dự án mới.

> **Lần đầu vào repo?** Đọc [ONBOARDING.md](ONBOARDING.md) — 5 phút.
> [STRUCTURE.md](STRUCTURE.md) nói **vì sao code có hình dạng đó**;
> [docs/adr/](docs/adr/) ghi các quyết định khó lùi.

---

## 1. Dựng một dự án mới

```bash
npx fe-kit new kho-hang --platforms web,mobile
cd kho-hang
pnpm install
cp .env.example .env.local
pnpm dev                      # http://localhost:3000
```

Đứng trong repo kit thì dùng `make`:

```bash
make new NAME=kho-hang OUT=../kho-hang PLATFORMS=web
```

Dự án sinh ra **chạy được ngay** — trang chủ công khai, chưa cần IdP nào. Nó gồm
`shared/` (bảng môi trường, token, client API), `apps/*` theo nền tảng đã chọn,
`turbo.json`, `README.md`, `AGENTS.md`/`CLAUDE.md`, và **ba skill** trong `.claude/skills/`:

| Skill | Trả lời |
|---|---|
| `fe-architecture` | Đặt file ở đâu · shared hay app · server hay client · kit đã có sẵn thứ gì |
| `api-contract` | Envelope, phân trang, mã lỗi, và cách khai phương ngữ cho service cũ |
| `git-flow` | Nhánh, commit, checklist trước MR, nâng cấp kit |

Chúng **do kit phát hành** — sửa tại chỗ sẽ mất ở lần nâng cấp sau.

## 2. Pin version, và nâng cấp

Dự án client pin **đúng một version** — mô hình của `b2b-gokit` và `qc-kit`.
Kit chưa publish lên registry nên pin theo tag git:

```jsonc
// package.json của dự án
"dependencies": {
  "fe-kit": "github:bangdinh/fe-kit#v0.1.0"
}
```

```bash
pnpm up fe-kit@<tag-mới> -r
pnpm type-check                # kit đổi API thì typecheck bắt ngay
```

`fe-kit new` tự điền tag hiện tại lúc sinh dự án, nên dự án mới không phải sửa tay.
Publish lên registry rồi thì đổi thành range bình thường (`"fe-kit": "^0.2.0"`) —
`exports`, `files` đã sẵn sàng cho cả hai đường.

> **Pre-1.0**: bump **minor** cho thay đổi phá vỡ, **patch** cho tương thích ngược.
> Đọc [CHANGELOG.md](CHANGELOG.md) trước khi nâng minor.

## 3. Kit gồm gì

| Subpath | Dùng để | Chạy ở |
|---|---|---|
| `fe-kit/config` | `defineEnvironments` · `envVar`/`envFlag`/`envNumber` · `timeoutSignal` | mọi nơi |
| `fe-kit/http` | `createHttpClient` — envelope gokit, RFC 9457, cursor, timeout, retry, 401 · `envelopeDialect` | mọi nơi |
| `fe-kit/auth` | OIDC Authorization Code + PKCE · JWKS · refresh có khoá chống đua · SLO | mọi nơi |
| `fe-kit/access` | `can` · `canOn` · `buildAccessProfile` · `indexFromTree` | mọi nơi |
| `fe-kit/logger` | `createLogger` — che secret, block HTTP đọc được, sink thay được | mọi nơi |
| `fe-kit/types` | Envelope · `Page` · `ProblemDetails` · 15 mã lỗi gokit | mọi nơi |
| `fe-kit/tokens` | Bảng design token thuần (`defineTokens`) | mọi nơi |
| `fe-kit/server` | Cookie phiên + `createSessionProxy` | **chỉ server của Next** |
| `fe-kit/ui` | Token → `ThemeConfig` của antd · CSS variables | **chỉ web** |

Kit **không xuất component nào**. Lý do ở [ADR 0003](docs/adr/0003-ba-nen-tang-mot-loi.md).

## 4. Phát triển kit

```bash
make install     # pnpm install cho kit + example
make verify      # cổng DUY NHẤT trước khi commit
make smoke       # nghiệm thu thật: sinh dự án, cài từ tarball, build
make example     # sinh lại example/ sau khi sửa template
make help        # đầy đủ
```

`make verify` chạy: `lint` → `typecheck` → `test` → `check-layers` → `verify-example`
→ `example-check` (type-check + build cả 3 app mẫu).

**`example/` là thứ SINH RA từ `cmd/fe-kit/templates/`** — đừng sửa tay ở đó.
Nó tồn tại để chứng minh template còn dựng được app chạy; `verify-example` fail
ngay khi hai bên lệch nhau.

## 5. Tài liệu

| Doc | Đọc khi |
|---|---|
| [docs/getting-started.md](docs/getting-started.md) | Dựng dự án đầu tiên |
| [docs/architecture.md](docs/architecture.md) | Quyết định code thuộc kit hay thuộc sản phẩm |
| [docs/api-contract.md](docs/api-contract.md) | Gọi API, đọc lỗi, sống chung với service cũ |
| [docs/platforms.md](docs/platforms.md) | Subpath nào chạy ở đâu, và vì sao |
| [docs/extension-points.md](docs/extension-points.md) | Kit không làm được thứ bạn cần |
| [docs/scaffold.md](docs/scaffold.md) | Sửa generator / template |
| [docs/versioning.md](docs/versioning.md) | Cắt release, pin, nâng cấp |
| [docs/decisions.md](docs/decisions.md) | Quyết định đã chốt + lý do |
| [docs/adr/](docs/adr/) | Năm quyết định khó lùi |

## License

Internal use only. Not open source.
