# Kit không làm được thứ bạn cần

Trước khi fork hay copy code kit vào dự án, đi qua bốn bước sau theo thứ tự.

## 1. Kiểm tra xem đó có phải điểm nối đã có không

| Bạn cần | Điểm nối |
|---|---|
| Backend trả envelope khác | `dialect` — xem `envelopeDialect` |
| Token lấy từ chỗ khác | `getToken` / `onUnauthorized` |
| Header riêng cho một nhóm lời gọi | `client.withHeaders({...})` |
| Hạn chờ riêng cho một endpoint | `options.timeoutMs` của từng lời gọi |
| Luật thử lại khác | `retry: { attempts, methods, statuses, backoffMs }` |
| Log đi Sentry/OTel | `configureLogger({ sink })` |
| Tên cookie phiên khác | `createSessionCookies({ names })` |
| Cây resource hình khác | `indexFromTree(roots, { idOf, childrenOf })` |
| Tập action code của sản phẩm | `buildAccessProfile(..., { knownActions })`, và `AccessProfile<A>` |
| Màu/thang/mô-tơ khác | `defineTokens(mode, overrides)` |
| Ghi đè một token antd cụ thể | `createAntdTheme(tokens, { overrides })` |

## 2. Nếu không có — hỏi nó thuộc loại tri thức nào

Câu hỏi duy nhất: **thay đổi này đến từ sản phẩm, hay đến từ cách cả nhóm làm frontend?**

- Đến từ sản phẩm → thuộc dự án. Viết ở `shared/` của dự án.
- Đến từ cách làm việc → thuộc kit. Sang bước 3.

Nếu phải sửa `src/` của kit để một sản phẩm chạy được, ranh giới đã rò rỉ — đó là tín
hiệu mạnh nhất kiến trúc này cho bạn.

## 3. Thêm điểm nối, không thêm nhánh `if`

Kit **không bao giờ** rẽ nhánh theo tên sản phẩm hay theo cờ môi trường. Mẫu đúng:

1. khai một **hợp đồng** (interface/kiểu hàm);
2. ship một **mặc định** hợp lý;
3. cho **ghi đè** qua options.

`Dialect`, `LogSink`, `TreeReader`, `SessionCookieNames` đều theo đúng khuôn đó. Thêm cái
mới thì bắt chước khuôn, đừng phát minh khuôn thứ hai.

## 4. Đường lùi hợp lệ: copy có chủ đích

Có thứ chỉ đúng cho một sản phẩm nhưng lại dài. Copy vào `shared/` của dự án là hợp lệ —
miễn là **ghi lý do ngay tại chỗ copy**, để người sau biết nó không phải bản sao bị bỏ
quên. Sang dự án thứ hai cần đúng thứ đó thì mới đưa lên kit.

## Đề xuất vào kit

Mở MR ở repo kit kèm: đoạn code thật ở dự án đang cần, lý do nó là tri thức framework chứ
không phải tri thức sản phẩm, và một dòng trong `docs/decisions.md`. Nếu là quyết định khó
lùi thì thêm một ADR.
