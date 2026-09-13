# Generator và template

## Hai phần

| Phần | File | Trách nhiệm |
|---|---|---|
| Luật (thuần) | `cmd/fe-kit/plan.js` | chọn file nào, đổi tên ra sao, thay biến gì |
| Vỏ (dính đĩa) | `cmd/fe-kit/index.js` | đọc template, ghi file, in hướng dẫn |
| Nội dung | `cmd/fe-kit/templates/**` | chính là dự án sẽ sinh ra |

Tách để test được cái đáng test mà không phải dựng thư mục thật (`cmd/fe-kit/plan.test.js`).

## Luật đặt tên file template

| Trong `templates/` | Sinh ra |
|---|---|
| `package.json.tmpl` | `package.json` |
| `gitignore` | `.gitignore` |
| `env.example.tmpl` | `.env.example` |
| `claude/skills/x/SKILL.md` | `.claude/skills/x/SKILL.md` |
| `apps/mobile/**` | chỉ khi `--platforms` có `mobile` |

Đuôi `.tmpl` chỉ cần khi file có `{{biến}}` hoặc khi tên file cần đổi.

## Biến

`{{name}}` `{{Name}}` (PascalCase) `{{title}}` `{{kitSpec}}` `{{kitVersion}}`
`{{platformList}}` `{{year}}`.

Khoá lạ được giữ **nguyên văn**, không im lặng xoá — gõ sai tên biến thì thấy ngay
`{{tenSai}}` trong file sinh ra, thay vì thấy một khoảng trống.

## Không có cú pháp điều kiện trong template

Chọn file theo nền tảng nằm ở `plan.js`, không nằm trong nội dung file. Nhờ vậy mọi
template vẫn là file hợp lệ: mở ra đọc được, lint được, và sửa được mà không phải giải mã
`{{#if}}`. `check-layers.sh` fail nếu thấy `{{#` trong templates.

## Sửa template

```bash
# 1. sửa ở cmd/fe-kit/templates/
# 2. sinh lại example/ (GHI ĐÈ)
make example
# 3. nghiệm thu
make verify
```

`example/` là thứ sinh ra. `.githooks/pre-commit` chặn commit đụng `example/` mà không
đụng template — xem [ADR 0004](adr/0004-example-sinh-tu-template.md).

## Thêm một nền tảng

1. Thêm tên vào `PLATFORMS` ở `plan.js`.
2. Tạo `templates/apps/<tên>/**`.
3. Thêm vào `PLATFORMS` mặc định của `make example`, và thêm bước build vào
   `example-check` của Makefile — nếu CI không build nó thì template đó sẽ hỏng lặng lẽ.
4. Cập nhật bảng ở [platforms.md](platforms.md).
