# Kế hoạch triển khai: b2b-gokit là single source of truth của hợp đồng REST

| | |
|---|---|
| Status | In progress — gokit v0.8.7 đã commit + tag (chờ push); fe-kit đã đồng bộ hợp đồng v0.8.7 trên nhánh `feat/prepare-v0-2-0`, chờ cắt v0.2.0 |
| Date | 2026-10-08 |
| Scope | fe-kit + b2b-gokit |
| Related | [api-contract.md](api-contract.md) · [decisions.md](decisions.md) D-012 · gokit ADR-0001 (response contract) |

## 1. Context

fe-kit hiện chép tay hợp đồng REST của gokit vào `src/types/wire.ts`, `src/http/errors.ts`
và `docs/api-contract.md`. Không có cơ chế nào báo khi gokit đổi. Đối chiếu ngày
2026-10-08 (gokit `v0.8.6`, fe-kit `v0.1.0`) cho thấy bản chép đã lệch:

| Hạng mục | gokit (nguồn) | fe-kit (bản chép) |
|---|---|---|
| HTTP `412` → code | `INTERNAL_ERROR` (không có case 412 trong `CodeForHTTPStatus`) | `PRECONDITION_FAILED` |
| HTTP `502` → code | `SERVICE_UNAVAILABLE` | `INTERNAL_ERROR` |
| 4xx không khai → code | `INTERNAL_ERROR` | `INVALID_INPUT` |
| Tài liệu chuẩn | `docs/rest-api-standard.md` (VMSN-STD-API-001 v1.3) | trỏ `docs/REST_API_STANDARD.md` — file không còn |
| Header chưa có | gokit đã có middleware `idempotency`, `httpcache` (`ETag`, `Cache-Control`), `deprecation` (`Deprecation`, `Sunset`), `Retry-After` | `api-contract.md` ghi "chưa có ở gokit, đừng giả định" |
| `FieldError` (phát hiện khi làm P2) | `code` là `omitempty`, `reason` bắt buộc | khai ngược: `code` bắt buộc, `reason` optional |

Dòng 412 còn cho thấy một lỗi ngay trong gokit: `codeToHTTPStatus` map
`PRECONDITION_FAILED → 412` nhưng chiều ngược lại không có. Chép tay thì fe-kit "sửa
hộ" ở phía mình, và hai bên tiếp tục khác nhau mà không ai biết.

## 2. Decision

- gokit MUST là nơi duy nhất khai hợp đồng. fe-kit chỉ tiêu thụ bản sinh ra từ gokit.
- fe-kit MUST NOT sửa tay dữ kiện hợp đồng. Thấy gokit sai thì sửa ở gokit, cắt tag, rồi
  đồng bộ xuống.
- Mỗi bản fe-kit MUST ghi rõ nó đồng bộ từ tag gokit nào.

### Thứ thuộc hợp đồng (gokit sở hữu)

| Dữ kiện | Nguồn trong gokit |
|---|---|
| 15 error code + default title | `errors/codes.go` |
| Code ↔ HTTP status, cả hai chiều | `errors/problem.go` (`codeToHTTPStatus`, `CodeForHTTPStatus`) |
| Hình dạng `ProblemDetail`, `FieldError` | `errors/problem.go` |
| Hình dạng `Data[T]`, `Page[T]`, `PageMeta` (field nào `omitempty`) | `response/response.go` |
| `DefaultLimit`, `MaxLimit`, cú pháp `sort` | `domain/pagination.go` |
| Tên header công khai (`X-Request-Id`, `Idempotency-Key`, `ETag`, `Retry-After`, …) | `middleware/header`, `middleware/*` |

### Thứ vẫn thuộc fe-kit

Logic phía FE không phải là hợp đồng: `Dialect` và `envelopeDialect` cho service cũ,
chính sách retry, timeout, `defineEnvironments`, engine phân quyền. fe-kit giữ và tự
quyết những phần này.

## 3. Mechanism

