---
name: kit-scaffold
description: Dùng khi sửa generator hoặc template của kit — cmd/fe-kit/plan.js, index.js, templates/**, hoặc khi dự án sinh ra bị lỗi. Trigger khi "sửa template", "scaffold", "fe-kit new", "make example", "dự án sinh ra bị lỗi", "thêm file vào app mẫu", "generator".
---

# Generator và template

## Luật số một

**`example/` là thứ SINH RA. Nguồn là `cmd/fe-kit/templates/`.**

Sửa template → `make example` → `make verify`. Đừng bao giờ sửa trực tiếp trong
`example/`; pre-commit hook chặn commit đụng `example/` mà không đụng template.

## Ba phần

| File | Trách nhiệm | Test |
|---|---|---|
| `cmd/fe-kit/plan.js` | THUẦN: chọn file, đổi tên, thay biến | `plan.test.js` |
| `cmd/fe-kit/index.js` | dính đĩa: đọc template, ghi file | `make smoke` |
| `cmd/fe-kit/templates/**` | chính là dự án sinh ra | `make example-check` |

Logic mới thuộc về `plan.js` để test được mà không phải dựng thư mục thật.

## Quy ước tên file

| Template | Sinh ra |
|---|---|
| `x.tmpl` | `x` |
| `gitignore` | `.gitignore` |
| `env.example.tmpl` | `.env.example` |
| `claude/**` | `.claude/**` |
| `apps/<platform>/**` | chỉ khi nền tảng đó được chọn |

Biến: `{{name}}` `{{Name}}` `{{title}}` `{{kitSpec}}` `{{kitVersion}}` `{{platformList}}`
`{{year}}`. Khoá lạ giữ NGUYÊN VĂN — gõ sai thì thấy ngay trong file sinh ra.

## KHÔNG có cú pháp điều kiện trong template

Chọn file theo nền tảng nằm ở `plan.js`. Nhờ vậy template vẫn là file hợp lệ: lint được,
mở ra đọc được. `check-layers.sh` fail nếu thấy `{{#` trong templates.

## Thêm một nền tảng

1. `PLATFORMS` trong `plan.js`
2. `templates/apps/<tên>/**`
3. **Thêm bước build vào `example-check` của Makefile** — không build thì template đó
   hỏng lặng lẽ
4. Bảng trong `docs/platforms.md`

## Dự án sinh ra bị lỗi — truy theo thứ tự

1. `make example && make example-check` — lỗi có tái lập ở example không?
2. Không tái lập → khả năng cao là lỗi CÀI ĐẶT, không phải lỗi template: chạy `make smoke`
   (cài từ tarball) để bắt `files`/`exports`/`bin`.
3. Vẫn không ra → so `node cmd/fe-kit/index.js new x --dry-run` với cây thư mục thật.
