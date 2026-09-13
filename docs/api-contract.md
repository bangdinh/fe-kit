# Hợp đồng API

Kit nhắm tới chuẩn REST của **b2b-gokit**. Nguồn đã đọc: `response/response.go`,
`errors/problem.go`, `errors/codes.go`, `domain/pagination.go`, `docs/REST_API_STANDARD.md`.

## Thành công

```jsonc
{"data": { … }}
{"data": [ … ], "page": {"limit": 50, "nextCursor": "eyJ…", "hasMore": true, "total": 120}}
```

- `hasMore` luôn có; `limit` / `nextCursor` / `total` là `omitempty`.
- **`total` chỉ trả khi đếm được với chi phí chấp nhận được** → đừng thiết kế UI bắt buộc
  phải có tổng số trang. Kiểu `Page<T>` của kit khai `total?: number` đúng vì lý do đó.
- Collection rỗng = `200` + `"data": []`, không bao giờ 404.
- `204` không có body. Cấm `{"data": null}` để "giữ envelope".
- Cấm `success` / `codeStatus` / `message` trong body thành công.

## Lỗi — RFC 9457, và không bao giờ HTTP 200

`Content-Type: application/problem+json`

```jsonc
{"type":"about:blank","title":"Validation failed","status":422,"code":"VALIDATION_FAILED",
 "traceId":"…","detail":"…","errors":[{"field":"name","code":"REQUIRED","reason":"…"}]}
```

15 mã ổn định: `NOT_FOUND` `UNAUTHORIZED` `FORBIDDEN` `INVALID_INPUT` `VALIDATION_FAILED`
`ALREADY_EXISTS` `CONFLICT` `PRECONDITION_FAILED` `OUT_OF_RANGE` `RATE_LIMITED` `TIMEOUT`
`SERVICE_UNAVAILABLE` `UNIMPLEMENTED` `DATA_LOSS` `INTERNAL_ERROR`.

Kiểu `ErrorCode` của kit khai là `GokitErrorCode | (string & {})` — union cho
autocomplete, `string` cho sự thật lúc chạy. Hạ nó xuống union đóng thì nhánh `default`
không bao giờ chạy, và mã lỗi mới của backend trở thành lỗi im lặng.

## URI, query

| Mục | Chuẩn |
|---|---|
| Base | `/api/v{major}/…` |
| Collection | danh từ số nhiều, kebab-case: `/device-groups` |
| Path param | có nghĩa, suffix `Id`: `{cameraId}` — cấm `{id}` |
| Nesting | tối đa 2 cấp |
| JSON field | `camelCase` |
| `limit` | mặc định 20, trần 100 (BE tự kẹp) |
| `cursor` | đục; rỗng = trang đầu |
| `sort` | `-createdAt` giảm dần, `createdAt`/`+createdAt` tăng dần |
| Header | `X-Request-Id` bắt buộc — kit tự sinh |

Chưa có ở gokit, **đừng giả định**: `Idempotency-Key`, `ETag`/`If-Match`, `Retry-After`,
`Cache-Control`. Đó là lý do kit không tự thử lại lệnh ghi.

## Dùng ở FE

```ts
const page = await api.list<OrderDto>('/orders', {
  query: { limit: 20, cursor, sort: '-createdAt', status: 'open' },
});
// page.items · page.hasMore · page.nextCursor · page.total?

const order = await api.get<OrderDto>(`/orders/${orderId}`);
await api.post('/orders', body);
```

Lỗi:

```ts
import { hasErrorCode, isHttpError, type HttpError } from 'fe-kit/http';

try { await api.post('/orders', body); }
catch (e) {
  if (hasErrorCode(e, 'VALIDATION_FAILED')) return showFields((e as HttpError).fieldErrors);
  if (hasErrorCode(e, 'FORBIDDEN')) return showNoPermission();
  if (isHttpError(e) && e.isTimeout) return showRetry();
  throw e;
}
```

`e.traceId` dán thẳng vào ticket. **Switch theo `code`, không theo `title`/`detail`** —
hai trường đó là văn bản cho người đọc.

Ba trạng thái phân biệt được, và cố ý không gộp:

| | `status` | `code` |
|---|---|---|
| chưa chạm tới backend (DNS, TCP, CORS) | `0` | `SERVICE_UNAVAILABLE` |
| kit tự cắt vì quá hạn chờ | `504` | `TIMEOUT` |
| backend thật sự trả 504 | `504` | theo body |

## Service không theo chuẩn — phương ngữ

Một FE thật luôn phải sống chung với vài service cũ. Ở `camera-ai-platform` đo được **5
phương ngữ** chạy song song. Đừng rải `if (body.code === 1200)` khắp nơi:

```ts
import { createHttpClient, envelopeDialect } from 'fe-kit/http';

const legacy = envelopeDialect({
  name: 'legacy-v1',
  isSuccess: ({ body }) => (body as { code?: number })?.code === 1200,
  data: (body) => (body as { data?: unknown })?.data,
  error: ({ status, body }) => {
    const b = body as { code?: number; error?: string };
    return { type: 'about:blank', title: b?.error ?? 'Lỗi', status, code: String(b?.code ?? status) };
  },
});

export const legacyApi = createHttpClient({ baseUrl: …, dialect: legacy });
```

Phương ngữ là **tri thức sản phẩm** → khai ở dự án, không ở kit. Kit chỉ ship khuôn.

## Bẫy

- **200 kèm HTML**: trang đăng nhập của proxy/SSO. `gokitDialect` coi 200 mà thiếu khoá
  `data` là LỖI, không phải dữ liệu. Đừng bắt rồi bỏ qua.
- **Thử lại**: mặc định chỉ `GET`/`HEAD`, chỉ 502/503, không bao giờ timeout. Đổi qua
  `retry`, tắt bằng `retry: false`.
- **401**: kit gọi `onUnauthorized` đúng một lần. Có thêm một lần "chờ ân hạn" (mặc định
  2s) khi token vừa đúc vẫn bị từ chối — hành vi này đo được ở beta của một service thật;
  tắt bằng `freshTokenGraceMs: 0`.
