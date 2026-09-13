# Quyết định

Ghi theo thứ tự thời gian. Mỗi mục: bối cảnh → chốt gì → vì sao.

Đánh số **tiếp** từ hồ sơ giai đoạn 1 ([history/decisions.md](history/decisions.md), kết
thúc ở D-008) để một mã số chỉ trỏ tới đúng một quyết định trong cả hai giai đoạn.

Quyết định **khó lùi** thì ngoài mục ở đây còn có một ADR trong [adr/](adr/).

---

## D-009 · Kit là repo riêng, sibling của qc-kit (2026-09-13)

Theo D-004 của giai đoạn 1 ("khi kit tách repo riêng thì bê nguyên folder"). Vị trí:
`01.webfirst/fe-kit`, cạnh `qc-kit`. Remote dự kiến
`git@git.fpt.net:fli-backend/b2b-v2/fe-kit.git` — **chưa tạo**.

Folder `docs/fe-kit/` của camera đã được sao sang [history/](history/). Bản ở camera nên
được xoá trong một MR riêng của repo đó, không xoá kèm ở đây.

## D-010 · Bốn câu chốt lúc khởi tạo (2026-09-13)

| Câu | Chốt | ADR |
|---|---|---|
| Đóng gói | một package + subpath exports, pin theo tag git | [0001](adr/0001-mot-package-subpath.md) |
| Phạm vi v0.1.0 | web **+ mobile + desktop** ngay từ đầu | [0003](adr/0003-ba-nen-tang-mot-loi.md) |
| Version nền | bản mới nhất của toàn bộ stack | [0005](adr/0005-ghim-ban-moi-nhat.md) |
| Bằng chứng | `example/` trong chính kit, sinh từ template, CI build cả 3 | [0004](adr/0004-example-sinh-tu-template.md) |

Ba nền tảng ngay từ đầu là quyết định đắt hơn web-only, và nó đã trả về ngay trong phiên
đầu: `example/apps/mobile` bắt được hai lỗi mà tsconfig của kit không thấy (dùng kiểu của
`lib: ["DOM"]`, đọc `process` bằng tên). Web-only thì hai lỗi đó nằm im cho tới ngày có
người thật dựng app RN.

## D-011 · Không mang `Result<T,E>`, port/use-case, state layer sang kit (2026-09-13)

Giai đoạn 1 đo được (D-003): `@cap/core` chỉ có **2/13** feature thật sự đi qua use-case,
phần còn lại là passthrough; `@cap/domain` đã bị gỡ vì YAGNI cho FE; React Query **0
dòng** trong `apps/web`.

→ Kit chỉ mang sang **engine phân quyền**, bỏ `ports/` và use-case. Không có `Result`,
không có repository, không có lớp state. Danh sách "cố ý không có" nằm ở
[architecture.md](architecture.md) — thêm mục nào cũng cần một ADR.

## D-012 · `total` của phân trang là optional, và phải giữ nguyên như vậy (2026-09-13)

`domain/pagination.go` của gokit khai `total` là `omitempty` và chỉ trả khi đếm được với
chi phí chấp nhận được.

→ `Page<T>.total?: number`. Cám dỗ là khai `total: number` cho UI đỡ phải xử lý
`undefined`; làm vậy là dựng một lời nói dối trong type, và nó sẽ vỡ ở đúng màn hình nhiều
dữ liệu nhất — chỗ backend quyết định không đếm.

## D-013 · Gỡ zod thay vì nới chính sách supply-chain của pnpm (2026-09-13)

pnpm 12 chặn cài `zod@4.6.4` vì nó publish trước đó 15 giờ, dưới ngưỡng
`minimumReleaseAge`. Kit khai zod ở `devDependencies` + optional peer nhưng **không dùng
một dòng nào**.

→ Gỡ hẳn zod. KHÔNG tắt hay nới chính sách: chính sách đó chặn đúng loại tấn công mà một
kit — thứ nhiều dự án cùng cài — là mục tiêu ngon nhất. Validate là lựa chọn của sản phẩm;
kit khai peer cho nó chỉ là ghim version hộ người khác.

Bài học ghi kèm ở [ADR 0005](adr/0005-ghim-ban-moi-nhat.md): "mới nhất" đôi khi mới hơn cả
cửa an toàn của trình quản lý gói.

## D-014 · Tên hàm đi theo quy ước Next 16 (`proxy`, không phải `middleware`) (2026-09-13)

Next 16 đổi tên quy ước file `middleware.ts` → `proxy.ts`; build in cảnh báo deprecation.

→ Kit đặt tên `createSessionProxy` / `SessionProxyOptions`, template sinh
`apps/web/src/proxy.ts`. Không giữ alias `createSessionMiddleware`: kit đang ở v0.1.0,
chưa có ai phụ thuộc, và hai từ vựng cho một khái niệm là thứ đắt hơn một lần đổi tên.

## D-015 · `example/` được sinh ra, và pre-commit chặn sửa tay (2026-09-13)

Xem [ADR 0004](adr/0004-example-sinh-tu-template.md). Bổ sung: hook chỉ **cảnh báo có cấu
trúc** (chặn commit `example/` khi không đụng template), không chạy build — hook chạy lâu
là hook bị tắt.