```
b2b-gokit (git.fpt.net)                       fe-kit (github)
  errors/ response/ domain/ middleware/
        │  go run ./cmd/contract
        ▼
  contract/rest-contract.json  ──make contract-sync GOKIT=vX.Y.Z──►  contract/gokit-rest-contract.json  (vendored)
  (commit, golden test giữ khớp)                                          │  node scripts/gen-contract.js
                                                                          ▼
                                                                    src/types/contract.gen.ts
                                                                    (wire.ts, errors.ts import từ đây)
```

1. gokit sinh `contract/rest-contract.json` bằng một chương trình Go đọc chính các hằng số
   và hàm trong code, không gõ lại. JSON có `schemaVersion` và `gokitVersion`.
2. Golden test trong gokit chạy `go test ./...` và fail nếu JSON đã commit khác với kết quả
   sinh lại. Cùng mô hình `sync-skill` / `verify-skill` gokit đang dùng.
3. fe-kit **vendor** bản JSON theo tag, không fetch lúc build. Lý do: fe-kit ở GitHub, CI
   của nó không với tới `git.fpt.net`. Dev có quyền FPT chạy `make contract-sync` tại máy.
4. `make verify` của fe-kit thêm bước `contract-verify`: sinh lại `contract.gen.ts` từ JSON
   đã vendor và fail nếu khác. Cùng mô hình `verify-example`.
5. Đường dẫn tới clone gokit truyền qua biến môi trường (`GOKIT_DIR`), không ghi cứng.

## 4. Phases

### P0 — Chốt (gokit + fe-kit)

1. Viết ADR 0006 trong fe-kit và ADR 0005 trong gokit cho quyết định ở mục 2.
2. Chốt ba dòng lệch ở mục 1 tại gokit:
   - thêm case `412 → PRECONDITION_FAILED` vào `CodeForHTTPStatus`;
   - quyết định FE có dùng `CodeForHTTPStatus` cho backend không theo chuẩn hay không
     (xem câu hỏi Q1).
3. Ghi D-0xx vào [decisions.md](decisions.md).

Done khi: hai ADR merge, bảng lệch ở mục 1 có hướng xử lý cho từng dòng.

Đã làm: gokit ADR-0005 (Proposed), fe-kit D-017. `412` và 4xx không có case sửa ở gokit.

### P1 — gokit phát hành hợp đồng

1. Export phần đang private mà generator cần đọc: danh sách code, `Code.HTTPStatus()`.
   Thay đổi tương thích ngược → patch.
2. Viết `cmd/contract` sinh `contract/rest-contract.json`.
3. Viết golden test; thêm `make contract` và `make verify-contract`.
4. Cập nhật `README.md` gốc và README của `errors/`, `response/`.
5. Cắt tag (đề xuất `v0.8.7`).

Done khi: `GOWORK=off go test ./...` xanh, JSON có trong tag.

Đã làm, phát hành trong gokit **v0.8.7** (3 commit trên `master` + `chore(release)`):
`errors.Codes()`, `Code.HTTPStatus()`, package `contract` + golden test,
`make contract` / `make verify-contract`, README, ADR. 51 package test xanh.

### P2 — fe-kit tiêu thụ

1. Viết `scripts/contract-sync.sh` (lấy JSON từ tag gokit qua `GOKIT_DIR`) và
   `scripts/gen-contract.js` (sinh `src/types/contract.gen.ts`).
2. Thay `GOKIT_ERROR_CODES`, `codeFromStatus`, mặc định `ListQuery` bằng giá trị sinh ra.
   Giữ nguyên `ErrorCode = GokitErrorCode | (string & {})` theo lý do ở
   [api-contract.md](api-contract.md).
3. Đổi test `dialect.test.ts` / `client.test.ts` sang table-driven đọc từ JSON, để test tự
   theo hợp đồng thay vì khai lại.
