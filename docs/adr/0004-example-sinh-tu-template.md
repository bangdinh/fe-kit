# ADR 0004 — `example/` được sinh ra từ template, không viết tay

**Ngày:** 2026-09-13 · **Trạng thái:** chấp nhận

## Bối cảnh

Kit cần một app mẫu để chứng minh nó cắm vào chạy được — `flutter-kit` có `example/`
build trong CI, `qc-kit` có `make smoke`. Kit này cũng có generator + template.

Vấn đề: app mẫu viết tay và template là **hai bản sao của cùng một thứ**. Bản viết tay
được sửa mỗi khi CI đỏ; bản template thì không ai chạy cho tới khi có người dựng dự án
mới — và lúc đó mới biết nó hỏng.

## Quyết định

`example/` được sinh ra bằng chính generator người dùng chạy:

```bash
make example       # rm -rf example && fe-kit new example --platforms web,mobile,desktop
make verify-example  # fail nếu example/ lệch khỏi bản render mới
```

`.githooks/pre-commit` chặn commit đụng `example/` mà không đụng `cmd/fe-kit/templates/`.

## Vì sao

Một nguồn. Template được CI build ba lần mỗi commit (web · mobile · desktop) mà không
phải nuôi thêm code nào.

## Đánh đổi

Không sửa nhanh được `example/` để thử một ý — phải sửa template rồi `make example`.
Đó là đúng thứ muốn ép: mọi thứ đáng có trong app mẫu đều đáng có trong dự án mới.

## Vì sao vẫn cần `make smoke` bên cạnh

`example/` dùng `workspace:*` nên nó KHÔNG kiểm được `files`, `exports`, `bin` — những
thứ chỉ vỡ khi cài thật. `make smoke` đóng tarball, sinh dự án ở thư mục tạm, cài từ
tarball rồi build. Hai thứ bắt hai lớp lỗi khác nhau.
