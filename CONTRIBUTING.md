# Đóng góp cho fe-kit

## Trước khi viết dòng đầu tiên

Hỏi: **thứ này là tri thức framework hay tri thức sản phẩm?** Nếu là tri thức sản phẩm,
nó không thuộc repo này — xem [docs/extension-points.md](docs/extension-points.md).

## Nhánh

```
<type>/<mô-tả-ngắn>      feat/http-retry-policy · fix/cookie-offline-token · docs/adr-0006
```

## Commit

```
<type>(<scope>): <tóm tắt thể mệnh lệnh>

feat(http): cho phép khai luật thử lại theo từng client
fix(server): giữ cookie refresh khi IdP trả refresh_expires_in = 0
docs(adr): ghi lý do ship source thay vì dist
```

`scope` thường là subpath: `http` `auth` `access` `server` `ui` `config` `logger`
`scaffold` `docs`. Thân commit nói **vì sao**.

## Cổng trước khi commit

```bash
make verify
```

Bao gồm: `lint` · `typecheck` · `test` · `check-layers` · `verify-example` ·
`example-check` (type-check + build cả ba app mẫu).

Đụng tới `files`/`exports`/`bin` của `package.json` thì chạy thêm:

```bash
make smoke
```

Workspace che mất cả một lớp lỗi — `files` thiếu thư mục, `exports` sai đường dẫn, `bin`
quên `chmod` đều chạy tốt khi symlink và vỡ khi cài thật.

## Luật riêng của repo này

1. **Sửa template, không sửa `example/`.** `example/` sinh ra từ
   `cmd/fe-kit/templates/`; hook chặn commit lệch.
2. **Thêm điểm nối, không thêm nhánh `if`.** Kit không bao giờ rẽ theo tên sản phẩm hay
   cờ môi trường. Khuôn: hợp đồng → mặc định → cho ghi đè.
3. **Mỗi hành vi không hiển nhiên phải có một test đặt tên bằng lý do.** Xem
   `src/http/client.test.ts` — tên test là câu giải thích, không phải mô tả kỹ thuật.
4. **Bình luận nói VÌ SAO.** Cái gì đã nằm trong code. Những chú thích dài trong `src/`
   phần lớn là bẫy đã trả giá ở sản phẩm thật — đừng cắt chúng cho gọn.
5. **Quyết định khó lùi phải có ADR** trong `docs/adr/`, đánh số tiếp.

## Breaking change

Pre-1.0: bump **minor**. Ghi vào `CHANGELOG.md` mục `### Phá vỡ` kèm **cách sửa** cho dự
án tiêu thụ, không chỉ ghi cái gì đã đổi.

## Release

```bash
make release VERSION=v0.2.0 DRY=1
make release VERSION=v0.2.0
```

Script không push. Nó in ra hai lệnh để dev tự chạy.