4. Thêm `contract-verify` vào `make verify`.
5. Cắt release. Đổi `codeFromStatus` là đổi hành vi mặc định → **minor** (`v0.2.0`) theo
   [versioning.md](versioning.md).

Done khi: `make verify` xanh, không còn literal mã lỗi hay status nào gõ tay trong `src/`.

Đã làm (commit `feat(types): sinh hợp đồng REST từ gokit thay vì chép tay`), rồi đồng bộ lại
từ tag v0.8.7 bằng `make contract-sync GOKIT_REF=v0.8.7` — JSON không đổi, chỉ đổi nguồn. Đối chiếu
`wire.ts` bằng type-level test; đã thử làm lệch `FieldError` và `PageMeta` để chắc test đỏ.

### P3 — Gỡ bản chép trong tài liệu

1. `docs/api-contract.md`: bỏ các bảng chép từ gokit, thay bằng link tới
   `docs/rest-api-standard.md` của gokit và bảng sinh từ JSON. Giữ phần "dùng ở FE".
2. Viết lại đoạn "Chưa có ở gokit, đừng giả định" theo hiện trạng gokit. Việc client có
   tận dụng `Idempotency-Key` / `Retry-After` hay không là quyết định riêng, không làm ở đây.
3. Sửa `cmd/fe-kit/templates/claude/skills/api-contract/SKILL.md` theo cùng hướng, rồi
   `make example`.
4. Đánh dấu `docs/history/notes/gokit-contract.md` là snapshot 2026-09-03, không cập nhật.

Đã làm 2, 3, 4. Mục 1 làm khác kế hoạch: **giữ** các bảng trong `api-contract.md` vì đó là
chỗ người đọc nhanh, thêm một câu nói rõ file sinh ra mới là nguồn và lệch thì file sinh ra
đúng. Bỏ bảng thì người đọc phải mở JSON để biết có những mã lỗi nào.

### P4 — Quy trình

1. gokit: thêm vào checklist MR "đổi file trong `errors/`, `response/`, `domain/pagination.go`
   hoặc header công khai → chạy `make contract`, ghi vào CHANGELOG".
2. fe-kit: mỗi mục CHANGELOG ghi `gokit contract: vX.Y.Z`.
3. Nâng gokit có đổi hợp đồng thì mở việc nâng fe-kit tương ứng.

## 5. Out of scope

- DTO theo từng service. Đó là `api/openapi.yaml` của service (đã có `openapicheck`), không
  phải của gokit. Sinh client từ OpenAPI là bước sau, cần kế hoạch riêng.
- Chính sách retry, cache phía FE.

## 6. Risks

| Rủi ro | Xử lý |
|---|---|
| CI fe-kit không với tới `git.fpt.net` | Vendor JSON; CI chỉ kiểm khớp nội bộ |
| Bản vendor chậm hơn gokit | Chấp nhận; `gokitVersion` trong JSON làm độ chậm nhìn thấy được |
| Generator chỉ đọc được thứ đã export | P1 bước 1; thứ không export được thì để ngoài hợp đồng và ghi rõ |

## 7. Open questions

- ~~**Q1.**~~ **Chốt: theo gokit**, và sửa chỗ gokit sai (4xx không có case → `INVALID_INPUT`)
  ở gokit. Xem D-017.
- (cũ) Với backend không trả `code`, FE nên suy code theo `CodeForHTTPStatus` của gokit
  (4xx lạ → `INTERNAL_ERROR`) hay giữ luật riêng (4xx lạ → `INVALID_INPUT`)? Hàm của gokit
  viết cho phía server; nếu FE cần luật khác thì đó là logic fe-kit và phải ghi lý do.
- ~~**Q2.**~~ **Chốt: `contract/` gốc repo gokit**, cạnh package Go sinh ra nó. `docs/` là văn
  bản cho người đọc; file này là dữ liệu cho máy.
- **Q3.** Có cần scheduled job báo khi gokit có tag mới đổi hợp đồng mà fe-kit chưa nâng?
