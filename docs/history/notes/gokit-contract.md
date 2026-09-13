# Hợp đồng REST của b2b-gokit — bản trích cho phía FE

Nguồn đã đọc (2026-09-03), đường dẫn tương đối tới `../../../../b2b-gokit/`:
`response/response.go`, `errors/problem.go`, `errors/codes.go`, `domain/pagination.go`,
`domain/repository.go`, `docs/REST_API_STANDARD.md`, `cmd/scaffold/templates/`.

## Success envelope

```jsonc
// đơn                          // collection
{"data": { }}                   {"data": [ ], "page": {"limit": 50, "nextCursor": "eyJ…", "hasMore": true, "total": 120}}
```

- `limit`, `nextCursor`, `total` là optional (`omitempty`); `hasMore` luôn có.
- `total` CHỈ trả khi tính được với chi phí chấp nhận được → FE không được coi là luôn có.
- Collection rỗng = `200` + `"data": []`, KHÔNG BAO GIỜ 404.
- `204` không có body. Cấm `{"data": null}` để "giữ envelope".
- CẤM `success` / `codeStatus` / `message` trong body thành công.

## Error envelope — RFC 9457

`Content-Type: application/problem+json`

```jsonc
{"type":"about:blank","title":"Validation failed","status":422,"code":"VALIDATION_FAILED",
 "traceId":"…","detail":"…","errors":[{"field":"name","code":"REQUIRED","reason":"…"}]}
```

15 mã ổn định (chuỗi UPPER_SNAKE, `errors/codes.go`):

`NOT_FOUND` `UNAUTHORIZED` `FORBIDDEN` `INVALID_INPUT` `VALIDATION_FAILED` `ALREADY_EXISTS`
`CONFLICT` `PRECONDITION_FAILED` `OUT_OF_RANGE` `RATE_LIMITED` `TIMEOUT` `SERVICE_UNAVAILABLE`
`UNIMPLEMENTED` `DATA_LOSS` `INTERNAL_ERROR`

Luật tuyệt đối: **không bao giờ HTTP 200 cho lỗi**. Success và error không bao giờ trộn shape.

## URI, method, query

| Mục | Chuẩn |
|---|---|
| Base | `/api/v{major}/…` — Kong `strip_path=false`, path tới service nguyên vẹn |
| Collection | danh từ số nhiều, kebab-case: `/device-groups` |
| Path param | có nghĩa, suffix `Id`: `{cameraId}` — cấm `{id}` |
| Nesting | tối đa 2 cấp |
| JSON field | `camelCase` |
| Internal | `/internal/v1/…`, không publish qua Kong |
| `limit` | default 20, max 100 (`domain.ClampLimit`) |
| `cursor` | opaque, rỗng = trang đầu |
| `sort` | `-createdAt` = desc, `createdAt`/`+createdAt` = asc (`domain.ParseSort`) |
| filter | qua query param, chỉ field trong whitelist |
| Header | `X-Request-Id` bắt buộc |

Chưa có (đang P2/P3, đừng giả định): `Idempotency-Key`, `ETag`/`If-Match`, `Retry-After`, `Cache-Control`.

## OpenAPI là nguồn chân lý

Mỗi service scaffold ra `api/openapi.yaml` (OpenAPI 3.1, có `operationId`), bắt buộc commit
cùng PR implement. → FE **sinh** wire type + chữ ký method từ đây, không gõ tay.

## Ba tầng type ở gokit (để FE soi gương)

`Request Model` (dính HTTP, tag jsonschema) → `Command/Input` (nghiệp vụ, không tag) →
`Response DTO` (whitelist field, tag `json:"camelCase"`, không lộ entity).

## ⚠ Các service camera-ai-platform ĐANG gọi thì KHÔNG theo chuẩn này

| Service | Envelope thành công | Envelope lỗi |
|---|---|---|
| customer-uac / iam-mgt | `{code_status, message, result, data, errors, data_error, title}` | trong cùng body |
| BRM-V2 | `{code: 1200, data}` | `{code, error, details}`, `code` = `1`+status+2 số (`140308`) |
| iam-v2 `/realms/{r}/status` | luôn HTTP 200, phán quyết ở `data.available` | không có |

Nghĩa là: kit thiết kế cho chuẩn mới, nhưng phải sống chung với 3 phương ngữ cũ một thời gian.
