---
name: api-contract
description: Dùng khi gọi backend, thêm endpoint, hoặc đọc lỗi API — envelope {data}/{data,page}, phân trang con trỏ, lỗi RFC 9457, và cách khai phương ngữ cho service không theo chuẩn. Trigger khi "gọi API", "thêm endpoint", "lỗi 4xx", "phân trang", "cursor", "envelope", "problem json".
---

# Hợp đồng API

Backend chuẩn ở đây là **b2b-gokit**. Kit đã cài sẵn luật bóc vỏ của nó.

## Thành công

```jsonc
{"data": { … }}                                        // tài nguyên đơn
{"data": [ … ], "page": {"hasMore": true, "nextCursor": "eyJ", "limit": 50, "total": 120}}
```

- `hasMore` LUÔN có. `limit` / `nextCursor` / `total` có thể VẮNG.
- **`total` không phải lúc nào cũng có** — backend chỉ trả khi đếm được với chi
  phí chấp nhận được. Đừng viết UI bắt buộc phải có tổng số trang.
- Collection rỗng = `200` + `"data": []`. Không bao giờ 404.
- `204` không có body.

## Lỗi — RFC 9457, và không bao giờ HTTP 200

```jsonc
{"type":"about:blank","title":"Validation failed","status":422,
 "code":"VALIDATION_FAILED","traceId":"…","errors":[{"field":"name","code":"REQUIRED"}]}
```

15 mã ổn định: `NOT_FOUND` `UNAUTHORIZED` `FORBIDDEN` `INVALID_INPUT`
`VALIDATION_FAILED` `ALREADY_EXISTS` `CONFLICT` `PRECONDITION_FAILED`
`OUT_OF_RANGE` `RATE_LIMITED` `TIMEOUT` `SERVICE_UNAVAILABLE` `UNIMPLEMENTED`
`DATA_LOSS` `INTERNAL_ERROR`.

**Switch theo `code`, không theo `title`/`detail`** — hai trường đó là văn bản
cho người đọc và backend đổi lúc nào cũng được.

```ts
import { hasErrorCode, isHttpError } from 'fe-kit/http';

try { await api.post('/orders', body); }
catch (e) {
  if (hasErrorCode(e, 'VALIDATION_FAILED')) showFieldErrors((e as HttpError).fieldErrors);
  else if (hasErrorCode(e, 'FORBIDDEN')) showNoPermission();
  else if (isHttpError(e) && e.isTimeout) showRetry();
  else throw e;
}
```

`e.traceId` dán thẳng vào ticket — BE tra được đúng request đó.

## Thêm một endpoint

1. Thêm hàm vào `shared/src/api.ts`, kiểu dữ liệu đặt cạnh nó.
2. Danh sách dùng `api.list<T>()` → trả `Page<T>`; tài nguyên đơn dùng `api.get<T>()`.
3. Query qua `options.query`, KHÔNG nối chuỗi tay (`undefined` sẽ thành chữ "undefined").
4. Phân trang: gửi lại `nextCursor` của trang trước qua `query.cursor`.

## Service không theo chuẩn gokit

Đừng rải `if (body.code === 1200)` khắp nơi. Khai một phương ngữ:

```ts
import { createHttpClient, envelopeDialect } from 'fe-kit/http';

const legacy = envelopeDialect({
  name: 'legacy-v1',
  isSuccess: ({ body }) => (body as { code?: number })?.code === 1200,
  error: ({ status, body }) => {
    const b = body as { code?: number; error?: string };
    return { type: 'about:blank', title: b?.error ?? 'Lỗi', status, code: String(b?.code ?? status) };
  },
});

export const legacyApi = createHttpClient({ baseUrl: …, dialect: legacy });
```

## Bẫy đã có người dính

- **Backend trả 200 kèm HTML**: trang đăng nhập của proxy/SSO. Kit nhận ra và
  ném lỗi thay vì trả về "dữ liệu" — đừng bắt lỗi rồi bỏ qua.
- **Thử lại**: kit chỉ tự thử lại `GET`/`HEAD` khi gặp 502/503. KHÔNG thử lại
  lệnh ghi (gokit chưa có `Idempotency-Key`) và KHÔNG thử lại timeout.
- **401**: kit tự xin token mới đúng một lần. Đừng bọc thêm vòng thử lại của
  riêng bạn — hai tầng chồng nhau thì lời gọi hỏng sẽ chạy tới bốn lần.
